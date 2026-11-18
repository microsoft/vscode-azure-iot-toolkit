// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { TreeItem, TreeItemCollapsibleState } from "vscode";

export class DeviceItem extends TreeItem {
    public readonly label: string;
    constructor(
        public readonly deviceId: string,
        public connectionString: string,
        public iconPath: string | vscode.Uri | { light: vscode.Uri; dark: vscode.Uri },
        public readonly connectionState: string,
        public description: string) {
        super(deviceId);
        this.contextValue = "device";
        this.tooltip = this.connectionState;
        this.collapsibleState = TreeItemCollapsibleState.Collapsed;
    }
}
