// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { RouteProperties } from "@azure/arm-iothub";
import * as vscode from "vscode";
import { INode } from "../INode";

export class RouteItemNode implements INode {
    constructor(private route: RouteProperties) {
    }

    public get name(): string {
        return this.route.name;
    }

    public getTreeItem(): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(this.route.name);
        const endpoints = (this.route.endpointNames ?? []).join(", ");
        const disabled = this.route.isEnabled === false;

        treeItem.contextValue = "message-route";
        treeItem.description = `${this.route.source} -> ${endpoints}${disabled ? " (disabled)" : ""}`;
        treeItem.iconPath = new vscode.ThemeIcon(disabled ? "circle-slash" : "arrow-right");
        treeItem.tooltip = [
            `Source: ${this.route.source ?? ""}`,
            `Endpoints: ${endpoints}`,
            `Condition: ${this.route.condition ?? "true"}`,
            `Enabled: ${!disabled}`,
        ].join("\n");
        return treeItem;
    }

    public getChildren(): INode[] {
        return [];
    }
}
