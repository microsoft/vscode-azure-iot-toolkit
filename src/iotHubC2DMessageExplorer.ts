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

export class IotHubC2DMessageExplorer extends IoTHubMessageBaseExplorer {
    private _deviceClient: Client;

    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel, "$(primitive-square) Stop Receiving C2D Message", "azure-iot-toolkit.stopMonitorC2DMessage");
    }

    public async sendC2DMessage(deviceItem?: DeviceItem) {
        const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
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
            this.outputLine(Constants.IoTHubC2DMessageMonitorLabel, "There is a running job to receive C2D message. Please stop it first.");
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
            this.outputLine(Constants.IoTHubC2DMessageMonitorLabel, "C2D receiving stopped.");
            this._monitorStatusBarItem.hide();
            this._deviceClient.close(() => { this.updateMonitorStatus(false); });
        } else {
            this.outputLine(Constants.IoTHubC2DMessageMonitorLabel, "No C2D monitor job running.");
        }
    }

    private sendC2DMessageById(iotHubConnectionString: string, deviceId: string): void {
        vscode.window.showInputBox({ prompt: `Enter message to send to device` }).then((messageBody) => {
            if (messageBody !== undefined) {
                const serviceClient = ServiceClient.fromConnectionString(iotHubConnectionString);
                this._outputChannel.show();
                serviceClient.open((err) => {
                    if (err) {
                        this.outputLine(Constants.IoTHubC2DMessageLabel, err.message);
                    } else {
                        const message = new Message(messageBody);
                        serviceClient.send(deviceId, message.getData(),
                            this.sendEventDone(serviceClient, Constants.IoTHubC2DMessageLabel, deviceId, Constants.IoTHubAIC2DMessageDoneEvent));
                    }
                });
            }
        });
    }

    private connectCallback(deviceConnectionString: string) {
        return (err) => {
            if (err) {
                this.outputLine(Constants.IoTHubC2DMessageMonitorLabel, err);
                TelemetryClient.sendEvent(Constants.IoTHubAIStartMonitorC2DEvent, { Result: "Exception", [Constants.errorProperties.Message]: err });
            } else {
                this.updateMonitorStatus(true);
                const deviceId = ConnectionString.parse(deviceConnectionString).DeviceId;
                this.outputLine(Constants.IoTHubC2DMessageMonitorLabel, `Start receiving C2D message for [${deviceId}]...`);
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
