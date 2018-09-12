// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { Client as EventHubClient } from "azure-event-hubs";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { DeviceItem } from "./Model/DeviceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class BaseExplorer {
    protected _eventHubClient;
    protected _outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this._outputChannel = outputChannel;
    }

    protected output(label: string, message: string, outputChannel: vscode.OutputChannel = this._outputChannel): void {
        outputChannel.append(`[${label}] ${message}`);
    }

    protected outputLine(label: string, message: string, outputChannel: vscode.OutputChannel = this._outputChannel): void {
        outputChannel.appendLine(`[${label}] ${message}`);
    }

    protected printError(outputChannel: vscode.OutputChannel, label: string) {
        return (err) => {
            this.outputLine(label, err.message);
            if (this._eventHubClient) {
                this.outputLine(label, "D2C monitoring stopped. Please try to start monitoring again or use a differnt consumer group to monitor.");
                this._eventHubClient.close();
                this._eventHubClient = null;
            }
        };
    };

    protected printMessage(outputChannel: vscode.OutputChannel, label: string, deviceItem?: DeviceItem) {
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

    protected startMonitor(label: string, consumerGroup: string, deviceItem?: DeviceItem) {
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

    protected stopMonitor(label: string, aiEvent: string) {
        TelemetryClient.sendEvent(aiEvent);
        this._outputChannel.show();
        if (this._eventHubClient) {
            this.outputLine(label, "D2C monitoring stopped.");
            this._eventHubClient.close();
        } else {
            this.outputLine(label, "No D2C monitor job running.");
        }
    }

    protected sendEventDone(client, label: string, target: string, aiEventName: string) {
        this.outputLine(label, `Sending message to [${target}] ...`);

        return (err, result) => {
            if (err) {
                this.outputLine(label, `Failed to send message to [${target}]`);
                this.outputLine(label, err.toString());
                TelemetryClient.sendEvent(aiEventName, { Result: "Fail" });
            }
            if (result) {
                this.outputLine(label, `[Success] Message sent to [${target}]`);
                TelemetryClient.sendEvent(aiEventName, { Result: "Success" });
            }
            client.close(() => { return; });
        };
    }

    private tryGetStringFromCharCode(source) {
        if (source instanceof Uint8Array) {
            try {
                source = String.fromCharCode.apply(null, source);
            } catch (e) {
            }
        }
        return source;
    }
}
