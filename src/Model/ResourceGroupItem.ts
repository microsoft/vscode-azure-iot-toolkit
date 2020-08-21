// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ResourceManagementModels } from "@azure/arm-resources";
import { QuickPickItem } from "vscode";

export class ResourceGroupItem implements QuickPickItem {
    public readonly label: string;
    public readonly description: string;
    constructor(public readonly resourceGroup: ResourceManagementModels.ResourceGroup) {
        this.label = resourceGroup.name;
        this.description = resourceGroup.location;
    }
}
