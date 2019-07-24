// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import axios from "axios";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "../constants";
import { TelemetryClient } from "../telemetryClient";
import { Utility } from "../utility";
import { DeviceNode } from "./DeviceNode";
import { InfoNode } from "./InfoNode";
import { INode } from "./INode";
import { InterfaceNode } from "./InterfaceNode";

export class InterfaceLabelNode implements INode {
    constructor(public deviceNode: DeviceNode) {
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: "Interfaces",
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: "interfaces-label",
        };
    }

    public async getChildren(context: vscode.ExtensionContext, iotHubConnectionString: string): Promise<INode[]> {
        TelemetryClient.sendEvent(Constants.IoTHubAILoadInterfacesTreeStartEvent);

        try {
            const interfaces = (await axios.get(`https://${Utility.getHostName(iotHubConnectionString)}/digitalTwins/${this.deviceNode.deviceId}/interfaces?api-version=2019-07-01-preview`, {
                headers: {
                    Authorization: Utility.generateSasTokenForService(iotHubConnectionString),
                },
            })).data;
            TelemetryClient.sendEvent(Constants.IoTHubAILoadInterfacesTreeDoneEvent, { Result: "Success" });
            if (!interfaces || !interfaces.interfaces || Object.keys(interfaces.interfaces).length === 0) {
                return [new InfoNode("No Interfaces")];
            }
            return Object.keys(interfaces.interfaces).map((name) => new InterfaceNode(name, context.asAbsolutePath(path.join("resources", `interface.svg`))));
        } catch (err) {
            TelemetryClient.sendEvent(Constants.IoTHubAILoadInterfacesTreeDoneEvent, { Result: "Fail", Message: err.message });
            return Utility.getErrorMessageTreeItems("interfaces", err.message);
        }
    }
}
