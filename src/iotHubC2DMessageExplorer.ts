// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { Message } from "azure-iot-common";
import { Client, ConnectionString } from "azure-iot-device";
import { clientFromConnectionString } from "azure-iot-device-mqtt";
import { Client as ServiceClient } from "azure-iothub";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { IoTHubMessageBaseExplorer } from "./iotHubMessageBaseExplorer";
import { DeviceItem } from "./Model/DeviceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";
import { SendStatus }  from "./iotHubMessageExplorer";

export class IotHubC2DMessageExplorer extends IoTHubMessageBaseExplorer {
    private _deviceClient: Client;

    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel, "$(primitive-square) Stop Monitoring C2D Message", "azure-iot-toolkit.stopMonitorC2DMessage");
    }

    public async sendC2DMessage(deviceItem?: DeviceItem) {
        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        deviceItem = await Utility.getInputDevice(deviceItem, Constants.IoTHubAIC2DMessageStartEvent);

        if (deviceItem && deviceItem.label) {
            this.sendC2DMessageById(iotHubConnectionString, deviceItem.label);
        }
    }

    public async startMonitorC2DMessage(deviceItem?: DeviceItem) {
        if (this._isMonitoring) {
            this._outputChannel.show();
            this.outputLine(Constants.IoTHubC2DMessageMonitorLabel, "There is a running job to monitor C2D message. Please stop it first.");
            return;
        }

        deviceItem = await Utility.getInputDevice(deviceItem, Constants.IoTHubAIStartMonitorC2DEvent);
        if (!deviceItem || !deviceItem.connectionString) {
            return;
        }

        const deviceConnectionString: string = deviceItem.connectionString;
        this._outputChannel.show();
        this._deviceClient = clientFromConnectionString(deviceConnectionString);
        this._deviceClient.open(this.connectCallback(deviceConnectionString));
    }

    public stopMonitorC2DMessage() {
        TelemetryClient.sendEvent(Constants.IoTHubAIStopMonitorC2DEvent);
        this._outputChannel.show();
        if (this._isMonitoring) {
            this.outputLine(Constants.IoTHubC2DMessageMonitorLabel, "C2D monitoring stopped.");
            this._monitorStatusBarItem.hide();
            this._deviceClient.close(() => { this.updateMonitorStatus(false); });
        } else {
            this.outputLine(Constants.IoTHubC2DMessageMonitorLabel, "No C2D monitor job running.");
        }
    }

    private sendC2DMessageById(iotHubConnectionString: string, deviceId: string): void {
        vscode.window.showInputBox({ prompt: `Enter message to send to device` }).then((messageBody) => {
            if (messageBody !== undefined) {
                let serviceClient = ServiceClient.fromConnectionString(iotHubConnectionString);
                this._outputChannel.show();
                serviceClient.open((err) => {
                    if (err) {
                        this.outputLine(Constants.IoTHubC2DMessageLabel, err.message);
                    } else {
                        let message = new Message(messageBody);
                        this.sendC2DMessageByIdCore(serviceClient, deviceId, message);
                    }
                });
            }
        });
    }

    private sendC2DMessageByIdCore(serviceClient: ServiceClient, deviceId: string, message: Message) {
        serviceClient.send(deviceId, message.getData(),
            this.sendEventDone(serviceClient, Constants.IoTHubC2DMessageLabel, deviceId, Constants.IoTHubAIC2DMessageDoneEvent));
    }

    private async sendC2DMessageByIdCoreWithProgress(serviceClient: ServiceClient, deviceId: string, message: Message, status: SendStatus, progress: vscode.Progress<{
        message?: string;
        increment?: number;
    }>) {
        await serviceClient.send(deviceId, message.getData())
        .then(() => {
            status.newStatus(true);
            const succeeded = status.getSucceed();
            const failed = status.getFailed();
            const sum = status.sum();
            const total = status.getTotal();
            progress.report({
                message: `${succeeded} succeeded and ${failed} failed.`
            })
            if (sum == total) {
                this._outputChannel.show();
                this.outputLine(Constants.SimulatorSummaryLabel, `Sending ${total} message(s) done, with ${succeeded} succeeded and ${failed} failed.`);
                serviceClient.close();
            }
        })
    }

    private async sendC2DMessageByIdWithProgress(serviceClient: ServiceClient, deviceId: string, messageBody: string, status: SendStatus, progress: vscode.Progress<{
        message?: string;
        increment?: number;
    }>) {
        let message = new Message(messageBody);
        this.sendC2DMessageByIdCoreWithProgress(serviceClient, deviceId, message, status, progress);
    }

    private async delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms));
    }

    public async sendC2DMessageToMultipleDevicesRepeatedlyWithProgressBar(iotHubConnectionString: string, deviceIds: string[], message: string, times: number, interval: number) {
        await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: Constants.SimulatorSendingMessageProgressBarTitle,
			cancellable: true
		}, async (sendingProgress, sendingToken) => {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: Constants.SimulatorRecevingStatusProgressBarTitle,
                cancellable: false
            }, async (statusProgress) => {
                sendingToken.onCancellationRequested(() => {
                    vscode.window.showInformationMessage(Constants.SimulatorProgressBarCancelLog);
                })
                sendingProgress.report({ increment: 0});
                statusProgress.report({ increment: 0 });
                const total = deviceIds.length * times;
                const step = 100 / total;
                let status = new SendStatus(step, total);
                let count = 0;
                const serviceClient = ServiceClient.fromConnectionString(iotHubConnectionString);
                serviceClient.open((err) => {
                    if (err) {
                        this.outputLine(Constants.IoTHubC2DMessageLabel, err.message);
                    }
                });
                for (const deviceId of deviceIds) {
                    let i = 0;
                    for (i = 0; i < times; i++) {
                        if (sendingToken.isCancellationRequested) {
                            return;
                        }
                        this.sendC2DMessageByIdWithProgress(serviceClient, deviceId, message, status, statusProgress);
                        count++;
                        sendingProgress.report({
                            increment: step,
                            message: `Sending message(s) ${count} of ${total}`
                        })
                        await this.delay(interval);
                    }
                }
                while (status.sum() != total) {
                    await this.delay(1);
                }
            });
        });
    }

    private connectCallback(deviceConnectionString: string) {
        return (err) => {
            if (err) {
                this.outputLine(Constants.IoTHubC2DMessageMonitorLabel, err);
                TelemetryClient.sendEvent(Constants.IoTHubAIStartMonitorC2DEvent, { Result: "Exception", Message: err });
            } else {
                this.updateMonitorStatus(true);
                let deviceId = ConnectionString.parse(deviceConnectionString).DeviceId;
                this.outputLine(Constants.IoTHubC2DMessageMonitorLabel, `Start monitoring C2D message for [${deviceId}]...`);
                TelemetryClient.sendEvent(Constants.IoTHubAIStartMonitorC2DEvent);
                this._deviceClient.on("message", (msg) => {
                    this.outputLine(Constants.IoTHubC2DMessageMonitorLabel, "Message Received: " + msg.getData());
                    if (msg.properties && msg.properties.propertyList && msg.properties.propertyList.length > 0) {
                        this._outputChannel.appendLine("Properties:");
                        this._outputChannel.appendLine(JSON.stringify(msg.properties.propertyList, null, 2));
                    }
                    this._deviceClient.complete(msg, this.printResult);
                });
            }
        };
    }

    private printResult = (err, res) => {
        if (err) {
            this.outputLine(Constants.IoTHubC2DMessageMonitorLabel, "Error: " + err.toString());
        }
        if (res) {
            this.outputLine(Constants.IoTHubC2DMessageMonitorLabel, "Status: " + res.constructor.name);
        }
    }
}
