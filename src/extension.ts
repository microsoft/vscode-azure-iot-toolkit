// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import {
    AzExtTreeDataProvider, AzExtTreeItem, createAzExtOutputChannel,
    IActionContext, registerCommand, registerUIExtensionVariables,
} from "@microsoft/vscode-azext-utils";
import { AzureDpsExplorer } from "./azureDpsExplorer";
import { AzureIoTExplorer } from "./azureIoTExplorer";
import { Constants, DistributedSettingUpdateType } from "./constants";
import { CredentialStore } from "./credentialStore";
import { DeviceTree } from "./deviceTree";
import { Executor } from "./executor";
import { DeviceNode } from "./Nodes/DeviceNode";
import { DpsAccountTreeItem } from "./Nodes/DPS/DpsAccountTreeItem";
import { DpsResourceTreeItem } from "./Nodes/DPS/DpsResourceTreeItem";
import { EventHubItemNode } from "./Nodes/Endpoints/EventHubItemNode";
import { EventStreamItemNode } from "./Nodes/Endpoints/EventStreamItemNode";
import { INode } from "./Nodes/INode";
import { IoTHubAccountTreeItem } from "./Nodes/IoTHub/IoTHubAccountTreeItem";
import { IoTHubResourceTreeItem } from "./Nodes/IoTHub/IoTHubResourceTreeItem";
import { ModuleItemNode } from "./Nodes/ModuleItemNode";
import { ModuleLabelNode } from "./Nodes/ModuleLabelNode";
import { DeviceTwinCodeLensProvider } from "./providers/deviceTwinCodeLensProvider";
import { ModuleTwinCodeLensProvider } from "./providers/moduleTwinCodeLensProvider";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";
import {
    createFabricEventStreamEndpoint,
    ICreatedFabricEventStreamEndpoint,
    updateFabricEventStreamEndpoint,
} from "./messageEndpoint/fabricEventStreamCommands";
import { createMessageRoute, deleteMessageRoute, offerRouteForEndpoint, updateMessageRoute } from "./messageRoute/messageRouteCommands";
import { RouteItemNode } from "./Nodes/Routes/RouteItemNode";

const AZ_EXT_REFRESH_COMMANDS = [
    "azure-iot-hub.refresh",
    "azure-iot-dps.refresh",
];

async function refreshAllTreeViews(): Promise<void> {
    await vscode.commands.executeCommand("azure-iot-toolkit.refresh");
    for (const command of AZ_EXT_REFRESH_COMMANDS) {
        try {
            await vscode.commands.executeCommand(command);
        } catch (error) {
            TelemetryClient.sendEvent(Constants.IoTHubAIRefreshTreeAfterSignInFailedEvent, {
                Command: command,
                [Constants.errorProperties.Message]: error?.message,
            });
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    Constants.initialize(context);
    CredentialStore.initialize(context);
    TelemetryClient.initialize(context);
    TelemetryClient.sendEvent("extensionActivated");

    // Register Azure sign-in command (replaces azure-account.login)
    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.signInToAzure", async () => {
        try {
            const session = await vscode.authentication.getSession("microsoft", ["https://management.azure.com/.default"], { createIfNone: true });
            if (!session) {
                return;
            }
        } catch {
            return; // User dismissed or cancelled the sign-in prompt
        }
        await refreshAllTreeViews();
    }));

    const { azureIoTExplorer, deviceTree } = initializeTreeView(context);

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

    const sendD2CMessage = vscode.commands.registerCommand("azure-iot-toolkit.sendD2CMessage", async (deviceNode: DeviceNode) => {
        await azureIoTExplorer.showSimulatorWebview(deviceNode ? deviceNode.deviceItem : undefined);
    });

    const startMonitorIoTHubMessage = vscode.commands.registerCommand("azure-iot-toolkit.startMonitorIoTHubMessage", (deviceNode: DeviceNode) => {
        azureIoTExplorer.startMonitorIoTHubMessage(deviceNode ? deviceNode.deviceItem : undefined);
    });

    const stopMonitorIoTHubMessage = vscode.commands.registerCommand("azure-iot-toolkit.stopMonitorIoTHubMessage", () => {
        azureIoTExplorer.stopMonitorIoTHubMessage();
    });

    const sendC2DMessage = vscode.commands.registerCommand("azure-iot-toolkit.sendC2DMessage", (deviceNode: DeviceNode) => {
        azureIoTExplorer.sendC2DMessage(deviceNode ? deviceNode.deviceItem : undefined);
    });

    const startMonitorC2DMessage = vscode.commands.registerCommand("azure-iot-toolkit.startMonitorC2DMessage", (deviceNode: DeviceNode) => {
        azureIoTExplorer.startMonitorC2DMessage(deviceNode ? deviceNode.deviceItem : undefined);
    });

    const stopMonitorC2DMessage = vscode.commands.registerCommand("azure-iot-toolkit.stopMonitorC2DMessage", () => {
        azureIoTExplorer.stopMonitorC2DMessage();
    });

    const listDevice = vscode.commands.registerCommand("azure-iot-toolkit.listDevice", () => {
        azureIoTExplorer.listDevice();
    });

    const createDevice = vscode.commands.registerCommand("azure-iot-toolkit.createDevice", async () => {
        return azureIoTExplorer.createDevice();
    });

    const deleteDevice = vscode.commands.registerCommand("azure-iot-toolkit.deleteDevice", async (deviceNode: DeviceNode) => {
        await azureIoTExplorer.deleteDevice(deviceNode ? deviceNode.deviceItem : undefined);
    });

    const invokeDeviceMethod = vscode.commands.registerCommand("azure-iot-toolkit.invokeDeviceMethod", (deviceNode: DeviceNode) => {
        azureIoTExplorer.invokeDeviceDirectMethod(deviceNode ? deviceNode.deviceItem : undefined);
    });

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.invokeModuleDirectMethod", (moduleItemNode: ModuleItemNode) => {
        azureIoTExplorer.invokeModuleDirectMethod(moduleItemNode ? moduleItemNode.moduleItem : undefined);
    }));

    const getDeviceTwin = vscode.commands.registerCommand("azure-iot-toolkit.getDeviceTwin", (deviceNode: DeviceNode) => {
        azureIoTExplorer.getDeviceTwin(deviceNode ? deviceNode.deviceItem : undefined);
    });

    const updateDistributedTracingSetting = vscode.commands.registerCommand("azure-iot-toolkit.updateDistributedTracingSetting", (node) => {
        // Todo: Determine why the parameter is not null when triggered from context menu of custom panel
        // https://github.com/microsoft/vscode/issues/94872
        azureIoTExplorer.updateDistributedTracingSetting(node);
    });

    const editDistributedTracingMode = vscode.commands.registerCommand("azure-iot-toolkit.editDistributedTracingMode", (node) => {
        azureIoTExplorer.updateDistributedTracingSetting(node, DistributedSettingUpdateType.OnlyMode);
    });

    const editDistributedTracingSamplingRate = vscode.commands.registerCommand("azure-iot-toolkit.editDistributedTracingSamplingRate", (node) => {
        azureIoTExplorer.updateDistributedTracingSetting(node, DistributedSettingUpdateType.OnlySamplingRate);
    });

    const updateDeviceTwin = vscode.commands.registerCommand("azure-iot-toolkit.updateDeviceTwin", () => {
        azureIoTExplorer.updateDeviceTwin();
    });

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.createIoTHub", () => {
        azureIoTExplorer.createIoTHub();
    }));

    const selectIoTHub = vscode.commands.registerCommand("azure-iot-toolkit.selectIoTHub", () => {
        azureIoTExplorer.selectIoTHub();
    });

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.clearIoTHubConnectionString", async () => {
        await CredentialStore.deletePassword(Constants.IotHubConnectionStringKey);
        await CredentialStore.deletePassword(Constants.IotHubEventHubConnectionStringKey);
        await Utility.deleteIoTHubInfo();
        deviceTree.refresh(undefined);
        vscode.window.showInformationMessage("IoT Hub connection string has been cleared.");
        TelemetryClient.sendEvent("General.ClearConnectionString");
    }));

    const copyIoTHubConnectionString = vscode.commands.registerCommand("azure-iot-toolkit.copyIoTHubConnectionString", async () => {
        await azureIoTExplorer.copyIoTHubConnectionString();
    });

    const copyDeviceConnectionString = vscode.commands.registerCommand("azure-iot-toolkit.copyDeviceConnectionString", async (deviceNode: DeviceNode) => {
        await azureIoTExplorer.copyDeviceConnectionString(deviceNode ? deviceNode.deviceItem : undefined);
    });

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.createEdgeDevice", async () => {
        await azureIoTExplorer.createDevice(true);
    }));

    const createDeployment = vscode.commands.registerCommand("azure-iot-toolkit.createDeployment", (input) => {
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

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.generateCode", async (deviceNode: DeviceNode) => {
        await azureIoTExplorer.generateCode(deviceNode ? deviceNode.deviceItem : undefined);
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

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.startMonitorCustomEventHubEndpoint", async (eventHubItemNode: EventHubItemNode) => {
        await azureIoTExplorer.startMonitorCustomEventHubEndpoint(eventHubItemNode ? eventHubItemNode.eventHubItem : undefined);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.stopMonitorCustomEventHubEndpoint", () => {
        azureIoTExplorer.stopMonitorCustomEventHubEndpoint();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-toolkit.startMonitorIoTHubMessageWithAbbreviation", () => {
        TelemetryClient.sendEvent(Constants.IoTHubAIStartMonitorEvent, { entry: "built-in-events" });
        vscode.commands.executeCommand("azure-iot-toolkit.startMonitorIoTHubMessage");
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

function initializeTreeView(context: vscode.ExtensionContext) {
    const outputChannel = createAzExtOutputChannel("Azure IoT Hub", "azure-iot-toolkit");

    const uiExtensionVariables = {
        context,
        outputChannel,
    };
    registerUIExtensionVariables(uiExtensionVariables);

    activateDps(context, outputChannel);
    const azureIoTExplorer = activateIoTHub(context, outputChannel);

    const deviceTree = new DeviceTree(context);
    vscode.window.registerTreeDataProvider("iotHubDevices", deviceTree);

    return { azureIoTExplorer, deviceTree };
}

function activateDps(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    const dpsTreeItem = new DpsAccountTreeItem(undefined);
    const dpsExtTreeDataProvider = new AzExtTreeDataProvider(dpsTreeItem, "azure-iot-dps.loadMore");

    context.subscriptions.push(dpsTreeItem as any);
    context.subscriptions.push(vscode.window.createTreeView("iotDpsExplorer", { treeDataProvider: dpsExtTreeDataProvider, showCollapseAll: true }));

    const azureDpsExplorer = new AzureDpsExplorer(outputChannel, dpsExtTreeDataProvider);

    registerCommand("azure-iot-dps.viewProperties", async (actionContext: IActionContext, node?: DpsResourceTreeItem) => {
        await azureDpsExplorer.viewProperties(actionContext, node);
    });
    registerCommand("azure-iot-dps.loadMore", async (actionContext: IActionContext, node: AzExtTreeItem) => {
        await azureDpsExplorer.loadMore(actionContext, node);
    });
    registerCommand("azure-iot-dps.refresh", async (actionContext: IActionContext, node: AzExtTreeItem) => {
        await azureDpsExplorer.refresh(actionContext, node);
    });
}

function getEventStreamNodeName(node?: INode): string | undefined {
    return node instanceof EventStreamItemNode ? node.name : undefined;
}

function getRouteNodeName(node?: INode): string | undefined {
    return node instanceof RouteItemNode ? node.name : undefined;
}

function activateIoTHub(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    const iotHubTreeItem = new IoTHubAccountTreeItem(undefined);
    const iotHubExtTreeDataProvider = new AzExtTreeDataProvider(iotHubTreeItem, "azure-iot-hub.loadMore");

    const azureIoTExplorer = new AzureIoTExplorer(outputChannel, context, iotHubExtTreeDataProvider);

    context.subscriptions.push(iotHubTreeItem);
    context.subscriptions.push(vscode.window.createTreeView("iotHubExplorer", { treeDataProvider: iotHubExtTreeDataProvider, showCollapseAll: true }));

    registerCommand("azure-iot-hub.setIoTHub", async (actionContext: IActionContext, node?: IoTHubResourceTreeItem) => {
        await azureIoTExplorer.setIoTHub(actionContext, node);
    });

    registerCommand("azure-iot-hub.loadMore", async (actionContext: IActionContext, node: AzExtTreeItem) => {
        await iotHubExtTreeDataProvider.loadMore(node, actionContext);
    });

    registerCommand("azure-iot-hub.refresh", async (actionContext: IActionContext, node: AzExtTreeItem) => {
        await iotHubExtTreeDataProvider.refresh(actionContext);
    });

    registerCommand("azure-iot-hub.createFabricEventStreamEndpoint", async () => {
        let createdEndpoint: ICreatedFabricEventStreamEndpoint;
        try {
            createdEndpoint = await createFabricEventStreamEndpoint(outputChannel);
            TelemetryClient.sendOutcome(Constants.IoTHubAICreateFabricEventStreamEndpointEvent);
        } catch (error) {
            TelemetryClient.sendOutcome(Constants.IoTHubAICreateFabricEventStreamEndpointEvent, error);
            throw error;
        }
        vscode.commands.executeCommand("azure-iot-toolkit.refresh");
        await offerRouteForEndpoint(outputChannel, createdEndpoint.endpointName, createdEndpoint.selectedHub);
        vscode.commands.executeCommand("azure-iot-toolkit.refresh");
    });

    registerCommand("azure-iot-hub.updateFabricEventStreamEndpoint", async (actionContext: IActionContext, node?: INode) => {
        try {
            await updateFabricEventStreamEndpoint(outputChannel, getEventStreamNodeName(node));
            TelemetryClient.sendOutcome(Constants.IoTHubAIUpdateFabricEventStreamEndpointEvent);
        } catch (error) {
            TelemetryClient.sendOutcome(Constants.IoTHubAIUpdateFabricEventStreamEndpointEvent, error);
            throw error;
        }
        vscode.commands.executeCommand("azure-iot-toolkit.refresh");
    });

    const messageRouteCommands: Array<[string, string, (name?: string) => Promise<void>]> = [
        ["createMessageRoute", Constants.IoTHubAICreateMessageRouteEvent, () => createMessageRoute(outputChannel)],
        ["updateMessageRoute", Constants.IoTHubAIUpdateMessageRouteEvent, (name) => updateMessageRoute(outputChannel, name)],
        ["deleteMessageRoute", Constants.IoTHubAIDeleteMessageRouteEvent, (name) => deleteMessageRoute(outputChannel, name)],
    ];

    for (const [commandSuffix, telemetryEvent, handler] of messageRouteCommands) {
        registerCommand(`azure-iot-hub.${commandSuffix}`, async (actionContext: IActionContext, node?: INode) => {
            try {
                await handler(getRouteNodeName(node));
                TelemetryClient.sendOutcome(telemetryEvent);
            } catch (error) {
                TelemetryClient.sendOutcome(telemetryEvent, error);
                throw error;
            }
            vscode.commands.executeCommand("azure-iot-toolkit.refresh");
        });
    }

    return azureIoTExplorer;
}
