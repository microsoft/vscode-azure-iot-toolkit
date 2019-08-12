// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { EventData, EventHubClient, EventPosition } from "@azure/event-hubs";
import { ConnectionString } from "azure-iot-common";
import { Message } from "azure-iot-device";
import { Client } from "azure-iot-device";
import { clientFromConnectionString } from "azure-iot-device-mqtt";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { IoTHubMessageBaseExplorer } from "./iotHubMessageBaseExplorer";
import { DeviceItem } from "./Model/DeviceItem";
import { SendStatus } from "./sendStatus";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class IoTHubMessageExplorer extends IoTHubMessageBaseExplorer {
    private _eventHubClient: EventHubClient;

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

    public async sendD2CMessageFromMultipleDevicesRepeatedlyWithProgressBar(deviceConnectionStrings: string[], message: string, times: number, interval: number) {
        const deviceCount = deviceConnectionStrings.length;
        const total = deviceCount * times;
        if (total <= 0) {
            this.outputLine(Constants.SimulatorSummaryLabel, `Invalid Operation.`);
            return Promise.reject();
        }
        const step = 100 / total;
        const startTime = new Date();
        this.outputLine(Constants.SimulatorSummaryLabel, `[${this.timeFormat(startTime)}] Start sending messages from ${deviceCount} device(s) to IoT Hub.`);
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: Constants.SimulatorSendingMessageProgressBarTitle,
            cancellable: true,
        }, async (progress, token) => {
            token.onCancellationRequested(() => {
                vscode.window.showInformationMessage(Constants.SimulatorProgressBarCancelLog);
            });
            progress.report({ increment: 0});
            let clients = [];
            let statuses = [];
            let ids = [];
            let totalStatus = new SendStatus("Total", total);
            for (let i = 0; i < deviceCount; i++) {
                clients.push(await clientFromConnectionString(deviceConnectionStrings[i]));
                statuses.push(new SendStatus(ConnectionString.parse(deviceConnectionStrings[i]).DeviceId, times));
                ids.push(i);
            }
            const sendingStartTime = new Date();
            for (let i = 0; i < times; i++) {
                await ids.map(async (j) => await this.sendD2CMessageCoreWithProgress(clients[j], message, statuses[j], totalStatus));
                if (token.isCancellationRequested) {
                    break;
                }
                if (i < times - 1) {
                    // there won't be a delay after the last iteration
                    await this.delay(interval, token, progress, totalStatus);
                }
                progress.report({
                    increment: step * deviceCount,
                    message: `Sent message(s) ${totalStatus.sum()} of ${totalStatus.getTotal()}`,
                });
            }
            const sendingEndTime = new Date();
            this.outputLine(Constants.SimulatorSummaryLabel,
                `Sending ${total} message(s) done in ${(sendingEndTime.getTime() - sendingStartTime.getTime()) / 1000} second(s), please wait a few seconds for the result.`,
            );
            while ((!token.isCancellationRequested) && (totalStatus.sum() !== totalStatus.getTotal())) {
                await this.delay(1);
            }
            const endTime = new Date();
            this.outputLine(Constants.SimulatorSummaryLabel,
                `${token.isCancellationRequested ? "User aborted" : "All device(s) finished"} at ${this.timeFormat(endTime)}`,
            );
            this.outputLine(Constants.SimulatorSummaryLabel,
                `Duration: ${(endTime.getTime() - startTime.getTime()) / 1000} second(s), with ${totalStatus.getSucceed()} succeed, and ${totalStatus.getFailed()} failed.`,
            );
        });
    }

    public async startMonitorIoTHubMessage(deviceItem?: DeviceItem) {
        if (this._isMonitoring) {
            this._outputChannel.show();
            this.outputLine(Constants.IoTHubMonitorLabel, "There is a running job to monitor built-in event endpoint. Please stop it first.");
            return;
        }

        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }
        let config = Utility.getConfiguration();
        let consumerGroup = config.get<string>(Constants.IoTHubConsumerGroup);

        try {
            this._outputChannel.show();
            const deviceLabel = deviceItem ? `device [${deviceItem.deviceId}]` : "all devices";
            this.outputLine(Constants.IoTHubMonitorLabel, `Start monitoring message arrived in built-in endpoint for ${deviceLabel} ...`);
            this._eventHubClient = await EventHubClient.createFromIotHubConnectionString(iotHubConnectionString);
            TelemetryClient.sendEvent(Constants.IoTHubAIStartMonitorEvent, { deviceType: deviceItem ? deviceItem.contextValue : "" });
            await this.startMonitor(Constants.IoTHubMonitorLabel, consumerGroup, deviceItem);
            this.updateMonitorStatus(true);
        } catch (e) {
            this.updateMonitorStatus(false);
            this.outputLine(Constants.IoTHubMonitorLabel, e);
            TelemetryClient.sendEvent(Constants.IoTHubAIStartMonitorEvent, { Result: "Exception", Message: e });
        }
    }

    public stopMonitorIoTHubMessage(): void {
        this.stopMonitorEventHubEndpoint(Constants.IoTHubMonitorLabel, Constants.IoTHubAIStopMonitorEvent, this._eventHubClient, "built-in event endpoint");
    }

    private async sendD2CMessageCoreWithProgress(client: Client, message: string, status: SendStatus, totalStatus: SendStatus) {
        let stringify = Utility.getConfig<boolean>(Constants.IoTHubD2CMessageStringifyKey);
        await client.sendEvent(new Message(stringify ? JSON.stringify(message) : message),
            this.sendEventDoneWithProgress(client, Constants.IoTHubAIMessageDoneEvent, status, totalStatus));
    }

    private async delay(ms: number, token?: vscode.CancellationToken, progress?: vscode.Progress<{
        message?: string;
        increment?: number;
    }>, totalStatus?: SendStatus) {
        // update progress bar every second, even in a long interval
        if (progress) {
            progress.report({
                // do not increase the progress, just update the message here
                increment: 0,
                message: `Sent message(s) ${totalStatus.sum()} of ${totalStatus.getTotal()}`,
            });
        }
        if (ms <= 1000) {
            return new Promise( (resolve) => setTimeout(resolve, ms));
        } else {
            await new Promise( (resolve) => setTimeout(resolve, 1000));
            if (token) {
                if (token.isCancellationRequested) {
                    return;
                } else {
                    await this.delay(ms - 1000, token);
                }
            } else {
                await this.delay(ms - 1000);
            }
        }
    }

    private timeFormat(date: Date): string {
        let format = `${date.getFullYear()}-${("0" + (date.getMonth() + 1)).slice(-2)}-${("0" + date.getDate()).slice(-2)}`;
        format += ` ${("0" + (date.getHours())).slice(-2)}:${("0" + (date.getMinutes())).slice(-2)}:${("0" + (date.getSeconds())).slice(-2)}`;
        return format;
    }

    private async startMonitor(label: string, consumerGroup: string, deviceItem?: DeviceItem) {
        if (this._eventHubClient) {
            const monitorD2CBeforeNowInMinutes = Utility.getConfiguration().get<number>("monitorD2CBeforeNowInMinutes");
            const startAfterTime = new Date(Date.now() - 1000 * 60 * monitorD2CBeforeNowInMinutes);
            const partitionIds = await this._eventHubClient.getPartitionIds();
            partitionIds.forEach((partitionId) => {
                this.outputLine(label, `Created partition receiver [${partitionId}] for consumerGroup [${consumerGroup}]`);
                this._eventHubClient.receive(partitionId,
                    this.printMessage(this._outputChannel, label, deviceItem),
                    this.printError(this._outputChannel, label),
                    {
                        eventPosition: EventPosition.fromEnqueuedTime(startAfterTime),
                        consumerGroup,
                    });
            });
        }
    }

    private printError(outputChannel: vscode.OutputChannel, label: string) {
        return async (err) => {
            this.outputLine(label, err.message);
            if (this._isMonitoring) {
                await this._eventHubClient.close();
                this.outputLine(label, "Message monitoring stopped. Please try to start monitoring again or use a different consumer group to monitor.");
                this.updateMonitorStatus(false);
            }
        };
    };

    private printMessage(outputChannel: vscode.OutputChannel, label: string, deviceItem?: DeviceItem) {
        return async (message: EventData) => {
            const deviceId = message.annotations["iothub-connection-device-id"];
            const moduleId = message.annotations["iothub-connection-module-id"];
            if (deviceItem && deviceItem.deviceId !== deviceId) {
                return;
            }
            const result = Utility.getMessageFromEventData(message);
            const timeMessage = Utility.getTimeMessageFromEventData(message);
            const messageSource = moduleId ? `${deviceId}/${moduleId}` : deviceId;
            this.outputLine(label, `${timeMessage}Message received from [${messageSource}]:`);
            this._outputChannel.appendLine(JSON.stringify(result, null, 2));
        };
    };
}
