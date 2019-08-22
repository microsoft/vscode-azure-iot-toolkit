// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { TreeItem } from "vscode";

export class InterfaceItem extends TreeItem {
    constructor(name: string, public readonly iconPath: string) {
        super(name);
        this.contextValue = "interface";
    }
}
