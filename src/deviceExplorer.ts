"use strict";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { BaseExplorer } from "./baseExplorer";
import { DeviceItem } from "./Model/DeviceItem";
import { Utility } from "./utility";
import iothub = require("azure-iothub");

export class DeviceExplorer extends BaseExplorer {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public listDevice(): void {
        let label = "Device";
        let iotHubConnectionString = Utility.getConfig("iotHubConnectionString", "IoT Hub Connection String");
        if (!iotHubConnectionString) {
            return;
        }

        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
        this._outputChannel.show();
        this.outputLine(label, "Querying devices...");
        AppInsightsClient.sendEvent(`${label}.List`);
        registry.list((err, deviceList) => {
            this.outputLine(label, `${deviceList.length} device(s) found`);
            deviceList.forEach((device, index) => {
                this.outputLine(`${label}#${index + 1}`, JSON.stringify(device, null, 2));
            });
        });
    }

    public async createDevice() {
        let label = "Device";
        let iotHubConnectionString = Utility.getConfig("iotHubConnectionString", "IoT Hub Connection String");
        if (!iotHubConnectionString) {
            return;
        }
        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        await vscode.window.showInputBox({ prompt: "Enter device id to create" }).then((deviceId: string) => {
            if (deviceId !== undefined) {
                let device = {
                    deviceId,
                };
                this._outputChannel.show();
                this.outputLine(label, `Creating device '${device.deviceId}'`);
                registry.create(device, this.done("Create", label));
            }
        });
    }

    public async deleteDevice(deviceItem?: DeviceItem) {
        let label = "Device";
        let iotHubConnectionString = Utility.getConfig("iotHubConnectionString", "IoT Hub Connection String");
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
        this.outputLine(label, `Deleting device ${deviceId}`);
        registry.delete(deviceId, this.done("Delete", label));
    }

    private done(op: string, label: string) {
        return (err, deviceInfo, res) => {
            if (err) {
                AppInsightsClient.sendEvent(`${label}.${op}`, { Result: "Fail" });
                this.outputLine(label, `[${op}] error: ${err.toString()}`);
            }
            if (res) {
                let result = "Fail";
                if (res.statusCode < 300) {
                    result = "Success";
                }
                AppInsightsClient.sendEvent(`${label}.${op}`, { Result: result });
                this.outputLine(label, `[${op}][${result}] status: ${res.statusCode} ${res.statusMessage}`);
            }
            if (deviceInfo) {
                this.outputLine(label, `[${op}] device info: ${JSON.stringify(deviceInfo, null, 2)}`);
            }
        };
    }
}
