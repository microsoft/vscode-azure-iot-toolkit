// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IotDpsClient, IotDpsModels } from "azure-arm-deviceprovisioningservices";
import { createAzureClient, IActionContext, openReadOnlyJson } from "vscode-azureextensionui";
import { Constants } from "../constants";
import { DpsTreeItem } from "../Treeview/dpsTreeItem";
import { ExtensionVariables } from "../Utility/extensionVariables";

export async function viewProperties(context: IActionContext, node?: DpsTreeItem): Promise<void> {
    if (!node) {
        node = await ExtensionVariables.dpsExtTreeDataProvider.showTreeItemPicker<DpsTreeItem>("IotDps", context);
    }

    const client: IotDpsClient = createAzureClient(node.root, IotDpsClient);
    let matchResult = Constants.DpsResourceGroupNameRegex.exec(node.fullId);
    let dpsInfo: IotDpsModels.ProvisioningServiceDescription = null;
    if (matchResult != null) {
        let resourecGroupName = matchResult[1];
        dpsInfo = await client.iotDpsResource.get(node.dps.name, resourecGroupName);
    } else {
        dpsInfo = node.dps; // Fallback to use cached properties if regex match fails
    }
    let propertyInfo = {
        label: dpsInfo.name + "-properties",
        fullId: dpsInfo.id,
    };
    await openReadOnlyJson(propertyInfo, dpsInfo);
}
