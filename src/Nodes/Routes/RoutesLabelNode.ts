// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IotHubClient } from "@azure/arm-iothub";
import * as vscode from "vscode";
import { Constants } from "../../constants";
import { TelemetryClient } from "../../telemetryClient";
import { Utility } from "../../utility";
import { ensureLoggedIn, getCredential } from "../../azureAuth";
import { CommandNode } from "../CommandNode";
import { INode } from "../INode";
import { RouteItemNode } from "./RouteItemNode";

export class RoutesLabelNode implements INode {
    constructor() {
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: "Routes",
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: "message-routes-label",
        };
    }

    public async getChildren(): Promise<INode[]> {
        TelemetryClient.sendEvent(Constants.IoTHubAILoadRoutesTreeStartEvent);

        try {
            const subscriptionId = Constants.ExtensionContext.globalState.get<string>(Constants.StateKeySubsID);
            if (!subscriptionId || !(await ensureLoggedIn())) {
                return [this.getSelectIoTHubCommandNode()];
            }

            const targetId = Constants.ExtensionContext.globalState.get<string>(Constants.StateKeyIoTHubID);
            if (!targetId) {
                return [this.getSelectIoTHubCommandNode()];
            }

            const resourceGroupName = Utility.getResourceGroupNameFromId(targetId);
            const hubName = targetId.split("/").pop();
            if (!resourceGroupName || !hubName) {
                return [this.getSelectIoTHubCommandNode()];
            }

            const client = new IotHubClient(getCredential(), subscriptionId);
            let iothub;
            try {
                iothub = await client.iotHubResource.get(resourceGroupName, hubName);
            } catch (err) {
                const statusCode = typeof err === "object" && err !== null && "statusCode" in err
                    ? (err as { statusCode?: number }).statusCode
                    : undefined;
                if (statusCode === 404) {
                    return [this.getSelectIoTHubCommandNode()];
                }
                throw err;
            }
            TelemetryClient.sendEvent(Constants.IoTHubAILoadRoutesTreeDoneEvent, { Result: "Success" });

            const routes = iothub.properties?.routing?.routes ?? [];
            if (routes.length === 0) {
                return [new CommandNode("-> Create a route", "azure-iot-hub.createMessageRoute")];
            }
            return routes.map((route) => new RouteItemNode(route));
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            TelemetryClient.sendEvent(Constants.IoTHubAILoadRoutesTreeDoneEvent, { Result: "Fail", [Constants.errorProperties.Message]: message });
            return Utility.getErrorMessageTreeItems("routes", message);
        }
    }

    private getSelectIoTHubCommandNode(): CommandNode {
        return new CommandNode("-> Please select an IoT Hub", "azure-iot-toolkit.selectIoTHub");
    }
}
