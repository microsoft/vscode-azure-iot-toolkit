// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Utility } from "../utility";
import { TreeUtils } from "../Utility/treeUtils";
import { INode } from "./INode";

export class IoTHubLabelNode implements INode {
    constructor(private iotHubConnectionString: string) {
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: Utility.getIoTHubName(this.iotHubConnectionString),
            contextValue: "iothub-label",
            iconPath: TreeUtils.getThemedIconPath("iothub"),
        };
    }

    public async getChildren(): Promise<INode[]> {
        return [];
    }
}
