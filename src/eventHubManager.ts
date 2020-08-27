// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ReceivedEventData, EventHubConsumerClient, MessagingError } from "@azure/event-hubs";
import { EventHubManagementClient } from "@azure/arm-eventhub";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { IoTHubMessageBaseExplorer } from "./iotHubMessageBaseExplorer";
import { EventHubItem } from "./Model/EventHubItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";
import { createAzureClient } from "vscode-azureextensionui";

export class EventHubManager extends IoTHubMessageBaseExplorer {
    private _eventHubClient: EventHubConsumerClient;

    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel, "$(primitive-square) Stop Monitoring Custom Event Hub Endpoint", "azure-iot-toolkit.stopMonitorCustomEventHubEndpoint");
    }

    public async startMonitorCustomEventHubEndpoint(eventHubItem: EventHubItem) {
        if (this._isMonitoring) {
            this._outputChannel.show();
            this.outputLine(Constants.IoTHubMonitorLabel, "There is a running job to monitor custom Event Hub endpoint. Please stop it first.");
            return;
        }

        try {
            TelemetryClient.sendEvent(Constants.IoTHubAIEHStartMonitorEvent);
            this._outputChannel.show();
            this.outputLine(Constants.EventHubMonitorLabel, `Start monitoring message arrived in custom Event Hub endpoint [${eventHubItem.eventHubProperty.name}] ...`);

            const eventHubClient = createAzureClient({
                credentials: eventHubItem.azureSubscription.session.credentials2,
                environment: eventHubItem.azureSubscription.session.environment,
                subscriptionId: eventHubItem.azureSubscription.subscription.subscriptionId
            }, EventHubManagementClient);

            const connectionString = (await eventHubClient.namespaces.listKeys(eventHubItem.eventHubProperty.resourceGroup,
                this.getNamespacefromConnectionString(eventHubItem.eventHubProperty.connectionString), "RootManageSharedAccessKey")).primaryConnectionString;
            this._eventHubClient = new EventHubConsumerClient("$Default", connectionString, this.getEntityPathfromConnectionString(eventHubItem.eventHubProperty.connectionString));
            const partitionIds = await this._eventHubClient.getPartitionIds();
            this.updateMonitorStatus(true);
            partitionIds.forEach((partitionId) => {
                this.outputLine(Constants.EventHubMonitorLabel, `Created partition receiver [${partitionId}]`);
                this._eventHubClient.subscribe(partitionId,
                    {
                        processEvents: this.onMessage,
                        processError: this.onError
                    },
                    {
                        startPosition: {enqueuedOn: Date.now()}
                    }
                );
            });
        } catch (error) {
            this.updateMonitorStatus(false);
            this.outputLine(Constants.EventHubMonitorLabel, error);
            TelemetryClient.sendEvent(Constants.IoTHubAIEHStartMonitorEvent, { Result: "Exception", [Constants.errorProperties.Message]: error });
        }
    }

    public async stopMonitorCustomEventHubEndpoint() {
        this.stopMonitorEventHubEndpoint(Constants.EventHubMonitorLabel, Constants.IoTHubAIEHStopMonitorEvent, this._eventHubClient, "custom Event Hub endpoint");
    }

    private onMessage = async (messages: ReceivedEventData[]) => {
        messages.forEach(message => {

            const result = Utility.getMessageFromEventData(message);
            const timeMessage = Utility.getTimeMessageFromEventData(message);
            this.outputLine(Constants.EventHubMonitorLabel, `${timeMessage}Message received:`);
            this._outputChannel.appendLine(JSON.stringify(result, null, 2));
        });
    }

    private onError = async (error: MessagingError | Error) => {
        this.outputLine(Constants.EventHubMonitorLabel, error.message);
    }

    private getNamespacefromConnectionString(connectionString: string): string {
        const result = /^Endpoint=sb:\/\/([^.]+)\./.exec(connectionString);
        return result ? result[1] : "";
    }

    private getEntityPathfromConnectionString(connectionString: string): string {
        const result = /EntityPath=(.+)$/.exec(connectionString);
        return result ? result[1] : "";
    }
}
