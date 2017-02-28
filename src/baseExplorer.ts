'use strict';
import * as vscode from 'vscode';
import { Utility } from './utility';
import { AppInsightsClient } from './appInsightsClient';
import { Client as EventHubClient } from 'azure-event-hubs';

export class BaseExplorer {
    protected _outputChannel: vscode.OutputChannel;
    protected _appInsightsClient: AppInsightsClient;

    constructor(outputChannel: vscode.OutputChannel, appInsightsClient: AppInsightsClient) {
        this._outputChannel = outputChannel;
        this._appInsightsClient = appInsightsClient;
    }

    output(label: string, message: string): void {
        this._outputChannel.append(`[${label}] ${message}`);
    }

    outputLine(label: string, message: string): void {
        this._outputChannel.appendLine(`[${label}] ${message}`);
    }

    printError(outputChannel: vscode.OutputChannel, label: string, eventHubClient: EventHubClient) {
        return (err) => {
            this.outputLine(label, err.message);
            if (eventHubClient) {
                eventHubClient.close();
            }
        };
    };

    printMessage(outputChannel: vscode.OutputChannel, label: string, prefix: string) {
        return (message) => {
            let config = Utility.getConfiguration();
            let showVerboseMessage = config.get<boolean>('showVerboseMessage');
            let result;
            if (showVerboseMessage) {
                result = {
                    'partitionKey': message.partitionKey,
                    'body': message.body,
                    'enqueuedTimeUtc': message.enqueuedTimeUtc,
                    'offset': message.offset,
                    'properties': message.properties,
                    'sequenceNumber': message.sequenceNumber,
                    'systemProperties': message.systemProperties
                };
                result.body = this.tryGetStringFromCharCode(message.body);
            } else {
                result = this.tryGetStringFromCharCode(message.body);
            }
            this.outputLine(label, prefix + ':');
            this._outputChannel.appendLine(JSON.stringify(result, null, 2));
        };
    };

    tryGetStringFromCharCode(source) {
        if (source instanceof Uint8Array) {
            try {
                source = String.fromCharCode.apply(null, source)
            }
            catch (e) {
            }
        }
        return source;
    }

    startMonitor(eventHubClient: EventHubClient, label: string, consumerGroup: string) {
        if (eventHubClient) {
            eventHubClient.open()
                .then(eventHubClient.getPartitionIds.bind(eventHubClient))
                .then((partitionIds) => {
                    return partitionIds.map((partitionId) => {
                        return eventHubClient.createReceiver(consumerGroup, partitionId, { 'startAfterTime': Date.now() }).then((receiver) => {
                            this.outputLine(label, `Created partition receiver [${partitionId}] for consumerGroup [${consumerGroup}]`);
                            receiver.on('errorReceived', this.printError(this._outputChannel, label, eventHubClient));
                            receiver.on('message', this.printMessage(this._outputChannel, label, 'Message Received'));
                        });
                    });
                });
        }
    }

    stopMonoitor(eventHubClient: EventHubClient, label: string, aiEvent: string) {
        if (eventHubClient) {
            this.outputLine(label, 'Stop monitoring ...');
            this._appInsightsClient.sendEvent(aiEvent);
            eventHubClient.close();
        }
        else {
            this.outputLine(label, 'No monitor job running.')
        }
    }
}