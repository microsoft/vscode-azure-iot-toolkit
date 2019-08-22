// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { QuickPickItem, TreeItem, TreeItemCollapsibleState } from "vscode";

export class DeviceItem extends TreeItem implements QuickPickItem {
    public readonly label: string;
    constructor(
        public readonly deviceId: string,
        public readonly connectionString: string,
        public iconPath: string,
        public readonly connectionState: string,
        public description: string) {
        super(deviceId);
        this.contextValue = "device";
        this.tooltip = this.connectionState;
        this.collapsibleState = TreeItemCollapsibleState.Collapsed;
    }
}
