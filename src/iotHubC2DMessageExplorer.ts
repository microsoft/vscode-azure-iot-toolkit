"use strict";
import { Client, ConnectionString, Message } from "azure-iot-device";
import { clientFromConnectionString } from "azure-iot-device-mqtt";
import { Client as ServiceClient } from "azure-iothub";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { Utility } from "./utility";

export class IotHubC2DMessageExplorer extends BaseExplorer {
    private _deviceClient: Client;

    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public sendC2DMessage(): void {
        let iotHubConnectionString = Utility.getConfig(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        let config = Utility.getConfiguration();
        let deviceConnectionString = config.get<string>(Constants.DeviceConnectionStringKey);
        let defaultDeviceId = deviceConnectionString.startsWith("<<insert") ? null : ConnectionString.parse(deviceConnectionString).DeviceId;

        vscode.window.showInputBox({ prompt: `Enter deviceId to send message`, value: defaultDeviceId }).then((deviceId: string) => {
            if (deviceId !== undefined) {
                vscode.window.showInputBox({ prompt: `Enter message to send to device` }).then((messageBody) => {
                    if (messageBody !== undefined) {
                        let serviceClient = ServiceClient.fromConnectionString(iotHubConnectionString);
                        this._outputChannel.show();
                        serviceClient.open((err) => {
                            if (err) {
                                this.outputLine(Constants.IoTHubC2DMessageLabel, err.message);
                            } else {
                                let message = new Message(messageBody);
                                serviceClient.send(deviceId, message,
                                    this.sendEventDone(serviceClient, Constants.IoTHubC2DMessageLabel, deviceId, Constants.IoTHubAIC2DMessageEvent));
                            }
                        });
                    }
                });
            }
        });
    }

    public startMonitorC2DMessage(): void {
        let deviceConnectionString = Utility.getConfig(Constants.DeviceConnectionStringKey, Constants.DeviceConnectionStringTitle);
        if (!deviceConnectionString) {
            return;
        }
        this._outputChannel.show();
        this._deviceClient = clientFromConnectionString(deviceConnectionString);
        this._deviceClient.open(this.connectCallback);
    }

    public stopMonitorC2DMessage(): void {
        AppInsightsClient.sendEvent(Constants.IoTHubAIStopMonitorC2DEvent);
        if (this._deviceClient) {
            this.outputLine(Constants.IoTHubC2DMessageMonitorLabel, "Stop monitoring ...");
            this._deviceClient.close(() => { return; });
            this._deviceClient = null;
        } else {
            this.outputLine(Constants.IoTHubC2DMessageMonitorLabel, "No monitor job running.");
        }
    }

    private connectCallback = (err) => {
        if (err) {
            this.outputLine(Constants.IoTHubC2DMessageMonitorLabel, err);
            AppInsightsClient.sendEvent(Constants.IoTHubAIStartMonitorC2DEvent, { Result: "Exception", Message: err });
        } else {
            this.outputLine(Constants.IoTHubC2DMessageMonitorLabel, "Start monitoring C2D message ...");
            AppInsightsClient.sendEvent(Constants.IoTHubAIStartMonitorC2DEvent);
            this._deviceClient.on("message", (msg) => {
                this.outputLine(Constants.IoTHubC2DMessageMonitorLabel, "Message Received: " + msg.getData());
                this._deviceClient.complete(msg, this.printResult);
            });
        }
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
