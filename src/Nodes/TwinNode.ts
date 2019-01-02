// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { TwinItem } from "../Model/TwinItem";
import { DistributedTracingSettingNode } from "./DistributedTracingSettingNode";
import { INode } from "./INode";
import iothub = require("azure-iothub");
import { DeviceTwinPropertyType, Utility} from "../utility";
import { DeviceNode } from "./DeviceNode";

export class TwinNode implements INode {

    private readonly DISTRIBUTED_TRACING_ENABLED_PROPERTY: string = "Enable Distributed Tracing: ";
    private readonly DISTRIBUTED_TRACING_SAMPLING_RATE: string = "Sampling Rate: ";

    constructor(
        private twinItem: TwinItem,
        public deviceNode: DeviceNode) {
    }

    public getTreeItem(): vscode.TreeItem {
        return this.twinItem;
    }

    public async getChildren(context: vscode.ExtensionContext, iotHubConnectionString: string): Promise<INode[]> {
        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
        let twin = await Utility.getTwin(registry, this.deviceNode.deviceId);
        const items: INode[] = [];

        if (this.twinItem.type === DeviceTwinPropertyType.Desired) {
            let samplingRate = null;
            let enabled = null;
            if (twin.properties.desired[Utility.DISTRIBUTED_TWIN_NAME]) {
                samplingRate = Utility.parseDesiredSamplingRate(twin);
                enabled = Utility.parseDesiredSamplingMode(twin);
            }

            items.push(new DistributedTracingSettingNode(this.DISTRIBUTED_TRACING_ENABLED_PROPERTY + (enabled ? "Enabled" : "Disabled"), this, "desired-mode-property", this.deviceNode));
            items.push(new DistributedTracingSettingNode(this.DISTRIBUTED_TRACING_SAMPLING_RATE + (samplingRate ? samplingRate : "Not Set"), this, "desired-sampling-rate-property", this.deviceNode));

            return items;
        } else if (this.twinItem.type === DeviceTwinPropertyType.Reported) {
            let samplingRate = null;
            let enabled = null;
            if (twin.properties.reported[Utility.DISTRIBUTED_TWIN_NAME]) {
                samplingRate = Utility.parseReportedSamplingRate(twin);
                enabled = Utility.parseReportedSamplingMode(twin);

                items.push(new DistributedTracingSettingNode(this.DISTRIBUTED_TRACING_ENABLED_PROPERTY + (enabled ? "Enabled" : "Disabled"), this, "reported-mode-property", this.deviceNode));
                items.push(new DistributedTracingSettingNode(this.DISTRIBUTED_TRACING_SAMPLING_RATE + (samplingRate ? samplingRate : "Not Set"),
                    this, "reported-sampling-rate-property", this.deviceNode));
                return items;
            } else {
                items.push(new DistributedTracingSettingNode(this.DISTRIBUTED_TRACING_ENABLED_PROPERTY + "Disabled", this, "reported-mode-property", this.deviceNode));
                items.push(new DistributedTracingSettingNode(this.DISTRIBUTED_TRACING_SAMPLING_RATE + "Not Set", this, "reported-sampling-rate-property", this.deviceNode));
            }
        }

        return items;
    }
}
