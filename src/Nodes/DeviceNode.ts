// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Constants } from "../constants";
import { DeviceItem } from "../Model/DeviceItem";
import { TelemetryClient } from "../telemetryClient";
import { DistributedTracingLabelNode } from "./DistributedTracingLabelNode";
import { INode } from "./INode";
import { ModuleLabelNode } from "./ModuleLabelNode";

export class DeviceNode implements INode {
    public readonly deviceId: string;
    public readonly connectionString: string;
    constructor(public deviceItem: DeviceItem) {
        this.deviceId = deviceItem.deviceId;
        this.connectionString = deviceItem.connectionString;
    }

    public getTreeItem(): vscode.TreeItem {
        return this.deviceItem;
    }

    public async getChildren(context: vscode.ExtensionContext, iotHubConnectionString: string): Promise<INode[]> {
        const nodeList: INode[] = [];
        nodeList.push(new ModuleLabelNode(this));
        if (this.deviceItem.contextValue === "device" && iotHubConnectionString.toLowerCase().indexOf("azure-devices.cn;") < 0) {
            nodeList.push(new DistributedTracingLabelNode(this));
        }
        TelemetryClient.sendEvent(Constants.IoTHubAILoadLabelInDeviceTreeDoneEvent, { Result: "Success" });
        return nodeList;
    }
}
