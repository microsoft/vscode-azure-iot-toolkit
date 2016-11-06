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

    let listDevice = vscode.commands.registerCommand('azure-iot-toolkit.listDevice', () => {
        azureIoTExplorer.listDevice();
    });

    let createDevice = vscode.commands.registerCommand('azure-iot-toolkit.createDevice', () => {
        azureIoTExplorer.createDevice();
    });

    let deleteDevice = vscode.commands.registerCommand('azure-iot-toolkit.deleteDevice', () => {
        azureIoTExplorer.deleteDevice();
    });

    let discoverDevice = vscode.commands.registerCommand('azure-iot-toolkit.discoverDevice', () => {
        azureIoTExplorer.discoverDevice();
    });

    context.subscriptions.push(sendD2CMessage);
    context.subscriptions.push(startMonitoringMessage);
    context.subscriptions.push(stopMonitoringMessage);
    context.subscriptions.push(listDevice);
    context.subscriptions.push(createDevice);
    context.subscriptions.push(deleteDevice);
    context.subscriptions.push(discoverDevice);
}

export function deactivate() {
}