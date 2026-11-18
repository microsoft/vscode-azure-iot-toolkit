// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IotHubClient } from "@azure/arm-iothub";
import * as vscode from "vscode";
import { Constants } from "../../constants";
import { TelemetryClient } from "../../telemetryClient";
import { Utility } from "../../utility";
import { ensureLoggedIn, getCredential } from "../../azureAuth";
import { CommandNode } from "../CommandNode";
import { INode } from "../INode";
import { BuiltInEndpointLabelNode } from "./BuiltInEndpointLabelNode";
import { CustomEndpointLabelNode } from "./CustomEndpointLabelNode";
import { EventHubLabelNode } from "./EventHubLabelNode";
import { EventStreamLabelNode } from "./EventStreamLabelNode";

export class EndpointsLabelNode implements INode {
    constructor() {
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: "Endpoints",
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: "endpoints-label",
        };
    }

    public async getChildren(): Promise<INode[]> {
        TelemetryClient.sendEvent(Constants.IoTHubAILoadEndpointsTreeStartEvent);

        try {
            const subscriptionId = Constants.ExtensionContext.globalState.get<string>(Constants.StateKeySubsID);
            if (!subscriptionId || !(await ensureLoggedIn())) {
                return [this.getSelectIoTHubCommandNode()];
            }

            const credential = getCredential();
            const client = new IotHubClient(credential, subscriptionId);
            const iotHubIterator = client.iotHubResource.listBySubscription();
            let iothub = undefined;
            const targetId = Constants.ExtensionContext.globalState.get(Constants.StateKeyIoTHubID);
            for await (const element of iotHubIterator) {
                if (element.id === targetId) {
                    iothub = element;
                    break;
                }
            }
            TelemetryClient.sendEvent(Constants.IoTHubAILoadEndpointsTreeDoneEvent, { Result: "Success" });

            if (!iothub) {
                return [this.getSelectIoTHubCommandNode()];
            }

            return [new BuiltInEndpointLabelNode(),
                new EventHubLabelNode(credential, subscriptionId, iothub.properties.routing.endpoints.eventHubs),
                new CustomEndpointLabelNode("Service Bus queue", iothub.properties.routing.endpoints.serviceBusQueues),
                new CustomEndpointLabelNode("Service Bus topic", iothub.properties.routing.endpoints.serviceBusTopics),
                new CustomEndpointLabelNode("Blob storage", iothub.properties.routing.endpoints.storageContainers),
                new EventStreamLabelNode(iothub.properties.routing.endpoints.eventStreams)];
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            TelemetryClient.sendEvent(Constants.IoTHubAILoadEndpointsTreeDoneEvent, { Result: "Fail", [Constants.errorProperties.Message]: message });
            return Utility.getErrorMessageTreeItems("endpoints", message);
        }
    }

    private getSelectIoTHubCommandNode(): CommandNode {
        return new CommandNode("-> Please select an IoT Hub", "azure-iot-toolkit.selectIoTHub");
    }
}
