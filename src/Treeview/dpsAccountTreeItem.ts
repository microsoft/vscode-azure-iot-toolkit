// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { AzureAccountTreeItemBase, ISubscriptionContext, SubscriptionTreeItemBase } from "vscode-azureextensionui";
import { DpsProvider } from "./dpsProvider";

export class DpsAccountTreeItem extends AzureAccountTreeItemBase {
  public createSubscriptionTreeItem(root: ISubscriptionContext): SubscriptionTreeItemBase {
    return new DpsProvider(this, root);
  }
}
