// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { RoutingEventStreamProperties } from "@azure/arm-iothub";
import * as vscode from "vscode";
import { INode } from "../INode";

export class EventStreamItemNode implements INode {
    constructor(private eventStream: RoutingEventStreamProperties) {
    }

    public get name(): string {
        return this.eventStream.name;
    }

    public getTreeItem(): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(this.eventStream.name);
        treeItem.contextValue = "event-stream";
        treeItem.description = this.eventStream.entityPath;
        treeItem.tooltip = [
            `Endpoint URI: ${this.eventStream.endpointUri ?? ""}`,
            `Entity path: ${this.eventStream.entityPath ?? ""}`,
            `Workspace ID: ${this.eventStream.workspaceId ?? ""}`,
            `Event stream ID: ${this.eventStream.eventStreamId ?? ""}`,
            `Source ID: ${this.eventStream.sourceId ?? ""}`,
        ].join("\n");
        return treeItem;
    }

    public getChildren(): INode[] {
        return [];
    }
}
