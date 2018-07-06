// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import axios from "axios";
import * as iothub from "azure-iothub";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as stripJsonComments from "strip-json-comments";
import * as vscode from "vscode";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { Executor } from "./executor";
import { DeviceItem } from "./Model/DeviceItem";
import { ModuleItem } from "./Model/ModuleItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class IoTEdgeExplorer extends BaseExplorer {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public async createDeployment(input?: DeviceItem | vscode.Uri) {
        TelemetryClient.sendEvent(Constants.IoTHubAIEdgeDeployStartEvent);

        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        let from = "none";
        let deviceItem;
        if (input instanceof DeviceItem) {
            deviceItem = input;
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

    public async setupIotedgehubdev(deviceItem: DeviceItem) {
        deviceItem = await Utility.getInputDevice(deviceItem, "Edge.SetupIotedgehubdev.Start", true);

        if (!deviceItem) {
            return;
        }

        Executor.runInTerminal(Utility.adjustTerminalCommand(`iotedgehubdev setup -c "${deviceItem.connectionString}"`));
        TelemetryClient.sendEvent("AZ.Edge.SetupIotedgehubdev.Done");
    }

    public async getModuleTwin(moduleItem: ModuleItem) {
        if (moduleItem) {
            await this.getModuleTwinById(moduleItem.deviceId, moduleItem.moduleId);
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
            const moduleTwinContent = await Utility.readFromActiveFile(Constants.ModuleTwinJsonFileName);
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
            TelemetryClient.sendEvent(Constants.IoTHubAIUpdateModuleTwinDoneEvent, { Result: "Fail", Message: error });
        }
    }

    private async getModuleTwinById(deviceId: string, moduleId: string) {
        TelemetryClient.sendEvent(Constants.IoTHubAIGetModuleTwinStartEvent);
        const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        try {
            const twin = await Utility.getModuleTwin(iotHubConnectionString, deviceId, moduleId);
            Utility.writeJson(Constants.ModuleTwinJsonFilePath, twin);
            const document = await vscode.workspace.openTextDocument(Constants.ModuleTwinJsonFilePath);
            if (document.isDirty) {
                throw new Error(`Your ${Constants.ModuleTwinJsonFileName} has unsaved changes. Please close or save the file. Then try again.`);
            }
            vscode.window.showTextDocument(document);
            TelemetryClient.sendEvent(Constants.IoTHubAIGetModuleTwinDoneEvent, { Result: "Success" });
        } catch (error) {
            this.outputLine(Constants.IoTHubModuleTwinLabel, `Failed to get Module Twin: ${error}`);
            TelemetryClient.sendEvent(Constants.IoTHubAIGetModuleTwinDoneEvent, { Result: "Fail", Message: error });
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

        if (path.basename(filePath) === "deployment.template.json") {
            vscode.window.showWarningMessage("Please select 'deployment.json' under 'config' folder for deployment.");
            return "";
        }

        const content = stripJsonComments(fs.readFileSync(filePath, "utf8"));
        try {
            JSON.parse(content);
        } catch (error) {
            vscode.window.showErrorMessage("Failed to parse deployment manifest: " + error.toString());
            return "";
        }

        return content;
    }

    private deploy(iotHubConnectionString: string, deviceId: string, deploymentJson: string, from: string) {
        const label = "Edge";
        this._outputChannel.show();
        this.outputLine(label, `Start deployment to device [${deviceId}]`);

        const url = `/devices/${encodeURIComponent(deviceId)}/applyConfigurationContent?api-version=${Constants.IoTHubApiVersion}`;
        const config = Utility.generateIoTHubAxiosRequestConfig(iotHubConnectionString, url, "post", deploymentJson);
        const entry = from === "none" ? "commandPalette" : "contextMenu";

        axios.request(config)
            .then((response) => {
                this.outputLine(label, "Deployment succeeded.");
                TelemetryClient.sendEvent(Constants.IoTHubAIEdgeDeployDoneEvent, { Result: "Success", entry, from });
            })
            .catch((err) => {
                this.outputLine(label, `Deployment failed. ${err}`);
                if (err && err.response && err.response.data && err.response.data.Message) {
                    this.outputLine(label, err.response.data.Message);
                }
                TelemetryClient.sendEvent(Constants.IoTHubAIEdgeDeployDoneEvent, { Result: "Fail", Message: err, entry, from });
            });
    }

    private async deployAtScale(iotHubConnectionString: string, deploymentJson: string) {
        const deploymentJsonObject = JSON.parse(deploymentJson);
        let modulesContent;
        if (deploymentJsonObject.moduleContent) {
            modulesContent = deploymentJsonObject.moduleContent;
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

        const deploymentConfiguration = {
            id: deploymentId,
            content: {
                modulesContent,
            },
            schemaVersion: "1.0",
            targetCondition,
        };

        const label = "Edge";
        this._outputChannel.show();
        this.outputLine(label, `Start deployment with deployment id [${deploymentId}] and target condition [${targetCondition}]`);

        const registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
        registry.addConfiguration(deploymentConfiguration, (err) => {
            if (err) {
                this.outputLine(label, `Deployment failed. ${err}`);
                TelemetryClient.sendEvent(Constants.IoTHubAIEdgeDeployAtScaleDoneEvent, { Result: "Fail", Message: err.message });

            } else {
                this.outputLine(label, "Deployment succeeded.");
                TelemetryClient.sendEvent(Constants.IoTHubAIEdgeDeployAtScaleDoneEvent, { Result: "Success" });
            }
        });
    }
}
