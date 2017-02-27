'use strict';
import * as vscode from 'vscode';
import { AzureIoTExplorer } from './azureIoTExplorer';

export function activate(context: vscode.ExtensionContext) {
    let azureIoTExplorer = new AzureIoTExplorer(context);

    let sendD2CMessage = vscode.commands.registerCommand('azure-iot-toolkit.sendD2CMessage', () => {
        azureIoTExplorer.sendD2CMessage();
    });

    let startMonitorIoTHubMessage = vscode.commands.registerCommand('azure-iot-toolkit.startMonitorIoTHubMessage', () => {
        azureIoTExplorer.startMonitorIoTHubMessage();
    });

    let stopMonitorIoTHubMessage = vscode.commands.registerCommand('azure-iot-toolkit.stopMonitorIoTHubMessage', () => {
        azureIoTExplorer.stopMonitorIoTHubMessage();
    });

    let sendMessageToEventHub = vscode.commands.registerCommand('azure-iot-toolkit.sendMessageToEventHub', () => {
        azureIoTExplorer.sendMessageToEventHub();
    });

    let startMonitorEventHubMessage = vscode.commands.registerCommand('azure-iot-toolkit.startMonitorEventHubMessage', () => {
        azureIoTExplorer.startMonitorEventHubMessage();
    });

    let stopMonitorEventHubMessage = vscode.commands.registerCommand('azure-iot-toolkit.stopMonitorEventHubMessage', () => {
        azureIoTExplorer.stopMonitorEventHubMessage();
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

    let deploy = vscode.commands.registerCommand('azure-iot-toolkit.deploy', () => {
        azureIoTExplorer.deploy();
    });

    let run = vscode.commands.registerCommand('azure-iot-toolkit.run', () => {
        azureIoTExplorer.run();
    });

    context.subscriptions.push(sendD2CMessage);
    context.subscriptions.push(startMonitorIoTHubMessage);
    context.subscriptions.push(stopMonitorIoTHubMessage);
    context.subscriptions.push(sendMessageToEventHub);
    context.subscriptions.push(startMonitorEventHubMessage);
    context.subscriptions.push(stopMonitorEventHubMessage);
    context.subscriptions.push(listDevice);
    context.subscriptions.push(createDevice);
    context.subscriptions.push(deleteDevice);
    context.subscriptions.push(discoverDevice);
    context.subscriptions.push(deploy);
    context.subscriptions.push(run);
}

export function deactivate() {
}