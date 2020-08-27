// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IotHubModels } from "@azure/arm-iothub";
import { TreeItem } from "vscode";
import { AzureSubscription } from "../azure-account.api";

export class EventHubItem extends TreeItem {
    constructor(
        public readonly azureSubscription: AzureSubscription,
        public readonly eventHubProperty: IotHubModels.RoutingEventHubProperties) {
        super(eventHubProperty.name);
        this.contextValue = "event-hub";
    }
}
