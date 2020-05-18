// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as iothub from "azure-iothub";
import * as vscode from "vscode";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { ModuleItem } from "./Model/ModuleItem";
import { DeviceNode } from "./Nodes/DeviceNode";
import { ModuleItemNode } from "./Nodes/ModuleItemNode";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class IotHubModuleExplorer extends BaseExplorer {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public async getModule(moduleItem: ModuleItem) {
        TelemetryClient.sendEvent(Constants.IoTHubAIGetModuleStartEvent);
        const label = "Module";
        const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        const registry: iothub.Registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        this._outputChannel.show();
        this.outputLine(label, `Querying module [${moduleItem.deviceId}/${moduleItem.moduleId}]...`);

        registry.getModule(moduleItem.deviceId, moduleItem.moduleId, (err: Error, module?: iothub.Module) => {
            if (err) {
                this.outputLine(label, `Error: ${err.message}`);
                TelemetryClient.sendEvent(Constants.IoTHubAIDGetModuleDoneEvent, { Result: "Fail", [Constants.errorProperties.Message]: err.message });
            }
            if (module) {
                this.outputLine(label, `Module info: ${JSON.stringify(module, null, 2)}`);
                TelemetryClient.sendEvent(Constants.IoTHubAIDGetModuleDoneEvent, { Result: "Success" });
            }
        });
    }

    public async createModule(deviceNode?: DeviceNode) {
        const label = "Module";
        const deviceItem = await Utility.getInputDevice(deviceNode ? deviceNode.deviceItem : undefined, Constants.IoTHubAICreateModuleStartEvent);
        if (!deviceItem) {
            return;
        }

        const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        const registry: iothub.Registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        const moduleId: string = await vscode.window.showInputBox({ prompt: "Enter Module ID to create", ignoreFocusOut: true });
        if (!moduleId) {
            return;
        }

        this._outputChannel.show();
        this.outputLine(label, `Creating '${moduleId}'`);

        registry.addModule({ deviceId: deviceItem.deviceId, moduleId }, (err, module) => {
            if (err) {
                this.outputLine(label, `Error: ${err.message}`);
                TelemetryClient.sendEvent(Constants.IoTHubAICreateModuleDoneEvent, { Result: "Fail", [Constants.errorProperties.Message]: err.message });
            } else {
                this.outputLine(label, `Created: ${JSON.stringify(module, null, 2)}`);
                vscode.commands.executeCommand("azure-iot-toolkit.refresh", deviceNode);
                TelemetryClient.sendEvent(Constants.IoTHubAICreateModuleDoneEvent, { Result: "Success" });
            }
        });
    }

    public async copyModuleConnectionString(moduleItem: ModuleItem) {
        TelemetryClient.sendEvent("AZ.Copy.ModuleConnectionString");
        if (moduleItem.connectionString) {
            await vscode.env.clipboard.writeText(moduleItem.connectionString);
        }
    }

    public async deleteModule(moduleItemNode: ModuleItemNode) {
        TelemetryClient.sendEvent(Constants.IoTHubAIDeleteModuleStartEvent);
        const label = "Module";
        const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        const result = await vscode.window.showWarningMessage(`${Constants.DeleteMessage} "${moduleItemNode.moduleItem.moduleId}"?`, { modal: true }, Constants.DeleteLabel);
        if (result !== Constants.DeleteLabel) {
            return;
        }

        const registry: iothub.Registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        this._outputChannel.show();
        this.outputLine(label, `Deleting '${moduleItemNode.moduleItem.moduleId}'`);

        registry.removeModule(moduleItemNode.moduleItem.deviceId, moduleItemNode.moduleItem.moduleId, (err) => {
            if (err) {
                this.outputLine(label, `Error: ${err.message}`);
                TelemetryClient.sendEvent(Constants.IoTHubAIDeleteModuleDoneEvent, { Result: "Fail", [Constants.errorProperties.Message]: err.message });
            } else {
                this.outputLine(label, `Deleted '${moduleItemNode.moduleItem.moduleId}'`);
                vscode.commands.executeCommand("azure-iot-toolkit.refresh", moduleItemNode.moduleLabelNode);
                TelemetryClient.sendEvent(Constants.IoTHubAIDeleteModuleDoneEvent, { Result: "Success" });
            }
        });
    }
}
