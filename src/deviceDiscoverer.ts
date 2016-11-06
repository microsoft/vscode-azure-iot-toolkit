'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { Utility } from './utility';
import { AppInsightsClient } from './appInsightsClient';
import { BaseExplorer } from './baseExplorer';
const types = ['eth', 'usb', 'wifi'];

export class DeviceDiscoverer extends BaseExplorer {
    private _deviceStatus = {};

    constructor(outputChannel: vscode.OutputChannel, appInsightsClient: AppInsightsClient) {
        super(outputChannel, appInsightsClient);
    }

    public discoverDevice(): void {
        let label = 'Discovery';
        vscode.window.showQuickPick(types, { placeHolder: "Enter device type to discover" }).then((type) => {
            if (type !== undefined) {
                this._outputChannel.show();
                this.outputLine(label, `Start discovering ${type} devices..`);
                this.deviceDiscovery(label, type);
            }
        });
    }

    private deviceDiscovery(label: string, type: string): void {
        let process = exec(`devdisco list --${type}`);
        let startTime = new Date();

        process.stdout.on('data', (data) => {
            this._outputChannel.append(data);
        });

        process.stderr.on('data', (data) => {
            this._outputChannel.append(data);
        });

        process.on('close', (code) => {
            let endTime = new Date();
            let elapsedTime = (endTime.getTime() - startTime.getTime()) / 1000;
            this._appInsightsClient.sendEvent(`${label}.${type}`, { Code: code.toString() });
            this.outputLine(label, 'Finished with exit code=' + code + ' in ' + elapsedTime + ' seconds');
        });
    }
}