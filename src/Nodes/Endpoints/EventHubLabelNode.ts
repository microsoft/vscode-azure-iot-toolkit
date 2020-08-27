// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IotHubModels } from "@azure/arm-iothub";
import * as vscode from "vscode";
import { AzureSubscription } from "../../azure-account.api";
import { EventHubItem } from "../../Model/EventHubItem";
import { INode } from "../INode";
import { EventHubItemNode } from "./EventHubItemNode";

export class EventHubLabelNode implements INode {
    constructor(private azureSubscription: AzureSubscription, private eventHubProperties: IotHubModels.RoutingEventHubProperties[]) {
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: "Event Hubs",
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: "event-hub-label",
        };
    }

    public getChildren(): INode[] {
        return this.eventHubProperties.map((eventHubProperty) => new EventHubItemNode(new EventHubItem(this.azureSubscription, eventHubProperty)));
    }
}
