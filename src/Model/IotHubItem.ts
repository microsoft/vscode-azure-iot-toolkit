// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { QuickPickItem } from "vscode";
import { IotHubDescription } from "../../node_modules/azure-arm-iothub/lib/models";

export class IotHubItem implements QuickPickItem {
    public readonly label: string;
    public readonly description: string;
    constructor(public readonly iotHubDescription: IotHubDescription) {
        this.label = iotHubDescription.name;
        this.description = iotHubDescription.resourcegroup;
    }
}
