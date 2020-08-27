// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IotHubModels } from "@azure/arm-iothub";
import { AzureParentTreeItem, AzureTreeItem, TreeItemIconPath } from "vscode-azureextensionui";
import { TreeUtils } from "../../Utility/treeUtils";

// Represents an IoT Hub resource
export class IoTHubResourceTreeItem extends AzureTreeItem {
    private static contextValue: string = "IotHub";
    public readonly contextValue: string = IoTHubResourceTreeItem.contextValue;
    public readonly iotHub: IotHubModels.IotHubDescription;
    constructor(parent: AzureParentTreeItem, iotHub: IotHubModels.IotHubDescription) {
        super(parent);
        this.iotHub = iotHub;
    }

    public get id(): string {
        if (this.iotHub.id) {
            return this.iotHub.id;
        } else {
            return "";
        }
    }

    public get label(): string {
        if (this.iotHub.name) {
            return this.iotHub.name;
        } else {
            return "";
        }
    }

    public get iconPath(): TreeItemIconPath {
        return TreeUtils.getThemedIconPath("iothub");
    }
}
