"use strict";
import { ConnectionString } from "azure-iot-device";
import * as vscode from "vscode";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { DeviceItem } from "./Model/DeviceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";
import iothub = require("azure-iothub");
import * as path from "path";

export class DeviceExplorer extends BaseExplorer {
    constructor(outputChannel: vscode.OutputChannel, private context?: vscode.ExtensionContext) {
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

    public async getDeviceList(iotHubConnectionString: string): Promise<DeviceItem[]> {
        if (!iotHubConnectionString) {
            return null;
        }

        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
        let devices = [];
        let hostName = Utility.getHostName(iotHubConnectionString);

        await registry.list((err, deviceList) => {
            if (err) {
                TelemetryClient.sendEvent(Constants.IoTHubAILoadDeviceTreeEvent, { Result: "Fail", Message: err.message });
                let items = [];
                return null;
            } else {
                TelemetryClient.sendEvent(Constants.IoTHubAILoadDeviceTreeEvent, { Result: "Success", DeviceCount: deviceList.length.toString() });
                deviceList.forEach((device, index) => {
                    let image = device.connectionState.toString() === "Connected" ? "device-on.png" : "device-off.png";
                    let deviceConnectionString = "";
                    if (device.authentication.SymmetricKey.primaryKey != null) {
                        deviceConnectionString = ConnectionString.createWithSharedAccessKey(hostName, device.deviceId,
                            device.authentication.SymmetricKey.primaryKey);
                    } else if (device.authentication.x509Thumbprint.primaryThumbprint != null) {
                        deviceConnectionString = ConnectionString.createWithX509Certificate(hostName, device.deviceId);
                    }
                    devices.push(new DeviceItem(device.deviceId,
                        deviceConnectionString,
                        this.context.asAbsolutePath(path.join("resources", image)),
                        {
                            command: "azure-iot-toolkit.getDevice",
                            title: "",
                            arguments: [device.deviceId],
                        }));

                    return devices;
                });
            }
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
        let label = "Device";
        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        let hostName = Utility.getHostName(iotHubConnectionString);
        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        await vscode.window.showInputBox({ prompt: "Enter device id to create" }).then((deviceId: string) => {
            if (deviceId !== undefined) {
                let device = {
                    deviceId,
                };
                this._outputChannel.show();
                this.outputLine(label, `Creating device '${device.deviceId}'`);
                registry.create(device, this.done("Create", label, hostName));
            }
        });
    }

    public async deleteDevice(deviceItem?: DeviceItem) {
        let label = "Device";
        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }
        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        if (deviceItem.label) {
            await this.deleteDeviceById(deviceItem.label, label, registry);
        } else {
            await vscode.window.showInputBox({ prompt: "Enter device id to delete" }).then((deviceId: string) => {
                if (deviceId !== undefined) {
                    this.deleteDeviceById(deviceId, label, registry);
                }
            });
        }
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
