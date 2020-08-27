// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as iothub from "azure-iothub";
import * as vscode from "vscode";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { DeviceItem } from "./Model/DeviceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class IotHubDeviceTwinExplorer extends BaseExplorer {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public async getDeviceTwin(deviceItem: DeviceItem) {
        deviceItem = await Utility.getInputDevice(deviceItem, Constants.IoTHubAIGetDeviceTwinStartEvent);

        if (deviceItem) {
            this.getDeviceTwinById(deviceItem.deviceId);
        }
    }

    public async getDeviceTwinById(deviceId: string) {
        const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        TelemetryClient.sendEvent(Constants.IoTHubAIGetDeviceTwinDoneEvent);
        const registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
        this._outputChannel.show();
        this.outputLine(Constants.IoTHubDeviceTwinLabel, `Get Device Twin for [${deviceId}]...`);
        registry.getTwin(deviceId, (err, twin) => {
            if (err) {
                this.outputLine(Constants.IoTHubDeviceTwinLabel, `Failed to get Device Twin: ${err.message}`);
            } else {
                this.outputLine(Constants.IoTHubDeviceTwinLabel, `Device Twin retrieved successfully`);
                Utility.writeJson(Constants.DeviceTwinJosnFilePath, twin);
                vscode.workspace.openTextDocument(Constants.DeviceTwinJosnFilePath).then((document: vscode.TextDocument) => {
                    if (document.isDirty) {
                        vscode.window.showWarningMessage(`Your ${Constants.DeviceTwinJosnFileName} has unsaved changes. \
                        Please close or save the file. Then try again.`);
                    }
                    vscode.window.showTextDocument(document);
                });
            }
        });
    }

    public async updateDeviceTwin() {
        TelemetryClient.sendEvent(Constants.IoTHubAIUpdateDeviceTwinEvent);
        const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        try {
            this._outputChannel.show();
            const deviceTwinContent = await Utility.readFromActiveFile(Constants.DeviceTwinJosnFileName);
            if (!deviceTwinContent) {
                return;
            }
            const deviceTwinJson = JSON.parse(deviceTwinContent);
            this.outputLine(Constants.IoTHubDeviceTwinLabel, `Update Device Twin for [${deviceTwinJson.deviceId}]...`);
            const registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
            registry.updateTwin(deviceTwinJson.deviceId, deviceTwinContent, deviceTwinJson.etag, (err) => {
                if (err) {
                    this.outputLine(Constants.IoTHubDeviceTwinLabel, `Failed to update Device Twin: ${err.message}`);
                } else {
                    this.outputLine(Constants.IoTHubDeviceTwinLabel, `Device Twin updated successfully`);
                    this.getDeviceTwinById(deviceTwinJson.deviceId);
                }
            });
        } catch (e) {
            this.outputLine(Constants.IoTHubDeviceTwinLabel, `Failed to update Device Twin: ${e}`);
            return;
        }
    }
}
