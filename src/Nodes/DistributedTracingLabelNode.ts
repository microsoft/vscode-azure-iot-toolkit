// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { TwinItem } from "../Model/TwinItem";
import { DeviceTwinPropertyType } from "../utility";
import { DeviceNode } from "./DeviceNode";
import { INode } from "./INode";
import { TwinNode } from "./TwinNode";

export class DistributedTracingLabelNode implements INode {
    private readonly label: string;
    constructor(public readonly deviceNode: DeviceNode) {
        this.label = "Distributed Tracing Setting (Preview)";
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            contextValue: "distributed-tracing-setting",
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        };
    }

    public getChildren(): INode[] {
        let moduleNodeList: INode[] = [];
        moduleNodeList.push(new TwinNode(new TwinItem("Desired", DeviceTwinPropertyType.Desired), this.deviceNode));
        moduleNodeList.push(new TwinNode(new TwinItem("Reported", DeviceTwinPropertyType.Reported), this.deviceNode));
        return moduleNodeList;
    }
}
