// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { EventHubConsumerClient, ReceivedEventData } from "@azure/event-hubs";
import { Message } from "azure-iot-device";
import { clientFromConnectionString } from "azure-iot-device-mqtt";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { IoTHubMessageBaseExplorer } from "./iotHubMessageBaseExplorer";
import { DeviceItem } from "./Model/DeviceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class IoTHubMessageExplorer extends IoTHubMessageBaseExplorer {
    private _eventHubCompatibleEndpointConnectionString: string;
    private _eventHubClient: EventHubConsumerClient;
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel, "$(primitive-square) Stop Monitoring built-in event endpoint", "azure-iot-toolkit.stopMonitorIoTHubMessage");
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
                    const client = clientFromConnectionString(deviceConnectionString);
                    const stringify = Utility.getConfig<boolean>(Constants.IoTHubD2CMessageStringifyKey);
                    client.sendEvent(new Message(stringify ? JSON.stringify(message) : message),
                        this.sendEventDone(client, Constants.IoTHubMessageLabel, Constants.IoTHub, Constants.IoTHubAIMessageDoneEvent));
                } catch (e) {
                    this.outputLine(Constants.IoTHubMessageLabel, e);
                }
            }
        });
    }

    public async startMonitorIoTHubMessage(deviceItem?: DeviceItem) {
        if (this._isMonitoring) {
            this._outputChannel.show();
            this.outputLine(Constants.IoTHubMonitorLabel, "There is a running job to monitor built-in event endpoint. Please stop it first.");
            return;
        }

        const connectionString = await Utility.getConnectionString(Constants.IotHubEventHubConnectionStringKey, Constants.IotHubEventHubConnectionStringTitle, true, "iot-hub-event-hub-connection-string.md");
        if (!connectionString) {
            return;
        }
        const config = Utility.getConfiguration();
        const consumerGroup = config.get<string>(Constants.IoTHubConsumerGroup);

        try {
            this._eventHubCompatibleEndpointConnectionString = connectionString
            this._outputChannel.show();
            const deviceLabel = deviceItem ? `device [${deviceItem.deviceId}]` : "all devices";
            this.outputLine(Constants.IoTHubMonitorLabel, `Start monitoring message arrived in built-in endpoint for ${deviceLabel} ...`);
            TelemetryClient.sendEvent(Constants.IoTHubAIStartMonitorEvent, { deviceType: deviceItem ? deviceItem.contextValue : "" });
            await this.startMonitor(Constants.IoTHubMonitorLabel, consumerGroup, deviceItem);
            this.updateMonitorStatus(true);
        } catch (e) {
            this.updateMonitorStatus(false);
            this.outputLine(Constants.IoTHubMonitorLabel, e);
            TelemetryClient.sendEvent(Constants.IoTHubAIStartMonitorEvent, { Result: "Exception", [Constants.errorProperties.Message]: e });
        }
    }

    public stopMonitorIoTHubMessage(): void {
        this.stopMonitorEventHubEndpoint(Constants.IoTHubMonitorLabel, Constants.IoTHubAIStopMonitorEvent, this._eventHubClient, "built-in event endpoint");
    }

    private async startMonitor(label: string, consumerGroup: string, deviceItem?: DeviceItem) {
        if (this._eventHubCompatibleEndpointConnectionString) {
            this._eventHubClient = new EventHubConsumerClient(consumerGroup, this._eventHubCompatibleEndpointConnectionString);
            const monitorD2CBeforeNowInMinutes = Utility.getConfiguration().get<number>("monitorD2CBeforeNowInMinutes");
            const startAfterTime = new Date(Date.now() - 1000 * 60 * monitorD2CBeforeNowInMinutes);
            const partitionIds = await this._eventHubClient.getPartitionIds();
            partitionIds.forEach((partitionId) => {
                this.outputLine(label, `Created partition receiver [${partitionId}] for consumerGroup [${consumerGroup}]`);
                this._eventHubClient.subscribe(partitionId,
                    {
                        processEvents: this.printMessage(label, deviceItem),
                        processError: this.printError(label)
                    },
                    {
                        startPosition: {enqueuedOn: startAfterTime }
                    });
            });
        }
    }

    private printError(label: string) {
        return async (err) => {
            this.outputLine(label, err.message);
            if (this._isMonitoring) {
                await this._eventHubClient.close();
                this.outputLine(label, "Message monitoring stopped. Please try to start monitoring again or use a different consumer group to monitor.");
                this.updateMonitorStatus(false);
            }
        };
    };

    private printMessage(label: string, deviceItem?: DeviceItem) {
        return async (messages: ReceivedEventData[]) => {
            messages.forEach(message => {
                const deviceId = message.systemProperties["iothub-connection-device-id"];
                const moduleId = message.systemProperties["iothub-connection-module-id"];
                if (deviceItem && deviceItem.deviceId !== deviceId) {
                    return;
                }
                const result = Utility.getMessageFromEventData(message);
                const timeMessage = Utility.getTimeMessageFromEventData(message);
                const messageSource = moduleId ? `${deviceId}/${moduleId}` : deviceId;
                this.outputLine(label, `${timeMessage}Message received from [${messageSource}]:`);
                this._outputChannel.appendLine(JSON.stringify(result, null, 2));
            });
        };
    };
}
