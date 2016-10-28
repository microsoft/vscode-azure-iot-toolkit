'use strict';
import * as vscode from 'vscode';
import { AzureIoTExplorer } from './azureIoTExplorer';

export function activate(context: vscode.ExtensionContext) {
    let azureIoTExplorer = new AzureIoTExplorer();

    let sendD2CMessage = vscode.commands.registerCommand('azure-iot-toolkit.sendD2CMessage', () => {
        azureIoTExplorer.sendD2CMessage();
    });

    let startMonitoringMessage = vscode.commands.registerCommand('azure-iot-toolkit.startMonitoringMessage', () => {
        azureIoTExplorer.startMonitoringMessage();
    });

    let stopMonitoringMessage = vscode.commands.registerCommand('azure-iot-toolkit.stopMonitoringMessage', () => {
        azureIoTExplorer.stopMonitoringMessage();
    });

    context.subscriptions.push(sendD2CMessage);
    context.subscriptions.push(startMonitoringMessage);
    context.subscriptions.push(stopMonitoringMessage);
}

export function deactivate() {
}