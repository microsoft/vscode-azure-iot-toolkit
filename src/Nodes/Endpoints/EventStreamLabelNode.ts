// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { RoutingEventStreamProperties } from "@azure/arm-iothub";
import * as vscode from "vscode";
import { CommandNode } from "../CommandNode";
import { INode } from "../INode";
import { EventStreamItemNode } from "./EventStreamItemNode";

export class EventStreamLabelNode implements INode {
    constructor(private eventStreams: RoutingEventStreamProperties[]) {
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: "Event Streams (Preview)",
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: "event-stream-label",
        };
    }

    public getChildren(): INode[] {
        if (!this.eventStreams || this.eventStreams.length === 0) {
            return [new CommandNode("-> Create an endpoint", "azure-iot-hub.createFabricEventStreamEndpoint")];
        }
        return this.eventStreams.map((eventStream) => new EventStreamItemNode(eventStream));
    }
}
