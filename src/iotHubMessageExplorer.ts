// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { Client as EventHubClient } from "azure-event-hubs";
import { Client, Message } from "azure-iot-device";
import { clientFromConnectionString } from "azure-iot-device-mqtt";
import * as vscode from "vscode";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { DeviceItem } from "./Model/DeviceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class IoTHubMessageExplorer extends BaseExplorer {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public async sendD2CMessage(deviceItem?: DeviceItem) {
        deviceItem = await Utility.getInputDevice(deviceItem, Constants.IoTHubAIMessageStartEvent);

        if (!deviceItem || !deviceItem.connectionString) {
            return;
        }

        const deviceConnectionString: string = deviceItem.connectionString;
        vscode.window.showInputBox({ prompt: `Enter message to send to ${Constants.IoTHub}`, ignoreFocusOut: true }).then((message: string) => {
            if (message !== undefined) {
                this._outputChannel.show();
                try {
                    let client = clientFromConnectionString(deviceConnectionString);
                    let stringify = Utility.getConfig<boolean>(Constants.IoTHubD2CMessageStringifyKey);
                    client.sendEvent(new Message(stringify ? JSON.stringify(message) : message),
                        this.sendEventDone(client, Constants.IoTHubMessageLabel, Constants.IoTHub, Constants.IoTHubAIMessageDoneEvent));
                } catch (e) {
                    this.outputLine(Constants.IoTHubMessageLabel, e);
                }
            }
        });
    }

    public async startMonitorIoTHubMessage(deviceItem?: DeviceItem) {
        if (this._eventHubClient) {
            this._outputChannel.show();
            this.outputLine(Constants.IoTHubMonitorLabel, "There is a running job to monitor D2C message. Please stop it first.");
            return;
        }

        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }
        let config = Utility.getConfiguration();
        let consumerGroup = config.get<string>(Constants.IoTHubConsumerGroup);

        try {
            this._eventHubClient = EventHubClient.fromConnectionString(iotHubConnectionString);
            this._outputChannel.show();
            const deviceLabel = deviceItem ? `[${deviceItem.deviceId}]` : "all devices";
            this.outputLine(Constants.IoTHubMonitorLabel, `Start monitoring D2C message for ${deviceLabel} ...`);
            TelemetryClient.sendEvent(Constants.IoTHubAIStartMonitorEvent);
            this.startMonitor(Constants.IoTHubMonitorLabel, consumerGroup, deviceItem);
        } catch (e) {
            this.outputLine(Constants.IoTHubMonitorLabel, e);
            TelemetryClient.sendEvent(Constants.IoTHubAIStartMonitorEvent, { Result: "Exception", Message: e });
        }
    }

    public stopMonitorIoTHubMessage(): void {
        this.stopMonitor(Constants.IoTHubMonitorLabel, Constants.IoTHubAIStopMonitorEvent);
        this._eventHubClient = null;
    }
}
