// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

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
        const label = "Device";
        const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        const registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
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

    public async getDevice(deviceItem: DeviceItem, iotHubConnectionString?: string, outputChannel: vscode.OutputChannel = this._outputChannel) {
        const label = "Device";
        if (!iotHubConnectionString) {
            iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
            if (!iotHubConnectionString) {
                return;
            }
        }

        deviceItem = await Utility.getInputDevice(deviceItem, "AZ.Device.Get.Start", false, iotHubConnectionString);
        if (!deviceItem) {
            return;
        }

        const hostName = Utility.getHostName(iotHubConnectionString);
        const registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
        outputChannel.show();
        this.outputLine(label, `Querying device [${deviceItem.deviceId}]...`, outputChannel);
        return new Promise((resolve, reject) => {
            registry.get(deviceItem.deviceId, this.done("Get", label, resolve, reject, hostName, outputChannel, iotHubConnectionString));
        });
    }

    public async createDevice(edgeDevice: boolean = false, iotHubConnectionString?: string, outputChannel: vscode.OutputChannel = this._outputChannel) {
        if (!iotHubConnectionString) {
            iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
            if (!iotHubConnectionString) {
                return;
            }
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

        outputChannel.show();
        this.outputLine(label, `Creating ${label} '${device.deviceId}'`, outputChannel);
        return new Promise((resolve, reject) => {
            registry.create(device, this.done("Create", label, resolve, reject, hostName, outputChannel, iotHubConnectionString));
        });
    }

    public async deleteDevice(deviceItem?: DeviceItem) {
        const label = "Device";
        const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }
        const registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        deviceItem = await Utility.getInputDevice(deviceItem, "AZ.Device.Delete.Start");
        if (deviceItem && deviceItem.label) {
            const result = await vscode.window.showWarningMessage(`${Constants.DeleteMessage} "${deviceItem.label}"?`, { modal: true }, Constants.DeleteLabel);
            if (result === Constants.DeleteLabel) {
                return this.deleteDeviceById(deviceItem.label, label, registry);
            }
        }
    }

    private async promptForDeviceId(prompt: string): Promise<string> {
        let deviceId: string = await vscode.window.showInputBox({ prompt });
        if (deviceId !== undefined) {
            deviceId = deviceId.trim();
            if (!deviceId) {
                vscode.window.showErrorMessage("Device ID cannot be empty");
            }
        }

        return deviceId;
    }

    private async deleteDeviceById(deviceId: string, label: string, registry: iothub.Registry) {
        this._outputChannel.show();
        this.outputLine(label, `Deleting device '${deviceId}'`);
        return new Promise((resolve, reject) => {
            registry.delete(deviceId, this.done("Delete", label, resolve, reject));
        });
    }

    private done(op: string, label: string, resolve, reject, hostName: string = null, outputChannel: vscode.OutputChannel = this._outputChannel, iotHubConnectionString?: string) {
        return (err, deviceInfo, res) => {
            const eventName = `AZ.${label.replace(/\s/g, ".")}.${op}`;
            if (err) {
                TelemetryClient.sendEvent(eventName, { Result: "Fail" }, iotHubConnectionString);
                this.outputLine(label, `[${op}] error: ${err.toString()}`, outputChannel);
                reject(err);
            }
            if (res) {
                let result = "Fail";
                if (res.statusCode < 300) {
                    result = "Success";
                    if (op === "Create" || op === "Delete") {
                        // Workaround for https://github.com/microsoft/vscode-azure-iot-toolkit/issues/331
                        setTimeout(() => {
                            vscode.commands.executeCommand("azure-iot-toolkit.refresh");
                        }, 500);
                    }
                }
                TelemetryClient.sendEvent(eventName, { Result: result }, iotHubConnectionString);
                this.outputLine(label, `[${op}][${result}] status: ${res.statusCode} ${res.statusMessage}`, outputChannel);
            }
            if (deviceInfo) {
                if (deviceInfo.authentication.SymmetricKey.primaryKey != null) {
                    deviceInfo.connectionString = ConnectionString.createWithSharedAccessKey(hostName,
                        deviceInfo.deviceId, deviceInfo.authentication.SymmetricKey.primaryKey);
                }
                if (deviceInfo.authentication.x509Thumbprint.primaryThumbprint != null) {
                    deviceInfo.connectionString = ConnectionString.createWithX509Certificate(hostName, deviceInfo.deviceId);
                }
                this.outputLine(label, `[${op}] device info: ${JSON.stringify(deviceInfo, null, 2)}`, outputChannel);
                resolve(deviceInfo);
            }
            resolve();
        };
    }
}
