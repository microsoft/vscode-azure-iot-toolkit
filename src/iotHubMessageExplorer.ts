"use strict";
import { Client as EventHubClient } from "azure-event-hubs";
import { Client, Message } from "azure-iot-device";
import { clientFromConnectionString } from "azure-iot-device-mqtt";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { Utility } from "./utility";

export class IoTHubMessageExplorer extends BaseExplorer {
    private _eventHubClient;

    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public sendD2CMessage(): void {
        let deviceConnectionString = Utility.getConfig(Constants.DeviceConnectionStringKey, Constants.DeviceConnectionStringTitle);
        if (!deviceConnectionString) {
            return;
        }

        vscode.window.showInputBox({ prompt: `Enter message to send to ${Constants.IoTHub}` }).then((message: string) => {
            if (message !== undefined) {
                this._outputChannel.show();
                try {
                    let client = clientFromConnectionString(deviceConnectionString);
                    client.sendEvent(new Message(JSON.stringify(message)),
                        this.sendEventDone(client, Constants.IoTHubMessageLabel, Constants.IoTHub, Constants.IoTHubAIMessageEvent));
                } catch (e) {
                    this.outputLine(Constants.IoTHubMessageLabel, e);
                }
            }
        });
    }

    public startMonitorIoTHubMessage(): void {
        let iotHubConnectionString = Utility.getConfig(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }
        let config = Utility.getConfiguration();
        let consumerGroup = config.get<string>(Constants.IoTHubConsumerGroup);

        try {
            this._eventHubClient = EventHubClient.fromConnectionString(iotHubConnectionString);
            this._outputChannel.show();
            this.outputLine(Constants.IoTHubMonitorLabel, `Start monitoring ${Constants.IoTHub} ...`);
            AppInsightsClient.sendEvent(Constants.IoTHubAIStartMonitorEvent);
            this.startMonitor(this._eventHubClient, Constants.IoTHubMonitorLabel, consumerGroup);
        } catch (e) {
            this.outputLine(Constants.IoTHubMonitorLabel, e);
            AppInsightsClient.sendEvent(Constants.IoTHubAIStartMonitorEvent, { Result: "Exception", Message: e });
        }
    }

    public stopMonitorIoTHubMessage(): void {
        this.stopMonoitor(this._eventHubClient, Constants.IoTHubMonitorLabel, Constants.IoTHubAIStopMonitorEvent);
        this._eventHubClient = null;
    }
}
