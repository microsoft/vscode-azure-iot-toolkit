// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { DeviceItem } from "../Model/DeviceItem";
import { DistributedTracingLabelNode } from "./DistributedTracingLabelNode";
import { INode } from "./INode";
import { ModuleLabelNode } from "./ModuleLabelNode";

export class DeviceNode implements INode {
    public readonly deviceId: string;
    constructor(public deviceItem: DeviceItem) {
        this.deviceId = deviceItem.deviceId;
    }

    public getTreeItem(): vscode.TreeItem {
        return this.deviceItem;
    }

    public async getChildren(): Promise<INode[]> {
        let nodeList: INode[] = [];
        nodeList.push(new ModuleLabelNode(this));
        if (this.deviceItem.contextValue === "device") {
            nodeList.push(new DistributedTracingLabelNode(this));
        }
        return nodeList;
    }
}
