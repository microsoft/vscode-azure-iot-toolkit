// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { AzureAccountTreeItemBase, ISubscriptionContext, SubscriptionTreeItemBase } from "vscode-azureextensionui";
import { DpsSubscriptionTreeItem } from "./DpsSubscriptionTreeItem";

// The root of DPS treeview, represents an Azure account
export class DpsAccountTreeItem extends AzureAccountTreeItemBase {
  // Creates the subscription item
  public async createSubscriptionTreeItem(root: ISubscriptionContext): Promise<SubscriptionTreeItemBase> {
    return new DpsSubscriptionTreeItem(this, root);
  }
}
