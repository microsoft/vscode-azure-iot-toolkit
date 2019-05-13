// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { INode } from "../INode";

export class BuiltInEndpointItemNode implements INode {
    constructor() {
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: "events",
            contextValue: "events",
        };
    }

    public getChildren(): INode[] {
        return [];
    }
}
