// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { ModuleItem } from "../Model/ModuleItem";
import { INode } from "./INode";
import { ModuleLabelNode } from "./ModuleLabelNode";

export class ModuleItemNode implements INode {
    constructor(
        public readonly moduleItem: ModuleItem,
        public readonly moduleLabelNode: ModuleLabelNode) {
    }

    public getTreeItem(): vscode.TreeItem {
        return this.moduleItem;
    }

    public getChildren(): INode[] {
        return [];
    }
}
