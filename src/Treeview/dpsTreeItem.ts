// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IotDpsModels } from "azure-arm-deviceprovisioningservices";
import { AzureParentTreeItem, AzureTreeItem, TreeItemIconPath } from "vscode-azureextensionui";
import { TreeUtils } from "../Utility/treeUtils"

export class DpsTreeItem extends AzureTreeItem {
    public static contextValue: string = "IotDps";
    public readonly contextValue: string = DpsTreeItem.contextValue;
    public readonly dps: IotDpsModels.ProvisioningServiceDescription;
    constructor(parent: AzureParentTreeItem, dps: IotDpsModels.ProvisioningServiceDescription) {
        super(parent);
        this.dps = dps;
    }

    public get id(): string {
        if (this.dps.id) {
            return this.dps.id;
        } else {
            return "";
        }
    }

    public get label(): string {
        if (this.dps.name) {
            return this.dps.name;
        } else {
            return "";
        }
    }

    public get iconPath(): TreeItemIconPath {
        return TreeUtils.getThemedIconPath('dps');
    }
}