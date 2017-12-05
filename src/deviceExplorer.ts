"use strict";
import axios, { AxiosRequestConfig } from "axios";
import { ConnectionString } from "azure-iot-device";
import * as vscode from "vscode";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { DeviceItem } from "./Model/DeviceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";
import iothub = require("azure-iothub");

export class DeviceExplorer extends BaseExplorer {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public async listDevice() {
        let label = "Device";
        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
        this._outputChannel.show();
        this.outputLine(label, "Querying devices...");
        TelemetryClient.sendEvent(`AZ.${label}.List`);
        registry.list((err, deviceList) => {
            this.outputLine(label, `${deviceList.length} device(s) found`);
            deviceList.forEach((device, index) => {
                this.outputLine(`${label}#${index + 1}`, JSON.stringify(device, null, 2));
            });
        });
    }

    public async getDevice(deviceId: string) {
        let label = "Device";
        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        let hostName = Utility.getHostName(iotHubConnectionString);
        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
        this._outputChannel.show();
        this.outputLine(label, `Querying device [${deviceId}]...`);
        registry.get(deviceId, this.done("Get", label, hostName));
    }

    public async createDevice() {
        const iotHubConnectionString: string = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        const label: string = "Device";
        const hostName: string = Utility.getHostName(iotHubConnectionString);
        const registry: iothub.Registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        const deviceId: string = await this.promptForDeviceId("Enter device ID to create");
        if (!deviceId) {
            return;
        }

        const device = {
            deviceId,
        };
        this._outputChannel.show();
        this.outputLine(label, `Creating device '${device.deviceId}'`);
        registry.create(device, this.done("Create", label, hostName));
    }

    public async createEdgeDevice() {
        const iotHubConnectionString: string = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        const deviceId: string = await this.promptForDeviceId("Enter Edge device ID to create");
        if (!deviceId) {
            return;
        }

        const label: string = "EdgeDevice";
        const sasToken: string = Utility.generateSasTokenForService(iotHubConnectionString);
        const hostName: string = Utility.getHostName(iotHubConnectionString);
        const config: AxiosRequestConfig = {
            headers: {
                "Authorization": sasToken,
                "Content-Type": "application/json; charset=utf-8",
            },
        };
        const data = {
            deviceId,
            authentication: {
                type: "sas",
                symmetricKey: {
                    primaryKey: "",
                    secondaryKey: "",
                },
            },
            capabilities: {
                iotEdge: true,
            },
        };

        this._outputChannel.show();
        this.outputLine(label, `Creating Edge device '${deviceId}'`);

        const url = `https://${hostName}/devices/${deviceId}?api-version=${Constants.IoTHubApiVersion}`;
        const handler: (error: any, deviceInfo: any, res: any) => void = this.done("Create", label, hostName);
        axios.put(url, data, config)
            .then((response) => {
                let deviceInfo = response.data;
                // device info returned by REST API uses "symmetricKey" instead of "SymmetricKey" returned by Node SDK
                if (deviceInfo.authentication.symmetricKey) {
                    deviceInfo.authentication.SymmetricKey = deviceInfo.authentication.symmetricKey;
                }
                handler(null, deviceInfo, response);
            })
            .catch((err) => {
                handler(err.response.data.Message, null, err.response);
            });

    }

    public async deleteDevice(deviceItem?: DeviceItem) {
        let label = "Device";
        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }
        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        deviceItem = await Utility.getInputDevice(deviceItem, "AZ.Device.Delete.Start");
        if (deviceItem && deviceItem.label) {
            await this.deleteDeviceById(deviceItem.label, label, registry);
        }
    }

    private async promptForDeviceId(prompt: string): Promise<string> {
        let deviceId: string = await vscode.window.showInputBox({ prompt });
        if (deviceId !== undefined) {
            deviceId = deviceId.trim();
            if (deviceId) {
                return deviceId;
            } else {
                vscode.window.showErrorMessage("Device ID cannot be empty");
            }
        }

        return deviceId;
    }

    private deleteDeviceById(deviceId: string, label: string, registry: iothub.Registry): void {
        this._outputChannel.show();
        this.outputLine(label, `Deleting device '${deviceId}'`);
        registry.delete(deviceId, this.done("Delete", label));
    }

    private done(op: string, label: string, hostName: string = null) {
        return (err, deviceInfo, res) => {
            if (err) {
                TelemetryClient.sendEvent(`AZ.${label}.${op}`, { Result: "Fail" });
                this.outputLine(label, `[${op}] error: ${err.toString()}`);
            }
            if (res) {
                let result = "Fail";
                const statusCode = res.statusCode || res.status;
                const statusMessage = res.statusMessage || res.statusText;
                if (statusCode < 300) {
                    result = "Success";
                    if (op === "Create" || op === "Delete") {
                        vscode.commands.executeCommand("azure-iot-toolkit.refreshDeviceTree");
                    }
                }
                TelemetryClient.sendEvent(`AZ.${label}.${op}`, { Result: result });
                this.outputLine(label, `[${op}][${result}] status: ${statusCode} ${statusMessage}`);
            }
            if (deviceInfo) {
                if (deviceInfo.authentication.SymmetricKey.primaryKey != null) {
                    deviceInfo.connectionStringWithSharedAccessKey = ConnectionString.createWithSharedAccessKey(hostName,
                        deviceInfo.deviceId, deviceInfo.authentication.SymmetricKey.primaryKey);
                }
                if (deviceInfo.authentication.x509Thumbprint.primaryThumbprint != null) {
                    deviceInfo.connectionStringWithX509Certificate = ConnectionString.createWithX509Certificate(hostName, deviceInfo.deviceId);
                }
                this.outputLine(label, `[${op}] device info: ${JSON.stringify(deviceInfo, null, 2)}`);
            }
        };
    }
}
