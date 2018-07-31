// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Command, TreeItem } from "vscode";

export class ModuleItem extends TreeItem {
    constructor(
        public readonly deviceId: string,
        public readonly moduleId: string,
        public readonly runtimeStatus: string,
        public readonly iconPath: string,
        public readonly contextValue: string) {
        super(runtimeStatus ? `${moduleId} (${runtimeStatus})` : moduleId);
    }
}
