// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { TreeItem } from "vscode";

export class InterfaceItem extends TreeItem {
    constructor(
        public readonly deviceId: string,
        public readonly name: string) {
        super(name);
        this.contextValue = "interface";
    }
}
