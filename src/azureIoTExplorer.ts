'use strict';
import * as vscode from 'vscode';
import { MessageExplorer } from './messageExplorer';
import { AppInsightsClient } from './appInsightsClient';

export class AzureIoTExplorer {
    private _messageExplorer: MessageExplorer;
    

    constructor() {
        let outputChannel = vscode.window.createOutputChannel('Azure IoT Toolkit');
        let appInsightsClient = new AppInsightsClient();
        this._messageExplorer = new MessageExplorer(outputChannel, appInsightsClient);
    }

    public sendD2CMessage(): void {
        this._messageExplorer.sendD2CMessage();
    }

    public startMonitoringMessage(): void {
        this._messageExplorer.startMonitoringMessage();
    }

    public stopMonitoringMessage(): void {
        this._messageExplorer.stopMonitoringMessage();
    }
}