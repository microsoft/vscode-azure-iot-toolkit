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
            label: "Interfaces (Preview)",
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: "interfaces-label",
        };
    }

    public async getChildren(context: vscode.ExtensionContext, iotHubConnectionString: string): Promise<INode[]> {
        TelemetryClient.sendEvent(Constants.IoTHubAILoadInterfacesTreeStartEvent);

        try {
            const interfaces = (await axios.request(Utility.generateIoTHubAxiosRequestConfig(
                iotHubConnectionString,
                `/digitalTwins/${this.deviceNode.deviceId}/interfaces?api-version=${Constants.IoTHubApiVersion}`,
                "get",
            ))).data;
            TelemetryClient.sendEvent(Constants.IoTHubAILoadInterfacesTreeDoneEvent, { Result: "Success" });
            let interfaceIds = [];
            if (Utility.getReportedInterfacesFromDigitalTwin(interfaces)) {
                interfaceIds = Object.values(interfaces.interfaces[Constants.modelDiscoveryInterfaceName].properties.modelInformation.reported.value.interfaces);
            }
            if (interfaceIds.length === 0) {
                return [new InfoNode("No Interfaces")];
            }
            return interfaceIds.map((name) => new InterfaceNode(name, context.asAbsolutePath(path.join("resources", `interface.svg`))));
        } catch (err) {
            TelemetryClient.sendEvent(Constants.IoTHubAILoadInterfacesTreeDoneEvent, { Result: "Fail", Message: err.message });
            if (err.response && err.response.status === 400) {
                return [];
            }
            return Utility.getErrorMessageTreeItems("interfaces", err.message);
        }
    }
}
