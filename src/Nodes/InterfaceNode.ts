// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { InterfaceItem } from "../Model/InterfaceItem";
import { INode } from "./INode";

export class InterfaceNode implements INode {
    constructor(public interfaceItem: InterfaceItem) {
    }

    public getTreeItem(): vscode.TreeItem {
        return this.interfaceItem;
    }

    public getChildren(): INode[] {
        return [];
    }
}
