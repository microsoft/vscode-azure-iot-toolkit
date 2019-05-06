// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { INode } from "../INode";
import { CustomEndpointItemNode } from "./CustomEndpointItemNode";

export class CustomEndpointLabelNode implements INode {
    constructor(private label: string, private properties: any[]) {
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: "custom-endpoint-label",
        };
    }

    public getChildren(): INode[] {
        return this.properties.map((property) => new CustomEndpointItemNode(property.name));
    }
}
