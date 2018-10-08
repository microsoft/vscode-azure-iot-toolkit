// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { TreeItem } from "vscode";
import { DeviceItem } from "./DeviceItem";

export class ModuleItem extends TreeItem {
    public readonly deviceId: string;
    constructor(
        public readonly deviceItem: DeviceItem,
        public readonly moduleId: string,
        public readonly connectionString: string,
        public readonly runtimeStatus: string,
        public readonly iconPath: string,
        public readonly contextValue: string) {
        super(runtimeStatus ? `${moduleId} (${runtimeStatus})` : moduleId);
        this.deviceId = deviceItem.deviceId;
        this.command = {
            command: "azure-iot-toolkit.getModule",
            title: "",
            arguments: [this],
        };
    }
}
