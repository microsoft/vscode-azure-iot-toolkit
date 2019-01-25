// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { TreeItem, TreeItemCollapsibleState } from "vscode";
import { DeviceTwinPropertyType } from "../constants";

export class TwinItem extends TreeItem {
    constructor(
        public readonly propertyLabel: string,
        public readonly type: DeviceTwinPropertyType) {
        super(propertyLabel);
        this.type = type;
        this.contextValue = type + "-distributed-twin-properies";
        this.collapsibleState = TreeItemCollapsibleState.Expanded;
    }
}
