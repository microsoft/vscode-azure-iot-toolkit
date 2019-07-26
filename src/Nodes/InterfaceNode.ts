// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { InterfaceItem } from "../Model/InterfaceItem";
import { INode } from "./INode";

export class InterfaceNode implements INode {
    constructor(private name: string, private iconPath: string) {
    }

    public getTreeItem(): vscode.TreeItem {
        return new InterfaceItem(this.name, this.iconPath);
    }

    public getChildren(): INode[] {
        return [];
    }
}
