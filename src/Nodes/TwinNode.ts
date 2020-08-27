// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { TwinItem } from "../Model/TwinItem";
import { DistributedTracingSettingNode } from "./DistributedTracingSettingNode";
import { INode } from "./INode";
import iothub = require("azure-iothub");
import { Constants, DeviceTwinPropertyType } from "../constants";
import { TelemetryClient } from "../telemetryClient";
import { Utility } from "../utility";
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
        const registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        TelemetryClient.sendEvent(Constants.IoTHubAILoadDistributedTracingSettingTreeStartEvent, null, iotHubConnectionString);
        const items: INode[] = [];

        try {
            const twin = await Utility.getTwin(registry, this.deviceNode.deviceId);
            let samplingRate = null;
            let enabled = null;
            if (this.twinItem.type === DeviceTwinPropertyType.Desired) {
                if (twin.properties.desired[Constants.DISTRIBUTED_TWIN_NAME]) {
                    samplingRate = Utility.parseDesiredSamplingRate(twin);
                    enabled = Utility.parseDesiredSamplingMode(twin);

                    items.push(new DistributedTracingSettingNode(this.DISTRIBUTED_TRACING_ENABLED_PROPERTY + (enabled ? Constants.EnabledLabel : Constants.DisabledLabel),
                        this, "desired-mode-property", this.deviceNode));
                    items.push(new DistributedTracingSettingNode(this.DISTRIBUTED_TRACING_SAMPLING_RATE +
                        (samplingRate !== undefined ? samplingRate + Constants.PercentageLabel : Constants.NotSetLabel),
                        this, "desired-sampling-rate-property", this.deviceNode));
                } else {
                    items.push(new DistributedTracingSettingNode(this.DISTRIBUTED_TRACING_ENABLED_PROPERTY + Constants.DisabledLabel, this, "desired-mode-property", this.deviceNode));
                    items.push(new DistributedTracingSettingNode(this.DISTRIBUTED_TRACING_SAMPLING_RATE + Constants.NotSetLabel, this, "desired-sampling-rate-property", this.deviceNode));
                }
            } else if (this.twinItem.type === DeviceTwinPropertyType.Reported) {
                if (twin.properties.reported[Constants.DISTRIBUTED_TWIN_NAME]) {
                    samplingRate = Utility.parseReportedSamplingRate(twin);
                    enabled = Utility.parseReportedSamplingMode(twin);

                    items.push(new DistributedTracingSettingNode(this.DISTRIBUTED_TRACING_ENABLED_PROPERTY + (enabled ? Constants.EnabledLabel : Constants.DisabledLabel),
                        this, "reported-mode-property", this.deviceNode));
                    items.push(new DistributedTracingSettingNode(this.DISTRIBUTED_TRACING_SAMPLING_RATE + (samplingRate ? samplingRate + Constants.PercentageLabel : Constants.NotSetLabel),
                        this, "reported-sampling-rate-property", this.deviceNode));
                } else {
                    items.push(new DistributedTracingSettingNode(this.DISTRIBUTED_TRACING_ENABLED_PROPERTY + Constants.DisabledLabel, this, "reported-mode-property", this.deviceNode));
                    items.push(new DistributedTracingSettingNode(this.DISTRIBUTED_TRACING_SAMPLING_RATE + Constants.NotSetLabel, this, "reported-sampling-rate-property", this.deviceNode));
                }
            }
            TelemetryClient.sendEvent(Constants.IoTHubAILoadDistributedTracingSettingTreeDoneEvent, { Result: "Success" }, iotHubConnectionString);
        } catch (err) {
            TelemetryClient.sendEvent(Constants.IoTHubAILoadDistributedTracingSettingTreeDoneEvent, { Result: "Fail", [Constants.errorProperties.Message]: err.message }, iotHubConnectionString);
        }

        return items;
    }
}
