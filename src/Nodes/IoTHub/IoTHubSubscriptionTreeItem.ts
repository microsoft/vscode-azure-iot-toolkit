// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

// import { IotDpsClient, IotDpsModels } from "azure-arm-deviceprovisioningservices";
import { IotHubClient, IotHubModels } from "azure-arm-iothub";
import { createAzureClient, IActionContext, SubscriptionTreeItemBase } from "vscode-azureextensionui";
import { IoTHubResourceTreeItem } from "./IoTHubResourceTreeItem";

// Represents an Azure sbuscription
export class IoTHubSubscriptionTreeItem extends SubscriptionTreeItemBase {
    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean, _context: IActionContext): Promise<IoTHubResourceTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const client: IotHubClient = createAzureClient(this.root, IotHubClient);
        const iotHubCollection: IotHubModels.IotHubDescriptionListResult = this._nextLink === undefined ?
            await client.iotHubResource.listBySubscription() :
            await client.iotHubResource.listBySubscriptionNext(this._nextLink);
        this._nextLink = iotHubCollection.nextLink;
        return iotHubCollection.map((iotHub: IotHubModels.IotHubDescription) => new IoTHubResourceTreeItem(this, iotHub));
    }
}
