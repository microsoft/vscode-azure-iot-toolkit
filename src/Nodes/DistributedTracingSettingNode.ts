// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { DeviceNode } from "./DeviceNode";
import { INode } from "./INode";

export class DistributedTracingSettingNode implements INode {
    constructor(
        private readonly label: string,
        public readonly parent: INode,
        private readonly contextValue: string,
        public readonly deviceNode: DeviceNode) {
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            contextValue: this.contextValue,
        };
    }

    public getChildren(): INode[] {
        return [];
    }
}
