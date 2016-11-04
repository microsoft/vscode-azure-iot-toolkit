'use strict';
import * as vscode from 'vscode';
import { Utility } from './utility';
import { clientFromConnectionString } from 'azure-iot-device-http';
import { Message, Client } from 'azure-iot-device';
import { AppInsightsClient } from './appInsightsClient';
import { BaseExplorer } from './baseExplorer'
let EventHubClient = require('azure-event-hubs').Client;


export class MessageExplorer extends BaseExplorer {
    private _eventHubClient;

    constructor(outputChannel: vscode.OutputChannel, appInsightsClient: AppInsightsClient) {
        super(outputChannel, appInsightsClient);
    }

    public sendD2CMessage(): void {
        let label = 'D2CMessage';
        let deviceConnectionString = Utility.getConnectionString('deviceConnectionString', 'Device Connection String');
        if (!deviceConnectionString) {
            return;
        }

        vscode.window.showInputBox({ prompt: 'Enter message to send' }).then((message: string) => {
            if (message !== undefined) {
                try {
                    let client = clientFromConnectionString(deviceConnectionString);
                    client.sendEvent(new Message(JSON.stringify(message)), this.sendEventDone(true, client, label));
                }
                catch (e) {
                    this.output(label, e);
                }
            }
        });
    }

    public startMonitoringMessage(): void {
        let label = 'Monitor';
        let iotHubConnectionString = Utility.getConnectionString('iotHubConnectionString', 'IoT Hub Connection String');
        if (!iotHubConnectionString) {
            return;
        }
        let config = Utility.getConfiguration();
        let consumerGroup = config.get<string>('consumerGroup');

        try {
            this._eventHubClient = EventHubClient.fromConnectionString(iotHubConnectionString);
            this._outputChannel.show();
            this.output(label, 'Start monitoring...');
            this._appInsightsClient.sendEvent('D2C.startMonitoring')
            this._eventHubClient.open()
                .then(this._eventHubClient.getPartitionIds.bind(this._eventHubClient))
                .then((partitionIds) => {
                    return partitionIds.map((partitionId) => {
                        return this._eventHubClient.createReceiver(consumerGroup, partitionId, { 'startAfterTime': Date.now() }).then((receiver) => {
                            this.output(label, `Created partition receiver [${partitionId}] for consumerGroup [${consumerGroup}]`);
                            receiver.on('errorReceived', this.printError(this._outputChannel, label, this._eventHubClient));
                            receiver.on('message', this.printMessage(this._outputChannel, label));
                        });
                    });
                })
                .catch(this.printError(this._outputChannel, label, this._eventHubClient));
        }
        catch (e) {
            this.output(label, e);
        }
    }

    public stopMonitoringMessage(): void {
        if (this._eventHubClient) {
            this.output('Monitor', 'Stop monitoring...');
            this._appInsightsClient.sendEvent('D2C.stopMonitoring')
            this._eventHubClient.close();
        }
    }

    private sendEventDone(close: boolean, client: Client, label: string) {
        this._outputChannel.show();
        this.output(label, 'Sending message to IoT Hub...');

        return (err, result) => {
            if (err) {
                this.output(label, 'Failed to send message to IoT Hub');
                this.output(label, err.toString());
                this._appInsightsClient.sendEvent('D2C.Send', { Result: 'Fail' })
            }
            if (result) {
                this.output(label, '[Success] Message sent to IoT Hub');
                this._appInsightsClient.sendEvent('D2C.Send', { Result: 'Success' })
            }
            if (close) {
                client.close((err, result) => { console.log('client close') });
            }
        };
    }

    private printError(outputChannel: vscode.OutputChannel, label: string, eventHubClient) {
        return (err) => {
            this.output(label, err.message);
            this.output(label, 'Stop monitoring...');
            if (eventHubClient) {
                eventHubClient.close();
            }
        };
    };

    private printMessage(outputChannel: vscode.OutputChannel, label: string) {
        return (message) => {
            this.output(label, 'Message received: ');
            this.output(label, JSON.stringify(message.body));
        };
    };
}