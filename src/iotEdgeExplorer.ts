// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import axios from "axios";
import * as iothub from "azure-iothub";
import * as fqdn from "fqdn-multi";
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
            Utility.writeJson(Constants.ModuleTwinJosnFilePath, twin);
            const document = await vscode.workspace.openTextDocument(Constants.ModuleTwinJosnFilePath);
            if (document.isDirty) {
                throw new Error(`Your ${Constants.ModuleTwinJosnFileName} has unsaved changes. Please close or save the file. Then try again.`);
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
        return fs.readFileSync(filePath, "utf8");
    }

    private deploy(iotHubConnectionString: string, deviceId: string, deploymentJson: string, from: string) {
        const label = "Edge";
        this._outputChannel.show();
        this.outputLine(label, `Start deployment to [${deviceId}]`);

        const url = `/devices/${encodeURIComponent(deviceId)}/applyConfigurationContent?api-version=${Constants.IoTHubApiVersion}`;
        const config = Utility.generateIoTHubAxiosRequestConfig(iotHubConnectionString, url, "post", stripJsonComments(deploymentJson));
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
}
