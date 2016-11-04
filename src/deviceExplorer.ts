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
        let iotHubConnectionString = Utility.getConnectionString('iotHubConnectionString', 'IoT Hub Connection String');
        if (!iotHubConnectionString) {
            return;
        }

        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
        this._outputChannel.show();
        this.output(label, 'Querying devices...')
        registry.list((err, deviceList) => {
            this.output(label, `${deviceList.length} device(s) found`)
            if (deviceList.length > 0) {
                this.output(label, '<Device Id>: <Primary Key>')
            }
            deviceList.forEach((device) => {
                var key = device.authentication ? device.authentication.SymmetricKey.primaryKey : '<no primary key>';
                this.output(label, `${device.deviceId}: ${key}`)
            });
        });
    }

    public createDevice(): void {
        let label = 'Device';
        let iotHubConnectionString = Utility.getConnectionString('iotHubConnectionString', 'IoT Hub Connection String');
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
                this.output(label, `Creating device '${device.deviceId}'`);
                registry.create(device, this.done('create', label));
            }
        });
    }

    public deleteDevice(): void {
        let label = 'Device';
        let iotHubConnectionString = Utility.getConnectionString('iotHubConnectionString', 'IoT Hub Connection String');
        if (!iotHubConnectionString) {
            return;
        }
        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        vscode.window.showInputBox({ prompt: 'Enter device id to delete' }).then((deviceId: string) => {
            if (deviceId !== undefined) {
                this._outputChannel.show();
                this.output(label, `Deleting device ${deviceId}`);
                registry.delete(deviceId, this.done('delete', label));
            }
        });
    }

    private done(op: string, label: string) {
        return (err, deviceInfo, res) => {
            if (err) {
                this.output(label, `[${op}] error: ${err.toString()}`);
            }
            if (res) {
                let result = '[fail]';
                if (res.statusCode < 300) {
                    result = '[success]';
                }
                this.output(label, `[${op}]${result} status: ${res.statusCode} ${res.statusMessage}`);
            }
            if (deviceInfo) {
                this.output(label, `[${op}] device info: ${JSON.stringify(deviceInfo)}`);
            }
        };
    }
}