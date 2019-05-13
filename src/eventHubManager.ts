// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { EventData, EventHubClient, EventPosition, MessagingError, OnError, OnMessage } from "@azure/event-hubs";
import EventHubManagementClient from "azure-arm-eventhub";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { IoTHubMessageBaseExplorer } from "./iotHubMessageBaseExplorer";
import { EventHubItem } from "./Model/EventHubItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class EventHubManager extends IoTHubMessageBaseExplorer {
    private _eventHubClient: EventHubClient;

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

            const eventHubClient = new EventHubManagementClient(eventHubItem.azureSubscription.session.credentials, eventHubItem.azureSubscription.subscription.subscriptionId);
            const connectionString = (await eventHubClient.namespaces.listKeys(eventHubItem.eventHubProperty.resourceGroup,
                this.getNamespacefromConnectionString(eventHubItem.eventHubProperty.connectionString), "RootManageSharedAccessKey")).primaryConnectionString;
            this._eventHubClient = EventHubClient.createFromConnectionString(connectionString, this.getEntityPathfromConnectionString(eventHubItem.eventHubProperty.connectionString));
            const partitionIds = await this._eventHubClient.getPartitionIds();
            this.updateMonitorStatus(true);
            partitionIds.forEach((partitionId) => {
                this.outputLine(Constants.EventHubMonitorLabel, `Created partition receiver [${partitionId}]`);
                this._eventHubClient.receive(partitionId, this.onMessage, this.onError, { eventPosition: EventPosition.fromEnqueuedTime(Date.now()) });
            });
        } catch (error) {
            this.updateMonitorStatus(false);
            this.outputLine(Constants.EventHubMonitorLabel, error);
            TelemetryClient.sendEvent(Constants.IoTHubAIEHStartMonitorEvent, { Result: "Exception", Message: error });
        }
    }

    public async stopMonitorCustomEventHubEndpoint() {
        this.stopMonitorEventHubEndpoint(Constants.EventHubMonitorLabel, Constants.IoTHubAIEHStopMonitorEvent, this._eventHubClient, "custom Event Hub endpoint");
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
