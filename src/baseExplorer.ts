"use strict";
import { Client as EventHubClient } from "azure-event-hubs";
import * as vscode from "vscode";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class BaseExplorer {
    protected _outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this._outputChannel = outputChannel;
    }

    protected output(label: string, message: string): void {
        this._outputChannel.append(`[${label}] ${message}`);
    }

    protected outputLine(label: string, message: string): void {
        this._outputChannel.appendLine(`[${label}] ${message}`);
    }

    protected printError(outputChannel: vscode.OutputChannel, label: string, eventHubClient: EventHubClient) {
        return (err) => {
            this.outputLine(label, err.message);
            if (eventHubClient) {
                eventHubClient.close();
            }
        };
    };

    protected printMessage(outputChannel: vscode.OutputChannel, label: string, prefix: string) {
        return (message) => {
            let config = Utility.getConfiguration();
            let showVerboseMessage = config.get<boolean>("showVerboseMessage");
            let result;
            if (showVerboseMessage) {
                result = {
                    body: message.body,
                    enqueuedTimeUtc: message.enqueuedTimeUtc,
                    offset: message.offset,
                    partitionKey: message.partitionKey,
                    properties: message.properties,
                    sequenceNumber: message.sequenceNumber,
                    systemProperties: message.systemProperties,
                };
                result.body = this.tryGetStringFromCharCode(message.body);
            } else {
                result = this.tryGetStringFromCharCode(message.body);
            }
            this.outputLine(label, prefix + ":");
            this._outputChannel.appendLine(JSON.stringify(result, null, 2));
        };
    };

    protected startMonitor(eventHubClient: EventHubClient, label: string, consumerGroup: string) {
        if (eventHubClient) {
            eventHubClient.open()
                .then(eventHubClient.getPartitionIds.bind(eventHubClient))
                .then((partitionIds: any) => {
                    return partitionIds.map((partitionId) => {
                        return eventHubClient.createReceiver(consumerGroup, partitionId, { startAfterTime: Date.now() })
                            .then((receiver) => {
                                this.outputLine(label, `Created partition receiver [${partitionId}] for consumerGroup [${consumerGroup}]`);
                                receiver.on("errorReceived", this.printError(this._outputChannel, label, eventHubClient));
                                receiver.on("message", this.printMessage(this._outputChannel, label, "Message Received"));
                            });
                    });
                });
        }
    }

    protected stopMonitor(eventHubClient: EventHubClient, label: string, aiEvent: string) {
        TelemetryClient.sendEvent(aiEvent);
        if (eventHubClient) {
            this.outputLine(label, "Stop monitoring ...");
            eventHubClient.close();
        } else {
            this.outputLine(label, "No monitor job running.");
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
