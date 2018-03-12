// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ResourceModels } from "azure-arm-resource";
import { QuickPickItem } from "vscode";

export class ResourceGroupItem implements QuickPickItem {
    public readonly label: string;
    public readonly description: string;
    constructor(public readonly resourceGroup: ResourceModels.ResourceGroup) {
        this.label = resourceGroup.name;
        this.description = resourceGroup.location;
    }
}
