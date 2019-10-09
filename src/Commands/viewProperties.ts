// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IActionContext, openReadOnlyJson } from "vscode-azureextensionui";
import { DpsTreeItem } from "../Treeview/dpsTreeItem";
import { ExtensionVariables } from "../Utility/extensionVariables";

export async function viewProperties(context: IActionContext, node?: DpsTreeItem): Promise<void> {
    if (!node) {
        node = await ExtensionVariables.dpsExtTreeDataProvider.showTreeItemPicker<DpsTreeItem>("IotDps", context);
    }

    let data = node.dps;
    await openReadOnlyJson(node, data);
}
