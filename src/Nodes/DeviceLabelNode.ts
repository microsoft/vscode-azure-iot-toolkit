// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Constants } from "../constants";
import { DeviceItem } from "../Model/DeviceItem";
import { TelemetryClient } from "../telemetryClient";
import { Utility } from "../utility";
import { DeviceNode } from "./DeviceNode";
import { InfoNode } from "./InfoNode";
import { INode } from "./INode";

export class DeviceLabelNode implements INode {
    constructor(private iotHubConnectionString: string) {
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: "Devices",
            collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
            contextValue: "devices-label",
        };
    }

    public async getChildren(): Promise<INode[]> {
        TelemetryClient.sendEvent(Constants.IoTHubAIStartLoadDeviceTreeEvent);

        try {
            const deviceList: vscode.TreeItem[] = await Utility.getDeviceList(this.iotHubConnectionString, Constants.ExtensionContext);

            const deviceNode: INode[] = deviceList.map((item) => new DeviceNode(item as DeviceItem));

            if (deviceNode.length === 0) {
                deviceNode.push(new InfoNode(`No devices in ${Utility.getHostName(this.iotHubConnectionString)}`));
            }

            TelemetryClient.sendEvent(Constants.IoTHubAILoadDeviceTreeEvent, { Result: "Success", DeviceCount: deviceList.length.toString() });

            return deviceNode;
        } catch (err) {
            TelemetryClient.sendEvent(Constants.IoTHubAILoadDeviceTreeEvent, { Result: "Fail", [Constants.errorProperties.Message]: err.message });
            return Utility.getErrorMessageTreeItems("IoT Hub devices", err.message);
        }
    }
}
