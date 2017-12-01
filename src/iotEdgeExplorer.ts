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
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class IoTEdgeExplorer extends BaseExplorer {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public async createDeployment(deviceItem: DeviceItem) {
        deviceItem = await Utility.getInputDevice(deviceItem, Constants.IoTHubAIEdgeDeployStartEvent);

        if (!deviceItem) {
            return;
        }

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

    public async setupEdge(deviceItem: DeviceItem) {
        deviceItem = await Utility.getInputDevice(deviceItem, "Edge.Setup.Start");

        if (!deviceItem) {
            return;
        }

        Executor.runInTerminal(Utility.adjustTerminalCommand(`iotedgectl setup --connection-string "${deviceItem.connectionString}"  --auto-cert-gen-force-no-passwords`));
        TelemetryClient.sendEvent("AZ.Edge.Setup.Done");
    }

    public async setupEdgeFromConfig() {
        TelemetryClient.sendEvent("Edge.SetupFromConfig.Start");
        const filePathUri: vscode.Uri[] = await vscode.window.showOpenDialog({
            openLabel: "Select Edge Setup Configuration File",
            filters: {
                JSON: ["json"],
            },
            defaultUri: vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : undefined,
        });
        if (filePathUri) {
            Executor.runInTerminal(Utility.adjustTerminalCommand(`iotedgectl setup --config-file "${Utility.adjustFilePath(filePathUri[0].fsPath)}"`));
            TelemetryClient.sendEvent("AZ.Edge.SetupFromConfig.Done");
        }
    }

    public startEdge() {
        Executor.runInTerminal(Utility.adjustTerminalCommand("iotedgectl start"));
        TelemetryClient.sendEvent("AZ.Edge.StartRuntime");
    }

    public stopEdge() {
        Executor.runInTerminal(Utility.adjustTerminalCommand("iotedgectl stop"));
        TelemetryClient.sendEvent("AZ.Edge.Stop");
    }

    public restartEdge() {
        Executor.runInTerminal(Utility.adjustTerminalCommand("iotedgectl restart"));
        TelemetryClient.sendEvent("AZ.Edge.Restart");
    }

    public uninstallEdge() {
        Executor.runInTerminal(Utility.adjustTerminalCommand("iotedgectl uninstall"));
        TelemetryClient.sendEvent("AZ.Edge.Uninstall");
    }

    public async generateEdgeSetupConfig(deviceItem?: DeviceItem) {
        deviceItem = await Utility.getInputDevice(deviceItem, "Edge.GenerateSetupConfig.Start");

        if (deviceItem) {
            const containerOS: string = await vscode.window.showQuickPick(["Linux", "Windows"], { placeHolder: "Select container OS", ignoreFocusOut: true });
            if (containerOS) {
                const configContent: string = this.generateEdgeSetupConfigContent(deviceItem.connectionString, containerOS);
                const configPath: vscode.Uri = await vscode.window.showSaveDialog({
                    defaultUri: vscode.workspace.workspaceFolders ? vscode.Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "config.json")) : undefined,
                    saveLabel: "Save Edge Setup Configuration File",
                    filters: {
                        JSON: ["json"],
                    },
                });

                if (configPath) {
                    Utility.writeFile(configPath, configContent);
                    TelemetryClient.sendEvent("Edge.GenerateSetupConfig.Done");
                }
            }
        }
    }

    public async generateEdgeDeploymentConfig() {
        TelemetryClient.sendEvent("Edge.GenerateDeploymentConfig.Start");
        const configContent: string = this.generateEdgeDeploymentConfigContent();
        const configPath: vscode.Uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.workspace.workspaceFolders ? vscode.Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "deployment.json")) : undefined,
            saveLabel: "Save Edge Deployment Configuration File",
            filters: {
                JSON: ["json"],
            },
        });

        if (configPath) {
            Utility.writeFile(configPath, configContent);
            TelemetryClient.sendEvent("Edge.GenerateDeploymentConfig.Done");
        }
    }

    private async getDeploymentJson(): Promise<string> {
        const filePathUri: vscode.Uri[] = await vscode.window.showOpenDialog({
            openLabel: "Select Edge Deployment Configuration File",
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
                if (err && err.response && err.response.data && err.response.data.Message) {
                    this.outputLine(label, err.response.data.Message);
                }
                TelemetryClient.sendEvent(Constants.IoTHubAIEdgeDeployDoneEvent, { Result: "Fail", Message: err });
            });
    }

    private generateEdgeSetupConfigContent(connectionString: string, containerOS: string): string {
        return `{
    "deployment": {
        "docker": {
            "edgeRuntimeImage": "microsoft/azureiotedge-agent:1.0-preview",
            "loggingOptions": {
                "log-driver": "json-file",
                "log-opts": {
                    "max-size": "10m"
                }
            },
            "registries": [],
            "uri": "${containerOS === "Linux" ? "unix:///var/run/docker.sock" : "npipe://./pipe/docker_engine"}"
        },
        "type": "docker"
    },
    "deviceConnectionString": "${connectionString}",
    "homeDir": "${path.join(os.homedir(), "azure_iot_edge").replace(/\\/g, "\\\\")}",
    "hostName": "${fqdn().toLowerCase()}",
    "logLevel": "info",
    "schemaVersion": "1",
    "security": {
        "certificates": {
            "option": "selfSigned",
            "preInstalled": {
                "deviceCACertificateFilePath": "",
                "serverCertificateFilePath": ""
            },
            "selfSigned": {
                "forceNoPasswords": true,
                "forceRegenerate": false
            }
        }
    }
}`;
    }

    private generateEdgeDeploymentConfigContent(): string {
        return `{
    "moduleContent": {
        "$edgeAgent": {
            "properties.desired": {
                "schemaVersion": "1.0",
                "runtime": {
                    "type": "docker",
                    "settings": {
                        "minDockerVersion": "v1.25",
                        "loggingOptions": ""
                    }
                },
                "systemModules": {
                    "edgeAgent": {
                        "type": "docker",
                        "settings": {
                            "image": "microsoft/azureiotedge-agent:1.0-preview",
                            "createOptions": ""
                        }
                    },
                    "edgeHub": {
                        "type": "docker",
                        "status": "running",
                        "restartPolicy": "always",
                        "settings": {
                            "image": "microsoft/azureiotedge-hub:1.0-preview",
                            "createOptions": ""
                        }
                    }
                },
                "modules": {
                    "SampleModule": {
                        "version": "1.0",
                        "type": "docker",
                        "status": "running",
                        "restartPolicy": "always",
                        "settings": {
                            "image": "<registry>/<image>:<tag>",
                            "createOptions": "{}"
                        }
                    }
                }
            }
        },
        "$edgeHub": {
            "properties.desired": {
                "schemaVersion": "1.0",
                "routes": {
                    "route": "FROM /* INTO $upstream"
                },
                "storeAndForwardConfiguration": {
                    "timeToLiveSecs": 7200
                }
            }
        }
    }
}`;
    }
}
