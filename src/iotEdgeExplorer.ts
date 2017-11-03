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
import { DeviceExplorer } from "./deviceExplorer";
import { Executor } from "./executor";
import { IoTHubResourceExplorer } from "./iotHubResourceExplorer";
import { DeviceItem } from "./Model/DeviceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class IoTEdgeExplorer extends BaseExplorer {
    private _deviceExplorer: DeviceExplorer;
    private _iotHubResourceExplorer: IoTHubResourceExplorer;

    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
        this._deviceExplorer = new DeviceExplorer(outputChannel);
        this._iotHubResourceExplorer = new IoTHubResourceExplorer(outputChannel);
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
        const filePathUri: vscode.Uri[] = await vscode.window.showOpenDialog({
            openLabel: "Select Config File",
            filters: {
                JSON: ["json"],
            },
            defaultUri: vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : undefined,
        });
        if (filePathUri) {
            Executor.runInTerminal(Utility.adjustTerminalCommand(`iotedgectl setup --config-file "${Utility.adjustFilePath(filePathUri[0].fsPath)}"`));
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

    public async generateEdgeLaunchConfig(deviceItem?: DeviceItem) {
        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        if (!deviceItem) {
            const deviceList: DeviceItem[] = await this._deviceExplorer.getDeviceList(iotHubConnectionString);
            deviceItem = await vscode.window.showQuickPick(deviceList, { placeHolder: "Select an IoT Hub device" });
        }

        if (deviceItem) {
            const configContent: string = this.generateEdgeLaunchConfigContent(deviceItem.connectionString);
            const configPath: vscode.Uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : undefined,
                saveLabel: "Save Edge launch configuration file",
                filters: {
                    JSON: ["json"],
                },
            });

            if (configPath) {
                Utility.writeFile(configPath, configContent);
            }
        }
    }

    public async generateEdgeConfig() {
        const configContent: string = this.generateEdgeConfigContent();
        const configPath: vscode.Uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : undefined,
            saveLabel: "Save Edge configuration file",
            filters: {
                JSON: ["json"],
            },
        });

        if (configPath) {
            Utility.writeFile(configPath, configContent);
        }
    }

    private async getDeploymentJson(): Promise<string> {
        const filePathUri: vscode.Uri[] = await vscode.window.showOpenDialog({
            openLabel: "Select Deployment File",
            filters: {
                JSON: ["json"],
            },
            defaultUri: vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : undefined,
        });
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

    private generateEdgeLaunchConfigContent(connectionString: string): string {
        return `{
    "schemaVersion": "1",
    "deviceConnectionString": "${connectionString}",
    "homeDir": "${path.join(os.homedir(), ".azure_iot_edge").replace(/\\/g, "\\\\")}",
    "hostName": "${Utility.getHostName(connectionString)}",
    "logLevel": "info",
    "security": {
        "certificates": {
            "option": "selfSigned",
            "selfSigned": {
                "forceRegenerate": false,
                "forceNoPasswords": true
            },
            "preInstalled": {
                "deviceCACertificateFilePath": "",
                "serverCertificateFilePath": ""
            }
        }
    },
    "deployment": {
        "type": "docker",
        "docker": {
            "uri": "unix:///var/run/docker.sock",
            "edgeRuntimeImage": "",
            "registries": [{
                "address": "",
                "username": "",
                "password": ""
            }],
            "loggingOptions": {
                "log-driver": "json-file",
                "log-opts": {
                    "max-size": "10m"
                }
            }
        }
    }
}`;
    }

    private generateEdgeConfigContent(): string {
        return `{
    "moduleContent": {
        "$edgeAgent": {
            "properties.desired": {
                "schemaVersion": "1.0",
                "runtime": { // Information about the edge device runtime, common to all modules
                    "type": "docker", // Enum - values - docker
                    "settings": {
                        "minDockerVersion": "v1.13", // Min docker version required by this edgeAgent (currently ignored)
                        "loggingOptions": "" // Logging options for the Edge modules
                    }
                },
                "systemModules": {
                    "edgeAgent": { // System Module - required
                        "type": "docker", // Enum - values - docker
                        "settings": {
                            "image": "edgepreview.azurecr.io/azureiotedge/edge-agent:1.0.0-preview003", // Location of the edgeAgent image
                            "createOptions": "" // Optional - will be null in general case. This is for future proofing
                        },
                        "configuration": {
                            "id": "1234"
                        }
                    },
                    "edgeHub": { // System Module - required
                        "type": "docker", // Enum - values – docker
                        "status": "running", // Enum - values - running, stopped
                        "restartPolicy": "always", // This value should be "always"
                        "settings": {
                            "image": "edgepreview.azurecr.io/azureiotedge/edge-hub:1.0.0-preview003", // Path to the EdgeHub Image
                            "createOptions": "" // Options string to start the Edge Hub module (templated)
                        },
                        "configuration": {
                            "id": "1234"
                        }
                    }
                },
                "modules": {
                    "tempSensor": {
                        "version": "1.0",
                        "type": "docker",
                        "status": "running",
                        "restartPolicy": "always",
                        "settings": {
                            "image": "edgepreview.azurecr.io/azureiotedge/simulated-temperature-sensor:1.0.0-preview003",
                            "createOptions": ""
                        },
                        "configuration": {
                            "id": "1234"
                        }
                    }
                }
            }
        },
        "$edgeHub": {
            "properties.desired": {
                "schemaVersion": "1.0",
                "routes": { // List of routes for the edge hub
                    // Route for the edge hub. Route name is used as key for the routes. To delete a route, set the routeName = null
                    "route1": "FROM /* INTO $upstream" // Sample value. Route name can be anything
                },
                "storeAndForwardConfiguration": {
                    "timeToLiveSecs": 90000 // Sample value
                }
            }
        }
    }
}`;
    }
}
