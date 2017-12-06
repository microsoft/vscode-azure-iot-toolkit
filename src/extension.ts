"use strict";
import * as vscode from "vscode";
import { AzureIoTExplorer } from "./azureIoTExplorer";
import { DeviceTree } from "./deviceTree";
import { Executor } from "./executor";

export function activate(context: vscode.ExtensionContext) {
    let azureIoTExplorer = new AzureIoTExplorer(context);
    let deviceTree = new DeviceTree(context);

    vscode.window.registerTreeDataProvider("iotHubDevices", deviceTree);

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.refreshDeviceTree", () => {
        deviceTree.refresh();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.setIoTHubConnectionString", () => {
        deviceTree.setIoTHubConnectionString();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.getDevice", (deviceId) => {
        azureIoTExplorer.getDevice(deviceId);
    }));

    let sendD2CMessage = vscode.commands.registerCommand("azure-iot-toolkit.sendD2CMessage", (DeviceItem) => {
        azureIoTExplorer.sendD2CMessage(DeviceItem);
    });

    let startMonitorIoTHubMessage = vscode.commands.registerCommand("azure-iot-toolkit.startMonitorIoTHubMessage", (DeviceItem) => {
        azureIoTExplorer.startMonitorIoTHubMessage(DeviceItem);
    });

    let stopMonitorIoTHubMessage = vscode.commands.registerCommand("azure-iot-toolkit.stopMonitorIoTHubMessage", () => {
        azureIoTExplorer.stopMonitorIoTHubMessage();
    });

    let sendC2DMessage = vscode.commands.registerCommand("azure-iot-toolkit.sendC2DMessage", (DeviceItem) => {
        azureIoTExplorer.sendC2DMessage(DeviceItem);
    });

    let startMonitorC2DMessage = vscode.commands.registerCommand("azure-iot-toolkit.startMonitorC2DMessage", (DeviceItem) => {
        azureIoTExplorer.startMonitorC2DMessage(DeviceItem);
    });

    let stopMonitorC2DMessage = vscode.commands.registerCommand("azure-iot-toolkit.stopMonitorC2DMessage", () => {
        azureIoTExplorer.stopMonitorC2DMessage();
    });

    let listDevice = vscode.commands.registerCommand("azure-iot-toolkit.listDevice", () => {
        azureIoTExplorer.listDevice();
    });

    let createDevice = vscode.commands.registerCommand("azure-iot-toolkit.createDevice", async () => {
        await azureIoTExplorer.createDevice();
    });

    let deleteDevice = vscode.commands.registerCommand("azure-iot-toolkit.deleteDevice", async (DeviceItem) => {
        await azureIoTExplorer.deleteDevice(DeviceItem);
    });

    let invokeDeviceMethod = vscode.commands.registerCommand("azure-iot-toolkit.invokeDeviceMethod", (DeviceItem) => {
        azureIoTExplorer.invokeDeviceMethod(DeviceItem);
    });

    let getDeviceTwin = vscode.commands.registerCommand("azure-iot-toolkit.getDeviceTwin", (DeviceItem) => {
        azureIoTExplorer.getDeviceTwin(DeviceItem);
    });

    let updateDeviceTwin = vscode.commands.registerCommand("azure-iot-toolkit.updateDeviceTwin", () => {
        azureIoTExplorer.updateDeviceTwin();
    });

    let selectIoTHub = vscode.commands.registerCommand("azure-iot-toolkit.selectIoTHub", () => {
        azureIoTExplorer.selectIoTHub();
    });

    let copyIoTHubConnectionString = vscode.commands.registerCommand("azure-iot-toolkit.copyIoTHubConnectionString", () => {
        azureIoTExplorer.copyIoTHubConnectionString();
    });

    let copyDeviceConnectionString = vscode.commands.registerCommand("azure-iot-toolkit.copyDeviceConnectionString", (DeviceItem) => {
        azureIoTExplorer.copyDeviceConnectionString(DeviceItem);
    });

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.createEdgeDevice", async () => {
        await azureIoTExplorer.createDevice(true);
    }));

    let createDeployment = vscode.commands.registerCommand("azure-iot-toolkit.createDeployment", (DeviceItem) => {
        azureIoTExplorer.createDeployment(DeviceItem);
    });

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.setupEdge", (DeviceItem) => {
        azureIoTExplorer.setupEdge(DeviceItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.setupEdgeFromConfig", () => {
        azureIoTExplorer.setupEdgeFromConfig();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.startEdge", () => {
        azureIoTExplorer.startEdge();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.stopEdge", () => {
        azureIoTExplorer.stopEdge();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.restartEdge", () => {
        azureIoTExplorer.restartEdge();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.uninstallEdge", () => {
        azureIoTExplorer.uninstallEdge();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.generateEdgeSetupConfig", async (DeviceItem) => {
        await azureIoTExplorer.generateEdgeSetupConfig(DeviceItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.generateEdgeDeploymentConfig", async () => {
        await azureIoTExplorer.generateEdgeDeploymentConfig();
    }));

    vscode.workspace.onDidChangeTextDocument((event) => azureIoTExplorer.replaceConnectionString(event));

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        Executor.onDidCloseTerminal(closedTerminal);
    }));

    context.subscriptions.push(sendD2CMessage);
    context.subscriptions.push(startMonitorIoTHubMessage);
    context.subscriptions.push(stopMonitorIoTHubMessage);
    context.subscriptions.push(sendC2DMessage);
    context.subscriptions.push(startMonitorC2DMessage);
    context.subscriptions.push(stopMonitorC2DMessage);
    context.subscriptions.push(listDevice);
    context.subscriptions.push(createDevice);
    context.subscriptions.push(deleteDevice);
    context.subscriptions.push(invokeDeviceMethod);
    context.subscriptions.push(getDeviceTwin);
    context.subscriptions.push(updateDeviceTwin);
    context.subscriptions.push(selectIoTHub);
    context.subscriptions.push(copyIoTHubConnectionString);
    context.subscriptions.push(copyDeviceConnectionString);
    context.subscriptions.push(createDeployment);
}

export function deactivate() {
}
