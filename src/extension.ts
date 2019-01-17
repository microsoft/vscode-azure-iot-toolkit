// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { AzureIoTExplorer } from "./azureIoTExplorer";
import { Constants, DistributedSettingUpdateType } from "./constants";
import { DeviceTree } from "./deviceTree";
import { Executor } from "./executor";
import { DeviceNode } from "./Nodes/DeviceNode";
import { ModuleItemNode } from "./Nodes/ModuleItemNode";
import { ModuleLabelNode } from "./Nodes/ModuleLabelNode";
import { DeviceTwinCodeLensProvider } from "./providers/deviceTwinCodeLensProvider";
import { ModuleTwinCodeLensProvider } from "./providers/moduleTwinCodeLensProvider";
import { TelemetryClient } from "./telemetryClient";

export function activate(context: vscode.ExtensionContext) {
    TelemetryClient.sendEvent("extensionActivated");

    TelemetryClient.initialize(context);
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

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.getDevice", async (deviceNode: DeviceNode) => {
        return azureIoTExplorer.getDevice(deviceNode ? deviceNode.deviceItem : undefined);
    }));

    let sendD2CMessage = vscode.commands.registerCommand("azure-iot-toolkit.sendD2CMessage", (deviceNode: DeviceNode) => {
        azureIoTExplorer.sendD2CMessage(deviceNode ? deviceNode.deviceItem : undefined);
    });

    let startMonitorIoTHubMessage = vscode.commands.registerCommand("azure-iot-toolkit.startMonitorIoTHubMessage", (deviceNode: DeviceNode) => {
        azureIoTExplorer.startMonitorIoTHubMessage(deviceNode ? deviceNode.deviceItem : undefined);
    });

    let stopMonitorIoTHubMessage = vscode.commands.registerCommand("azure-iot-toolkit.stopMonitorIoTHubMessage", () => {
        azureIoTExplorer.stopMonitorIoTHubMessage();
    });

    let sendC2DMessage = vscode.commands.registerCommand("azure-iot-toolkit.sendC2DMessage", (deviceNode: DeviceNode) => {
        azureIoTExplorer.sendC2DMessage(deviceNode ? deviceNode.deviceItem : undefined);
    });

    let startMonitorC2DMessage = vscode.commands.registerCommand("azure-iot-toolkit.startMonitorC2DMessage", (deviceNode: DeviceNode) => {
        azureIoTExplorer.startMonitorC2DMessage(deviceNode ? deviceNode.deviceItem : undefined);
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

    let deleteDevice = vscode.commands.registerCommand("azure-iot-toolkit.deleteDevice", async (deviceNode: DeviceNode) => {
        await azureIoTExplorer.deleteDevice(deviceNode ? deviceNode.deviceItem : undefined);
    });

    let invokeDeviceMethod = vscode.commands.registerCommand("azure-iot-toolkit.invokeDeviceMethod", (deviceNode: DeviceNode) => {
        azureIoTExplorer.invokeDeviceDirectMethod(deviceNode ? deviceNode.deviceItem : undefined);
    });

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.invokeModuleDirectMethod", (moduleItemNode: ModuleItemNode) => {
        azureIoTExplorer.invokeModuleDirectMethod(moduleItemNode ? moduleItemNode.moduleItem : undefined);
    }));

    let getDeviceTwin = vscode.commands.registerCommand("azure-iot-toolkit.getDeviceTwin", (deviceNode: DeviceNode) => {
        azureIoTExplorer.getDeviceTwin(deviceNode ? deviceNode.deviceItem : undefined);
    });

    let updateDistributedTracingSetting = vscode.commands.registerCommand("azure-iot-toolkit.updateDistributedTracingSetting", (node) => {
        azureIoTExplorer.updateDistributedTracingSetting(node);
    });

    let editDistributedTracingMode = vscode.commands.registerCommand("azure-iot-toolkit.editDistributedTracingMode", (node) => {
        azureIoTExplorer.updateDistributedTracingSetting(node, DistributedSettingUpdateType.OnlyMode);
    });

    let editDistributedTracingSamplingRate = vscode.commands.registerCommand("azure-iot-toolkit.editDistributedTracingSamplingRate", (node) => {
        azureIoTExplorer.updateDistributedTracingSetting(node, DistributedSettingUpdateType.OnlySamplingRate);
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

    let copyIoTHubConnectionString = vscode.commands.registerCommand("azure-iot-toolkit.copyIoTHubConnectionString", async () => {
        await azureIoTExplorer.copyIoTHubConnectionString();
    });

    let copyDeviceConnectionString = vscode.commands.registerCommand("azure-iot-toolkit.copyDeviceConnectionString", (deviceNode: DeviceNode) => {
        azureIoTExplorer.copyDeviceConnectionString(deviceNode ? deviceNode.deviceItem : undefined);
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

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.getModuleTwin", async (moduleItemNode: ModuleItemNode) => {
        await azureIoTExplorer.getModuleTwin(moduleItemNode ? moduleItemNode.moduleItem : undefined);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.updateModuleTwin", async () => {
        await azureIoTExplorer.updateModuleTwin();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.generateSasTokenForIotHub", () => {
        azureIoTExplorer.generateSasTokenForIotHub();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.generateSasTokenForDevice", (deviceNode: DeviceNode) => {
        azureIoTExplorer.generateSasTokenForDevice(deviceNode ? deviceNode.deviceItem : undefined);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.showWelcomePage", () => {
        TelemetryClient.sendEvent(Constants.IoTHubAIShowWelcomePagetEvent, { trigger: "manual" });
        azureIoTExplorer.showWelcomePage();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.generateCode", (deviceNode: DeviceNode) => {
        azureIoTExplorer.generateCode(deviceNode ? deviceNode.deviceItem : undefined);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.createModule", (moduleLabelNode: ModuleLabelNode) => {
        azureIoTExplorer.createModule(moduleLabelNode ? moduleLabelNode.deviceNode : undefined);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.deleteModule", (moduleItemNode: ModuleItemNode) => {
        azureIoTExplorer.deleteModule(moduleItemNode);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.getModule", (moduleItemNode: ModuleItemNode) => {
        azureIoTExplorer.getModule(moduleItemNode ? moduleItemNode.moduleItem : undefined);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.copyModuleConnectionString", async (moduleItemNode: ModuleItemNode) => {
        await azureIoTExplorer.copyModuleConnectionString(moduleItemNode ? moduleItemNode.moduleItem : undefined);
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
    context.subscriptions.push(updateDistributedTracingSetting);
    context.subscriptions.push(editDistributedTracingMode);
    context.subscriptions.push(editDistributedTracingSamplingRate);

    return { azureIoTExplorer };
}

export function deactivate() {
}
