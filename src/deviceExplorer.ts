"use strict";
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

    public async createDevice(edgeDevice?: boolean) {
        const iotHubConnectionString: string = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        const label: string = edgeDevice ? "Edge Device" : "Device";
        const hostName: string = Utility.getHostName(iotHubConnectionString);
        const registry: iothub.Registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        const deviceId: string = await this.promptForDeviceId(`Enter ${label} ID to create`);
        if (!deviceId) {
            return;
        }

        const device: any = {
            deviceId,
        };
        if (edgeDevice) {
            device.capabilities = {
                iotEdge: true,
            };
        }

        this._outputChannel.show();
        this.outputLine(label, `Creating ${label} '${device.deviceId}'`);
        registry.create(device, this.done("Create", label, hostName));
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
                TelemetryClient.sendEvent(`AZ.${label.replace(/\s/g, "")}.${op}`, { Result: "Fail" });
                this.outputLine(label, `[${op}] error: ${err.toString()}`);
            }
            if (res) {
                let result = "Fail";
                if (res.statusCode < 300) {
                    result = "Success";
                    if (op === "Create" || op === "Delete") {
                        vscode.commands.executeCommand("azure-iot-toolkit.refreshDeviceTree");
                    }
                }
                TelemetryClient.sendEvent(`AZ.${label}.${op}`, { Result: result });
                this.outputLine(label, `[${op}][${result}] status: ${res.statusCode} ${res.statusMessage}`);
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
