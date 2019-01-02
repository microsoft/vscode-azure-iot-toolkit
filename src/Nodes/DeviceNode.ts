// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { DeviceItem } from "../Model/DeviceItem";
import { DistributedTracingLabelNode } from "./DistributedTracingLabelNode";
import { INode } from "./INode";
import { ModuleNode } from "./ModuleNode";

export class DeviceNode implements INode {
    public readonly deviceId: string;
    constructor(public deviceItem: DeviceItem) {
        this.deviceId = deviceItem.deviceId;
    }

    public getTreeItem(): vscode.TreeItem {
        return this.deviceItem;
    }

    public async getChildren(): Promise<INode[]> {
        let moduleNodeList: INode[] = [];
        moduleNodeList.push(new ModuleNode(this));
        if (this.deviceItem.contextValue === "device") {
            moduleNodeList.push(new DistributedTracingLabelNode(this));
        }
        return moduleNodeList;
    }
}
