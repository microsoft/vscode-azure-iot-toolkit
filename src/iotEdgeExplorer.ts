"use strict";
import axios from "axios";
import * as iothub from "azure-iothub";
import * as fs from "fs";
import * as stripJsonComments from "strip-json-comments";
import * as vscode from "vscode";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { Executor } from "./executor";
import { DeviceItem } from "./Model/DeviceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class IoTEdgeExplorer extends BaseExplorer {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public async createDeployment(deviceItem: DeviceItem) {
        TelemetryClient.sendEvent(Constants.IoTHubAIEdgeDeployStartEvent);

        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        const deploymentJson = await this.getDeploymentJson();
        if (!deploymentJson) {
            return;
        }
        const sasToken = Utility.generateSasTokenForService(iotHubConnectionString);
        const hostName = Utility.getHostName(iotHubConnectionString);

        this.deploy(hostName, deviceItem.deviceId, sasToken, deploymentJson);
    }

    public async setupEdge() {
        const configFiles: vscode.Uri[] = await vscode.window.showOpenDialog({
            openLabel: "Select Config File",
        });
        if (configFiles) {
            Executor.runInTerminal(Utility.adjustTerminalCommand(`iotedgectl setup --config-file "${Utility.adjustFilePath(configFiles[0].fsPath)}"`));
        }
    }

    public startEdge() {
        Executor.runInTerminal(Utility.adjustTerminalCommand("iotedgectl start"));
    }

    public stopEdge() {
        Executor.runInTerminal(Utility.adjustTerminalCommand("iotedgectl stop"));
    }

    public restartEdge() {
        Executor.runInTerminal(Utility.adjustTerminalCommand("iotedgectl restart"));
    }

    public uninstallEdge() {
        Executor.runInTerminal(Utility.adjustTerminalCommand("iotedgectl uninstall"));
    }

    private async getDeploymentJson(): Promise<string> {
        const options: vscode.OpenDialogOptions = {
            openLabel: "Select Deployment File",
        };
        const filePathUri = await vscode.window.showOpenDialog(options);
        if (!filePathUri) {
            return "";
        }
        const filePath = filePathUri[0].fsPath;
        return fs.readFileSync(filePath, "utf8");
    }

    private deploy(hostName: string, deviceId: string, sasToken: string, deploymentJson: string) {
        const label = "Edge";
        this._outputChannel.show();
        this.outputLine(label, `Start deployment to [${deviceId}]`);

        const config = {
            headers: {
                "Authorization": sasToken,
                "Content-Type": "application/json",
            },
        };
        const url = `https://${hostName}/devices/${deviceId}/applyConfigurationContent?api-version=2017-11-08-preview`;
        axios.post(url, stripJsonComments(deploymentJson), config)
            .then((response) => {
                this.outputLine(label, "Deployment succeeded.");
                TelemetryClient.sendEvent(Constants.IoTHubAIEdgeDeployDoneEvent, { Result: "Success" });
            })
            .catch((err) => {
                this.outputLine(label, `Deployment failed. ${err}`);
                TelemetryClient.sendEvent(Constants.IoTHubAIEdgeDeployDoneEvent, { Result: "Fail", Message: err });
            });
    }
}
