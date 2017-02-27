'use strict';
import * as vscode from 'vscode';
import { AppInsightsClient } from './appInsightsClient';
import { BaseExplorer } from './baseExplorer';
import { Client as EventHubClient } from 'azure-event-hubs';
import { clientFromConnectionString } from 'azure-iot-device-http';
import { Constants } from './constants';
import { Message, Client } from 'azure-iot-device';
import { Utility } from './utility';

export class IoTHubMessageExplorer extends BaseExplorer {
    private _eventHubClient;

    constructor(outputChannel: vscode.OutputChannel, appInsightsClient: AppInsightsClient) {
        super(outputChannel, appInsightsClient);
    }

    public sendD2CMessage(): void {
        let deviceConnectionString = Utility.getConfig(Constants.DeviceConnectionStringKey, Constants.DeviceConnectionStringTitle);
        if (!deviceConnectionString) {
            return;
        }

        vscode.window.showInputBox({ prompt: `Enter message to send to ${Constants.IoTHub}` }).then((message: string) => {
            if (message !== undefined) {
                try {
                    let client = clientFromConnectionString(deviceConnectionString);
                    client.sendEvent(new Message(JSON.stringify(message)), this.sendEventDone(client, Constants.IoTHubMessageLabel));
                }
                catch (e) {
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
            this._appInsightsClient.sendEvent(Constants.IoTHubAIStartMonitorEvent);
            this.startMonitor(this._eventHubClient, Constants.IoTHubMonitorLabel, consumerGroup);
        }
        catch (e) {
            this.outputLine(Constants.IoTHubMonitorLabel, e);
            this._appInsightsClient.sendEvent(Constants.IoTHubAIStartMonitorEvent, { Result: 'Exception', Message: e })
        }
    }

    public stopMonitorIoTHubMessage(): void {
        this.stopMonoitor(this._eventHubClient, Constants.IoTHubMonitorLabel, Constants.IoTHubAIStopMonitorEvent);
        this._eventHubClient = null;
    }

    private sendEventDone(client: Client, label: string) {
        this._outputChannel.show();
        this.outputLine(label, `Sending message to ${Constants.IoTHub} ...`);

        return (err, result) => {
            if (err) {
                this.outputLine(label, `Failed to send message to ${Constants.IoTHub}`);
                this.outputLine(label, err.toString());
                this._appInsightsClient.sendEvent(Constants.IoTHubAIMessageEvent, { Result: 'Fail' })
            }
            if (result) {
                this.outputLine(label, `[Success] Message sent to ${Constants.IoTHub}`);
                this._appInsightsClient.sendEvent(Constants.IoTHubAIMessageEvent, { Result: 'Success' })
            }
            client.close((err, result) => { console.log('client close') });
        };
    }
}