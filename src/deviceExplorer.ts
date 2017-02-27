'use strict';
import * as vscode from 'vscode';
import { Utility } from './utility';
import { AppInsightsClient } from './appInsightsClient';
import { BaseExplorer } from './baseExplorer';
let iothub = require('azure-iothub');

export class DeviceExplorer extends BaseExplorer {
    constructor(outputChannel: vscode.OutputChannel, appInsightsClient: AppInsightsClient) {
        super(outputChannel, appInsightsClient);
    }

    public listDevice(): void {
        let label = 'Device';
        let iotHubConnectionString = Utility.getConfig('iotHubConnectionString', 'IoT Hub Connection String');
        if (!iotHubConnectionString) {
            return;
        }

        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
        this._outputChannel.show();
        this.outputLine(label, 'Querying devices...')
        this._appInsightsClient.sendEvent(`${label}.List`);
        registry.list((err, deviceList) => {
            this.outputLine(label, `${deviceList.length} device(s) found`)
            deviceList.forEach((device, index) => {
                this.outputLine(`${label}#${index+1}`, JSON.stringify(device))
            });
        });
    }

    public createDevice(): void {
        let label = 'Device';
        let iotHubConnectionString = Utility.getConfig('iotHubConnectionString', 'IoT Hub Connection String');
        if (!iotHubConnectionString) {
            return;
        }
        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        vscode.window.showInputBox({ prompt: 'Enter device id to create' }).then((deviceId: string) => {
            if (deviceId !== undefined) {
                var device = {
                    deviceId: deviceId
                };
                this._outputChannel.show();
                this.outputLine(label, `Creating device '${device.deviceId}'`);
                registry.create(device, this.done('Create', label));
            }
        });
    }

    public deleteDevice(): void {
        let label = 'Device';
        let iotHubConnectionString = Utility.getConfig('iotHubConnectionString', 'IoT Hub Connection String');
        if (!iotHubConnectionString) {
            return;
        }
        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        vscode.window.showInputBox({ prompt: 'Enter device id to delete' }).then((deviceId: string) => {
            if (deviceId !== undefined) {
                this._outputChannel.show();
                this.outputLine(label, `Deleting device ${deviceId}`);
                registry.delete(deviceId, this.done('Delete', label));
            }
        });
    }

    private done(op: string, label: string) {
        return (err, deviceInfo, res) => {
            if (err) {
                this._appInsightsClient.sendEvent(`${label}.${op}`, { Result: 'Fail' })
                this.outputLine(label, `[${op}] error: ${err.toString()}`);
            }
            if (res) {
                let result = 'Fail';
                if (res.statusCode < 300) {
                    result = 'Success';
                }
                this._appInsightsClient.sendEvent(`${label}.${op}`, { Result: result })
                this.outputLine(label, `[${op}][${result}] status: ${res.statusCode} ${res.statusMessage}`);
            }
            if (deviceInfo) {
                this.outputLine(label, `[${op}] device info: ${JSON.stringify(deviceInfo)}`);
            }
        };
    }
}