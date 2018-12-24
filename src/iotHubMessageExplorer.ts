// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { Client as EventHubClient } from "azure-event-hubs";
import { Message } from "azure-iot-device";
import { clientFromConnectionString } from "azure-iot-device-mqtt";
import * as vscode from "vscode";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { DeviceItem } from "./Model/DeviceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class IoTHubMessageExplorer extends BaseExplorer {
    private _isMonitoring: boolean;
    private _eventHubClient;
    private _monitorStatusBarItem: vscode.StatusBarItem;

    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
        this._isMonitoring = false;
        this._monitorStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -9999999);
        this._monitorStatusBarItem.text = "$(primitive-square) Stop Monitoring D2C Message";
        this._monitorStatusBarItem.command = "azure-iot-toolkit.stopMonitorIoTHubMessage";
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
        if (this._isMonitoring) {
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
            this.updateMonitorStatus(true);
            this._outputChannel.show();
            const deviceLabel = deviceItem ? `[${deviceItem.deviceId}]` : "all devices";
            this.outputLine(Constants.IoTHubMonitorLabel, `Start monitoring D2C message for ${deviceLabel} ...`);
            TelemetryClient.sendEvent(Constants.IoTHubAIStartMonitorEvent, { deviceType: deviceItem ? deviceItem.contextValue : "" });
            this.startMonitor(Constants.IoTHubMonitorLabel, consumerGroup, deviceItem);
        } catch (e) {
            this.updateMonitorStatus(false);
            this.outputLine(Constants.IoTHubMonitorLabel, e);
            TelemetryClient.sendEvent(Constants.IoTHubAIStartMonitorEvent, { Result: "Exception", Message: e });
        }
    }

    public stopMonitorIoTHubMessage(): void {
        this.stopMonitor(Constants.IoTHubMonitorLabel, Constants.IoTHubAIStopMonitorEvent);
    }

    private startMonitor(label: string, consumerGroup: string, deviceItem?: DeviceItem) {
        if (this._eventHubClient) {
            const monitorD2CBeforeNowInMinutes = Utility.getConfiguration().get<number>("monitorD2CBeforeNowInMinutes");
            const startAfterTime = new Date(Date.now() - 1000 * 60 * monitorD2CBeforeNowInMinutes);
            this._eventHubClient.open()
                .then(this._eventHubClient.getPartitionIds.bind(this._eventHubClient))
                .then((partitionIds: any) => {
                    return partitionIds.map((partitionId) => {
                        return this._eventHubClient.createReceiver(consumerGroup, partitionId, { startAfterTime })
                            .then((receiver) => {
                                this.outputLine(label, `Created partition receiver [${partitionId}] for consumerGroup [${consumerGroup}]`);
                                receiver.on("errorReceived", this.printError(this._outputChannel, label));
                                receiver.on("message", this.printMessage(this._outputChannel, label, deviceItem));
                            });
                    });
                });
        }
    }

    private stopMonitor(label: string, aiEvent: string) {
        TelemetryClient.sendEvent(aiEvent);
        this._outputChannel.show();
        if (this._isMonitoring) {
            this.outputLine(label, "D2C monitoring stopped.");
            this._eventHubClient.close();
            this.updateMonitorStatus(false);
        } else {
            this.outputLine(label, "No D2C monitor job running.");
        }
    }

    private printError(outputChannel: vscode.OutputChannel, label: string) {
        return (err) => {
            this.outputLine(label, err.message);
            if (this._isMonitoring) {
                this.outputLine(label, "D2C monitoring stopped. Please try to start monitoring again or use a different consumer group to monitor.");
                this._eventHubClient.close();
                this.updateMonitorStatus(false);
            }
        };
    };

    private printMessage(outputChannel: vscode.OutputChannel, label: string, deviceItem?: DeviceItem) {
        return (message) => {
            const deviceId = message.annotations["iothub-connection-device-id"];
            const moduleId = message.annotations["iothub-connection-module-id"];
            if (deviceItem && deviceItem.deviceId !== deviceId) {
                return;
            }
            let config = Utility.getConfiguration();
            let showVerboseMessage = config.get<boolean>("showVerboseMessage");
            let result;
            const body = this.tryGetStringFromCharCode(message.body);
            if (showVerboseMessage) {
                result = {
                    body,
                    applicationProperties: message.applicationProperties,
                    annotations: message.annotations,
                    properties: message.properties,
                };
            } else if (message.applicationProperties && Object.keys(message.applicationProperties).length > 0) {
                result = {
                    body,
                    applicationProperties: message.applicationProperties,
                };
            } else {
                result = body;
            }
            const timeMessage = message.enqueuedTimeUtc ? `[${message.enqueuedTimeUtc.toLocaleTimeString("en-US")}] ` : "";
            const messageSource = moduleId ? `${deviceId}/${moduleId}` : deviceId;
            this.outputLine(label, `${timeMessage}Message received from [${messageSource}]:`);
            this._outputChannel.appendLine(JSON.stringify(result, null, 2));
        };
    };

    private updateMonitorStatus(status: boolean) {
        if (status) {
            this._isMonitoring = true;
            this._monitorStatusBarItem.show();
        } else {
            this._isMonitoring = false;
            this._monitorStatusBarItem.hide();
        }
    }
}
