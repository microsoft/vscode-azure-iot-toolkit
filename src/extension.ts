// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { AzureIoTExplorer } from "./azureIoTExplorer";
import { Constants } from "./constants";
import { DeviceTree } from "./deviceTree";
import { Executor } from "./executor";
import { DeviceTwinCodeLensProvider } from "./providers/deviceTwinCodeLensProvider";
import { ModuleTwinCodeLensProvider } from "./providers/moduleTwinCodeLensProvider";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export function activate(context: vscode.ExtensionContext) {
    TelemetryClient.sendEvent("extensionActivated");

    Constants.initialize(context);
    let azureIoTExplorer = new AzureIoTExplorer(context);
    let deviceTree = new DeviceTree(context);

    vscode.window.registerTreeDataProvider("iotHubDevices", deviceTree);
    azureIoTExplorer.checkAndShowWelcomePage();

    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ pattern: `**/${Constants.ModuleTwinJosnFileName}` }, new ModuleTwinCodeLensProvider()));
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ pattern: `**/${Constants.DeviceTwinJosnFileName}` }, new DeviceTwinCodeLensProvider()));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.refresh", (element) => {
        deviceTree.refresh(element);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.setIoTHubConnectionString", () => {
        deviceTree.setIoTHubConnectionString();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.getDevice", async (DeviceItem) => {
        return azureIoTExplorer.getDevice(DeviceItem);
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
        return azureIoTExplorer.createDevice();
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

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.createIoTHub", () => {
        azureIoTExplorer.createIoTHub();
    }));

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

    let createDeployment = vscode.commands.registerCommand("azure-iot-toolkit.createDeployment", (input) => {
        azureIoTExplorer.createDeployment(input);
    });

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.createDeploymentAtScale", (fileUri) => {
        azureIoTExplorer.createDeploymentAtScale(fileUri);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.getModuleTwin", async (moduleItem) => {
        await azureIoTExplorer.getModuleTwin(moduleItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.updateModuleTwin", async () => {
        await azureIoTExplorer.updateModuleTwin();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.generateSasTokenForIotHub", () => {
        azureIoTExplorer.generateSasTokenForIotHub();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.generateSasTokenForDevice", (DeviceItem) => {
        azureIoTExplorer.generateSasTokenForDevice(DeviceItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.showWelcomePage", () => {
        TelemetryClient.sendEvent("General.ShowWelcomePage");
        azureIoTExplorer.showWelcomePage();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.callFromHtml", (command: string) => {
        TelemetryClient.sendEvent("General.CallFromHtml", { command });
        vscode.commands.executeCommand(command);
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

    return { azureIoTExplorer };
}

export function deactivate() {
}
