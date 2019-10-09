// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IotDpsClient, IotDpsModels } from "azure-arm-deviceprovisioningservices";
import { createAzureClient, IActionContext, SubscriptionTreeItemBase } from "vscode-azureextensionui";
import { DpsTreeItem } from "./dpsTreeItem";

export class DpsProvider extends SubscriptionTreeItemBase {
    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean, _context: IActionContext): Promise<DpsTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const client: IotDpsClient = createAzureClient(this.root, IotDpsClient);
        const dpsCollection: IotDpsModels.ProvisioningServiceDescriptionListResult = this._nextLink === undefined ?
            await client.iotDpsResource.listBySubscription() :
            await client.iotDpsResource.listBySubscriptionNext(this._nextLink);
        this._nextLink = dpsCollection.nextLink;
        return dpsCollection.map((dps: IotDpsModels.ProvisioningServiceDescription) => new DpsTreeItem(this, dps));
    }
}
