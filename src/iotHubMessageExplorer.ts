// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { EventData, EventHubClient, EventPosition } from "@azure/event-hubs";
import { Message } from "azure-iot-device";
import { clientFromConnectionString } from "azure-iot-device-mqtt";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { IoTHubMessageBaseExplorer } from "./iotHubMessageBaseExplorer";
import { DeviceItem } from "./Model/DeviceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";
import { Client } from 'azure-iot-device';
import { ConnectionString } from 'azure-iot-common';
import { Send } from "express-serve-static-core";

export class SendStatus {
    private id: string;
    private succeed: number;
    private failed: number;
    private total: number;

    constructor(id: string, total: number) {
        this.id = id;
        this.succeed = 0;
        this.failed = 0;
        this.total = total;
    }
    
    public getId(): string {
        return this.id;
    }
    public getSucceed(): number {
        return this.succeed;
    }
    public getFailed(): number {
        return this.failed;
    }
    public getTotal(): number {
        return this.total;
    }

    private AddSucceed(): void {
        this.succeed++;
    }
    private AddFailed(): void {
        this.failed++;
    }
    public newStatus(succeed: boolean) {
        if (succeed) {
            this.AddSucceed();
        } else {
            this.AddFailed();
        }
    }

    public sum(): number {
        return this.succeed + this.failed;
    }
}

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
                    this.sendD2CMessageCore(client, message);
                } catch (e) {
                    this.outputLine(Constants.IoTHubMessageLabel, e);
                }
            }
        });
    }

    private async sendD2CMessageCore(client: Client, message: string) {
        let stringify = Utility.getConfig<boolean>(Constants.IoTHubD2CMessageStringifyKey);
        client.sendEvent(new Message(stringify ? JSON.stringify(message) : message),
            this.sendEventDone(client, Constants.IoTHubMessageLabel, Constants.IoTHub, Constants.IoTHubAIMessageDoneEvent));
    }

    private async sendD2CMessageCoreWithProgress(client: Client, message: string, status: SendStatus, totalStatus: SendStatus) {
        let stringify = Utility.getConfig<boolean>(Constants.IoTHubD2CMessageStringifyKey);
        await client.sendEvent(new Message(stringify ? JSON.stringify(message) : message),
            this.sendEventDoneWithProgress(client, Constants.IoTHubAIMessageDoneEvent, status, totalStatus));
    }

    private async delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms));
    }

    public async sendD2CMessageFromMultipleDevicesRepeatedlyWithProgressBar(deviceConnectionStrings: string[], message: string, times: number, interval: number) {
        const startTime = new Date();
        this.outputLine(Constants.SimulatorSummaryLabel, `Start at ${startTime}`)
        await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: Constants.SimulatorSendingMessageProgressBarTitle,
			cancellable: true
		}, async (progress, token) => {
            token.onCancellationRequested(() => {
                vscode.window.showInformationMessage(Constants.SimulatorProgressBarCancelLog);
            })
            progress.report({ increment: 0});
            const deviceCount = deviceConnectionStrings.length;
            const total = deviceCount * times;
            const step = 100 / total;
            let count = 0;
            let clients = [];
            let statuses = [];
            let totalStatus = new SendStatus('Total', total);
            for(let i = 0; i < deviceCount; i++) {
                clients.push(await clientFromConnectionString(deviceConnectionStrings[i]));
                statuses.push(new SendStatus(ConnectionString.parse(deviceConnectionStrings[i]).DeviceId, times));
            }
            for(let i = 0; i < times; i++) {
                for (let j = 0; j < deviceCount; j++) {
                    this.sendD2CMessageCoreWithProgress(clients[j], message, statuses[j], totalStatus);
                    progress.report({
                        increment: step,
                        message: `Sending message(s) ${count} of ${total}`
                    })
                }
                if (token.isCancellationRequested) {
                    break;
                }
                await this.delay(interval);
            }
            while ((!token.isCancellationRequested) && (totalStatus.sum() != totalStatus.getTotal())) {
                await this.delay(1);
            };
            const endTime = new Date();
            this.outputLine(Constants.SimulatorSummaryLabel, `${token.isCancellationRequested ? 'User aborted' : 'All device(s) finished'} at ${endTime}`);
            this.outputLine(Constants.SimulatorSummaryLabel, `Duration: ${(endTime.getTime() - startTime.getTime()) / 1000} second(s), with ${totalStatus.getSucceed()} succeed, and ${totalStatus.getFailed()} failed.`);            
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
