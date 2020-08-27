// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IotDpsClient, IotDpsModels } from "@azure/arm-deviceprovisioningservices";
import { createAzureClient, IActionContext, SubscriptionTreeItemBase } from "vscode-azureextensionui";
import { DpsResourceTreeItem } from "./DpsResourceTreeItem";

// Represents an Azure sbuscription
export class DpsSubscriptionTreeItem extends SubscriptionTreeItemBase {
    public readonly childTypeLabel: string = "Device Provisioning Service";
    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean, _context: IActionContext): Promise<DpsResourceTreeItem[]> {
        _context.telemetry.properties.nodeType = "IotDps";

        if (clearCache) {
            this._nextLink = undefined;
        }

        const client: IotDpsClient = createAzureClient(this.root, IotDpsClient);
        const dpsCollection: IotDpsModels.ProvisioningServiceDescriptionListResult = this._nextLink === undefined ?
            await client.iotDpsResource.listBySubscription() :
            await client.iotDpsResource.listBySubscriptionNext(this._nextLink);
        this._nextLink = dpsCollection.nextLink;
        return dpsCollection.map((dps: IotDpsModels.ProvisioningServiceDescription) => new DpsResourceTreeItem(this, dps));
    }
}
