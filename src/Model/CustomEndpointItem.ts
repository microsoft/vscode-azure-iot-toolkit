// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { TreeItem } from "vscode";

export class CustomEndpointItem extends TreeItem {
    constructor(name: string) {
        super(name);
        this.contextValue = "custom-endpoint";
    }
}
