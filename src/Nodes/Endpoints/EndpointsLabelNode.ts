// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import IotHubClient from "azure-arm-iothub";
import * as vscode from "vscode";
import { Constants } from "../../constants";
import { Utility } from "../../utility";
import { INode } from "../INode";
import { EventHubLabelNode } from "./EventHubLabelNode";

export class EndpointsLabelNode implements INode {
    constructor() {
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: "Endpoints",
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: "endpoints-label",
        };
    }

    public async getChildren(): Promise<INode[]> {
        const accountApi = Utility.getAzureAccountApi();
        if (!(await accountApi.waitForLogin())) {
            return [];
        }

        // TODO: check whether Constants.StateKeySubsID is set
        const subscription = accountApi.subscriptions.find((element) => element.subscription.subscriptionId === Constants.ExtensionContext.globalState.get(Constants.StateKeySubsID));
        const client = new IotHubClient(subscription.session.credentials, subscription.subscription.subscriptionId, subscription.session.environment.resourceManagerEndpointUrl);
        const iotHubs = await client.iotHubResource.listBySubscription();
        const iothub = iotHubs.find((element) =>
            element.id === Constants.ExtensionContext.globalState.get(Constants.StateKeyIoTHubID));
        return [new EventHubLabelNode(subscription, iothub.properties.routing.endpoints.eventHubs)];
    }
}
