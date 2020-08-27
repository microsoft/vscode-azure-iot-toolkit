// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import Ajv from "ajv";
import axios from "axios";
import * as iothub from "azure-iothub";
import * as fs from "fs";
import * as path from "path";
import stripJsonComments from "strip-json-comments";
import * as vscode from "vscode";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { ModuleItem } from "./Model/ModuleItem";
import { DeviceNode } from "./Nodes/DeviceNode";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class IoTEdgeExplorer extends BaseExplorer {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public async createDeployment(input?: DeviceNode | vscode.Uri) {
        TelemetryClient.sendEvent(Constants.IoTHubAIEdgeDeployStartEvent);

        const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        let from = "none";
        let deviceItem;
        if (input instanceof DeviceNode) {
            deviceItem = input.deviceItem;
            from = "device";
        }
        deviceItem = await Utility.getInputDevice(deviceItem, null, true);
        if (!deviceItem) {
            return;
        }

        let filePath;
        if (input instanceof vscode.Uri) {
            filePath = input.fsPath;
            from = "file";
        }
        const deploymentJson = await this.getDeploymentJson(filePath);
        if (!deploymentJson) {
            return;
        }

        this.deploy(iotHubConnectionString, deviceItem.deviceId, deploymentJson, from);
    }

    public async createDeploymentAtScale(fileUri?: vscode.Uri) {
        TelemetryClient.sendEvent(Constants.IoTHubAIEdgeDeployAtScaleStartEvent);

        const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        const filePath = fileUri ? fileUri.fsPath : undefined;
        const deploymentJson = await this.getDeploymentJson(filePath);
        if (!deploymentJson) {
            return;
        }

        this.deployAtScale(iotHubConnectionString, deploymentJson);
    }

    public async getModuleTwin(moduleItem: ModuleItem) {
        if (moduleItem) {
            await this.getModuleTwinById(moduleItem.deviceId, moduleItem.moduleId, moduleItem.contextValue);
        }
    }

    public async updateModuleTwin() {
        TelemetryClient.sendEvent(Constants.IoTHubAIUpdateModuleTwinStartEvent);
        const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        try {
            this._outputChannel.show();
            const moduleTwinContent = await Utility.readFromActiveFile(Constants.ModuleTwinJosnFileName);
            if (!moduleTwinContent) {
                return;
            }
            const moduleTwinJson = JSON.parse(moduleTwinContent);
            if (moduleTwinJson.moduleId.startsWith("$")) {
                throw new Error("Azure IoT Edge system modules are readonly and cannot be modified. Changes can be submitted via deploying a configuration.");
            }
            this.outputLine(Constants.IoTHubModuleTwinLabel, `Update Module Twin for [${moduleTwinJson.deviceId}][${moduleTwinJson.moduleId}]...`);
            await Utility.updateModuleTwin(iotHubConnectionString, moduleTwinJson.deviceId, moduleTwinJson.moduleId, moduleTwinContent);
            this.outputLine(Constants.IoTHubModuleTwinLabel, `Module Twin updated successfully`);
            TelemetryClient.sendEvent(Constants.IoTHubAIUpdateModuleTwinDoneEvent, { Result: "Success" });
            await this.getModuleTwinById(moduleTwinJson.deviceId, moduleTwinJson.moduleId);
        } catch (error) {
            this.outputLine(Constants.IoTHubModuleTwinLabel, `Failed to update Module Twin: ${error}`);
            TelemetryClient.sendEvent(Constants.IoTHubAIUpdateModuleTwinDoneEvent, { Result: "Fail", [Constants.errorProperties.Message]: error });
        }
    }

    private async isValidDeploymentJsonSchema(json: object): Promise<boolean> {
        const schema = (await axios.get(Constants.DeploymentJsonSchemaUrl)).data;
        const ajv = new Ajv({ allErrors: true, schemaId: "id" });
        ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-04.json"));
        const valid = ajv.validate(schema, json);
        if (!valid) {
            vscode.window.showErrorMessage(`There are errors in deployment json file: ${ajv.errorsText(null, { separator: ", " })}`);
            return false;
        }

        return true;
    }

    private isValidCreateOptions(desiredProperties: any): boolean {
        return this.isValidCreateOptionsHepler(desiredProperties.systemModules) && this.isValidCreateOptionsHepler(desiredProperties.modules);
    }

    private isValidCreateOptionsHepler(modules: any): boolean {
        for (const moduleName in modules) {
            if (modules.hasOwnProperty(moduleName)) {
                try {
                    let createOptions = modules[moduleName].settings.createOptions;

                    for (let i = 1; i < Constants.CREATE_OPTIONS_MAX_CHUNKS; i++) {
                        const extendedCreateOptions = modules[moduleName].settings[`createOptions0${i}`];
                        if (!extendedCreateOptions) {
                            break;
                        }
                        createOptions += extendedCreateOptions;
                    }

                    if (createOptions) {
                        this.checkJsonString(createOptions);
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`CreateOptions of "${moduleName}" is not a valid JSON string: ${error.message}`);
                    return false;
                }
            }
        }
        return true;
    }

    private checkJsonString(json: string) {
        if (json) {
            if (json.trim().charAt(0) !== "{") {
                throw new Error("not a valid JSON string");
            }
            JSON.parse(json);
        }
    }

    private async getModuleTwinById(deviceId: string, moduleId: string, moduleType: string = "unknown") {
        TelemetryClient.sendEvent(Constants.IoTHubAIGetModuleTwinStartEvent, { moduleType });
        const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        try {
            const twin = await Utility.getModuleTwin(iotHubConnectionString, deviceId, moduleId);
            Utility.writeJson(Constants.ModuleTwinJosnFilePath, twin);
            const document = await vscode.workspace.openTextDocument(Constants.ModuleTwinJosnFilePath);
            if (document.isDirty) {
                throw new Error(`Your ${Constants.ModuleTwinJosnFileName} has unsaved changes. Please close or save the file. Then try again.`);
            }
            vscode.window.showTextDocument(document);
            TelemetryClient.sendEvent(Constants.IoTHubAIGetModuleTwinDoneEvent, { Result: "Success" });
        } catch (error) {
            this._outputChannel.show();
            this.outputLine(Constants.IoTHubModuleTwinLabel, `Failed to get Module Twin: ${error}`);
            TelemetryClient.sendEvent(Constants.IoTHubAIGetModuleTwinDoneEvent, { Result: "Fail", [Constants.errorProperties.Message]: error });
        }
    }

    private async getDeploymentJson(filePath: string): Promise<string> {
        if (!filePath) {
            const filePathUri: vscode.Uri[] = await vscode.window.showOpenDialog({
                openLabel: "Select Edge Deployment Manifest",
                filters: {
                    JSON: ["json"],
                },
                defaultUri: Utility.getDefaultPath(),
            });
            if (!filePathUri) {
                return "";
            }
            filePath = filePathUri[0].fsPath;
        }

        if (path.basename(filePath).endsWith(".template.json")) {
            vscode.window.showWarningMessage("Please select deployment manifest file under 'config' folder for deployment.");
            return "";
        }

        let content = stripJsonComments(fs.readFileSync(filePath, "utf8"));
        try {
            const contentJson = JSON.parse(content);
            // Backward compatibility for old schema using 'moduleContent'
            if (!contentJson.modulesContent && contentJson.moduleContent) {
                contentJson.modulesContent = contentJson.moduleContent;
                delete contentJson.moduleContent;
            }

            try {
                const isValid = await this.isValidDeploymentJsonSchema(contentJson)
                    && this.isValidCreateOptions(contentJson.modulesContent.$edgeAgent["properties.desired"]);

                if (!isValid) {
                    return "";
                }
            } catch (error) {
                TelemetryClient.sendEvent(Constants.IoTHubAIValidateJsonSchemaEvent, { [Constants.errorProperties.Message]: error.message });
            }

            content = JSON.stringify(contentJson, null, 2);
        } catch (error) {
            vscode.window.showErrorMessage("Failed to parse deployment manifest: " + error.toString());
            return "";
        }

        return content;
    }

    private async deploy(iotHubConnectionString: string, deviceId: string, deploymentJson: string, from: string) {
        const label = Constants.IoTHubEdgeLabel;
        this._outputChannel.show();
        this.outputLine(label, `Start deployment to device [${deviceId}]`);
        const entry = from === "none" ? "commandPalette" : "contextMenu";

        try {
            const registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
            const deploymentJsonObject = JSON.parse(deploymentJson);
            await registry.applyConfigurationContentOnDevice(deviceId, deploymentJsonObject);
            this.outputLine(label, "Deployment succeeded.");
            TelemetryClient.sendEvent(Constants.IoTHubAIEdgeDeployDoneEvent, { Result: "Success", entry, from });
        } catch (err) {
            this.outputLine(label, `Deployment failed. ${err}`);
            let detailedMessage = "";
            if (err && err.responseBody) {
                detailedMessage = err.responseBody;
                this.outputLine(label, err.responseBody);
            }
            TelemetryClient.sendEvent(Constants.IoTHubAIEdgeDeployDoneEvent,
                { Result: "Fail", [Constants.errorProperties.Message]: err, [Constants.errorProperties.detailedMessage]: detailedMessage, entry, from });
        }
    }

    private async deployAtScale(iotHubConnectionString: string, deploymentJson: string) {
        const deploymentJsonObject = JSON.parse(deploymentJson);
        let modulesContent;
        if (deploymentJsonObject.modulesContent) {
            modulesContent = deploymentJsonObject.modulesContent;
        } else if (deploymentJsonObject.content && deploymentJsonObject.content.modulesContent) {
            modulesContent = deploymentJsonObject.content.modulesContent;
        }
        if (!modulesContent) {
            vscode.window.showWarningMessage("Deployment manifest is invalid.");
            return;
        }

        const deploymentId = await vscode.window.showInputBox({
            prompt: "Deployment id",
            placeHolder: "The name of the deployment",
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value) {
                    return "The value should not be empty.";
                }
                if (value.length > 128) {
                    return "Up to 128 characters are allowed.";
                }
                if (!/^[a-z0-9-:+%_#*?!(),=@;']+$/.test(value)) {
                    return "Lowercase letters, numbers and the following characters are allowed [ -:+%_#*?!(),=@;' ].";
                }
                return undefined;
            },
        });
        if (!deploymentId) {
            return;
        }

        const targetCondition = await vscode.window.showInputBox({
            prompt: "A target condition to determine which devices will be targeted with this deployment",
            placeHolder: "e.g. tags.environment='test', properties.reported.devicemodel='4000x', or deviceId='{id}'",
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value) {
                    return "The value should not be empty.";
                }
                if (!Utility.isValidTargetCondition(value)) {
                    return "Valid conditions specify a either a deviceId (e.g. deviceId='{id}'), \
                    one or more device twin tag criteria (e.g. tags.environment = 'prod' AND tags.location = 'westus'), \
                    or reported property criteria (e.g. properties.reported.lastStatus='200').";
                }
                return undefined;
            },
        });
        if (!targetCondition) {
            return;
        }

        const priority = await vscode.window.showInputBox({
            prompt: "Deployment priority (Higher values indicate higher priority)",
            value: "10",
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value) {
                    return "The value should not be empty.";
                }
                const floatValue = parseFloat(value);
                if (!Number.isInteger(floatValue) || floatValue < 0) {
                    return "Deployment priority should be a positive integer";
                }
                return undefined;
            },
        });
        if (!priority) {
            return;
        }

        const deploymentConfiguration = {
            id: deploymentId,
            content: {
                modulesContent,
            },
            schemaVersion: "1.0",
            targetCondition,
            priority: parseInt(priority, 10),
        };

        const label = Constants.IoTHubEdgeLabel;
        this._outputChannel.show();
        this.outputLine(label, `Start deployment with deployment id [${deploymentId}] and target condition [${targetCondition}]`);

        const registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
        registry.addConfiguration(deploymentConfiguration, (err) => {
            if (err) {
                this.outputLine(label, `Deployment with deployment id [${deploymentId}] failed. ${err}`);
                TelemetryClient.sendEvent(Constants.IoTHubAIEdgeDeployAtScaleDoneEvent, { Result: "Fail", [Constants.errorProperties.Message]: err.message });

            } else {
                this.outputLine(label, `Deployment with deployment id [${deploymentId}] succeeded.`);
                TelemetryClient.sendEvent(Constants.IoTHubAIEdgeDeployAtScaleDoneEvent, { Result: "Success" });
            }
        });
    }
}
