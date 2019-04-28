// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { EventData, EventHubClient, EventPosition, MessagingError, OnError, OnMessage } from "@azure/event-hubs";
import EventHubManagementClient from "azure-arm-eventhub";
import * as vscode from "vscode";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { EventHubItem } from "./Model/EventHubItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class EventHubManager extends BaseExplorer {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public async startMonitorEventHubMMessage(eventHubItem: EventHubItem) {
        try {
            this._outputChannel.show();
            this.outputLine(Constants.EventHubMonitorLabel, `Start monitoring message arrived in Event Hub endpoint [${eventHubItem.eventHubProperty.name}] ...`);

            const eventHubClient = new EventHubManagementClient(eventHubItem.azureSubscription.session.credentials, eventHubItem.azureSubscription.subscription.subscriptionId);
            const connectionString = (await eventHubClient.namespaces.listKeys(eventHubItem.eventHubProperty.resourceGroup,
                this.getNamespacefromConnectionString(eventHubItem.eventHubProperty.connectionString), "RootManageSharedAccessKey")).primaryConnectionString;
            const client = EventHubClient.createFromConnectionString(connectionString, this.getEntityPathfromConnectionString(eventHubItem.eventHubProperty.connectionString));
            const partitionIds = await client.getPartitionIds();
            partitionIds.forEach((partitionId) => {
                this.outputLine(Constants.EventHubMonitorLabel, `Created partition receiver [${partitionId}]`);
                client.receive(partitionId, this.onMessage, this.onError, { eventPosition: EventPosition.fromEnqueuedTime(Date.now()) });
            });
        } catch (error) {
            vscode.window.showErrorMessage(error);
        }
    }

    private onMessage: OnMessage = (message: EventData) => {
        const result = Utility.getMessageFromEventData(message);
        const timeMessage = Utility.getTimeMessageFromEventData(message);
        this.outputLine(Constants.EventHubMonitorLabel, `${timeMessage}Message received:`);
        this._outputChannel.appendLine(JSON.stringify(result, null, 2));
    }

    private onError: OnError = (error: MessagingError | Error) => {
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
