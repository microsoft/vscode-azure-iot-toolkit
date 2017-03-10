"use strict";
import { Client as EventHubClient, Sender as EventHubSender } from "azure-event-hubs";
import { Client, Message } from "azure-iot-device";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { Utility } from "./utility";

export class EventHubMessageExplorer extends BaseExplorer {
    private _eventHubClient;

    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public sendMessageToEventHub(): void {
        let eventHubConnectionString = Utility.getConfig(Constants.EventHubConnectionstringKey, Constants.EventHubConnectionStringTitle);
        let eventHubPath = Utility.getConfig(Constants.EventHubPathKey, Constants.EventHubPathTitle);
        if (!eventHubConnectionString || !eventHubPath) {
            return;
        }
        vscode.window.showInputBox({ prompt: `Enter message to send to ${Constants.EventHub}` }).then((message: string) => {
            if (message !== undefined) {
                let client = EventHubClient.fromConnectionString(eventHubConnectionString, eventHubPath);
                try {
                    let receiveAfterTime = Date.now() - 5000;
                    this._outputChannel.show();
                    this.outputLine(Constants.EventHubMessageLabel, `Sending message to ${Constants.EventHub} ...`);
                    client.open()
                        .then(client.getPartitionIds.bind(client))
                        .then(() => client.createSender())
                        .then((sender: EventHubSender) => { return sender.send(message); })
                        .then(this.sendToEventHubDone(client));
                } catch (e) {
                    this.sendToEventHubFail(client, e);
                }
            }
        });
    }

    public startMonitorEventHubMessage(): void {
        let eventHubConnectionString = Utility.getConfig(Constants.EventHubConnectionstringKey, Constants.EventHubConnectionStringTitle);
        let eventHubPath = Utility.getConfig(Constants.EventHubPathKey, Constants.EventHubPathTitle);
        if (!eventHubConnectionString || !eventHubPath) {
            return;
        }
        let config = Utility.getConfiguration();
        let consumerGroup = config.get<string>(Constants.EventHubConsumerGroup);
        try {
            this._eventHubClient = EventHubClient.fromConnectionString(eventHubConnectionString, eventHubPath);
            let receiveAfterTime = Date.now() - 5000;
            this._outputChannel.show();
            this.outputLine(Constants.EventHubMonitorLabel, `Start monitoring ${Constants.EventHub} ...`);
            AppInsightsClient.sendEvent(Constants.EventHubAIStartMonitorEvent);
            this.startMonitor(this._eventHubClient, Constants.EventHubMonitorLabel, consumerGroup);
        } catch (e) {
            this.outputLine(Constants.EventHubMonitorLabel, e);
            AppInsightsClient.sendEvent(Constants.EventHubAIStartMonitorEvent, { Result: "Exception", Message: e });
        }
    }

    public stopMonitorEventHubMessage(): void {
        this.stopMonoitor(this._eventHubClient, Constants.EventHubMonitorLabel, Constants.EventHubAIStopMonitorEvent);
        this._eventHubClient = null;
    }

    private sendToEventHubFail(client: EventHubClient, err) {
        this.outputLine(Constants.EventHubMessageLabel, `Failed to send message to ${Constants.EventHub}`);
        this.outputLine(Constants.EventHubMessageLabel, err.toString());
        AppInsightsClient.sendEvent(Constants.EventHubAIMessageEvent, { Result: "Fail" });
        client.close();
    }

    private sendToEventHubDone(client: EventHubClient) {
        return () => {
            this.outputLine(Constants.EventHubMessageLabel, `[Success] Message sent to ${Constants.EventHub}`);
            AppInsightsClient.sendEvent(Constants.EventHubAIMessageEvent, { Result: "Success" });
            client.close();
        };
    }
}
