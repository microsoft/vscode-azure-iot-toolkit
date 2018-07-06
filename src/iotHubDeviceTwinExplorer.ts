// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as iothub from "azure-iothub";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
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
        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        TelemetryClient.sendEvent(Constants.IoTHubAIGetDeviceTwinDoneEvent);
        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
        this._outputChannel.show();
        this.outputLine(Constants.IoTHubDeviceTwinLabel, `Get Device Twin for [${deviceId}]...`);
        registry.getTwin(deviceId, (err, twin) => {
            if (err) {
                this.outputLine(Constants.IoTHubDeviceTwinLabel, `Failed to get Device Twin: ${err.message}`);
            } else {
                this.outputLine(Constants.IoTHubDeviceTwinLabel, `Device Twin retrieved successfully`);
                Utility.writeJson(Constants.DeviceTwinJsonFilePath, twin);
                vscode.workspace.openTextDocument(Constants.DeviceTwinJsonFilePath).then((document: vscode.TextDocument) => {
                    if (document.isDirty) {
                        vscode.window.showWarningMessage(`Your ${Constants.DeviceTwinJsonFileName} has unsaved changes. \
                        Please close or save the file. Then try again.`);
                    }
                    vscode.window.showTextDocument(document);
                });
            }
        });
    }

    public async updateDeviceTwin() {
        TelemetryClient.sendEvent(Constants.IoTHubAIUpdateDeviceTwinEvent);
        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        try {
            this._outputChannel.show();
            let deviceTwinContent = await Utility.readFromActiveFile(Constants.DeviceTwinJsonFileName);
            if (!deviceTwinContent) {
                return;
            }
            let deviceTwinJson = JSON.parse(deviceTwinContent);
            this.outputLine(Constants.IoTHubDeviceTwinLabel, `Update Device Twin for [${deviceTwinJson.deviceId}]...`);
            let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
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
