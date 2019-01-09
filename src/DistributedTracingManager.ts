// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { BaseExplorer } from "./baseExplorer";
import { Constants, DistributedSettingUpdateType  } from "./constants";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";
import iothub = require("azure-iothub");
import { DeviceItem } from "./Model/DeviceItem";
import { SamplingModeItem } from "./Model/SamplingModeItem";
import { DistributedTracingLabelNode } from "./Nodes/DistributedTracingLabelNode";
import { DistributedTracingSettingNode } from "./Nodes/DistributedTracingSettingNode";

export class DistributedTracingManager extends BaseExplorer {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public async updateDistributedTracingSetting(node, updateType?: DistributedSettingUpdateType) {
        this._outputChannel.show();

        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        if (!updateType) {
            updateType = DistributedSettingUpdateType.All;
        }

        try {
            let deviceIds: string[];
            if (!node) {
                const deviceIdList = await Utility.getNoneEdgeDeviceIdList(iotHubConnectionString);
                const deviceItemList = deviceIdList.map((deviceId) => new DeviceItem(deviceId, null, null, null, null));
                let selectedDevices: DeviceItem[] = await vscode.window.showQuickPick(
                    deviceItemList,
                    { placeHolder: "Select device...", ignoreFocusOut: true, canPickMany: true },
                );
                deviceIds = selectedDevices.map((deviceItem) => deviceItem.deviceId);
            } else {
                deviceIds = [node.deviceNode.deviceId];
            }
            await this.updateDistributedTraceSettingForDevices(deviceIds, iotHubConnectionString, updateType);

            this.outputLine(Constants.IoTHubDistributedTracingSettingLabel, `Update distributed tracing setting for device [${deviceIds.join(",")}] successfully!`);
        } catch (err) {
            this.outputLine(Constants.IoTHubDistributedTracingSettingLabel, `Failed to get or update distributed setting: ${err.message}`);
            return;
        }

        if (node instanceof DistributedTracingLabelNode) {
            vscode.commands.executeCommand("azure-iot-toolkit.refresh", node);
        } else if (node instanceof DistributedTracingSettingNode) {
            vscode.commands.executeCommand("azure-iot-toolkit.refresh", node.parent);
        } else {
            vscode.commands.executeCommand("azure-iot-toolkit.refresh");
        }
    }

    public async updateDistributedTraceSettingForDevices(deviceIds: string[], iotHubConnectionString: string, updateType: DistributedSettingUpdateType) {
        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        let mode: boolean = undefined;
        let samplingRate: number = undefined;
        let twin;

        if (deviceIds.length === 1) {
            twin = await Utility.getTwin(registry, deviceIds[0]);

            if (twin.properties.desired[Constants.DISTRIBUTED_TWIN_NAME]) {
                mode = Utility.parseDesiredSamplingMode(twin);
                samplingRate = Utility.parseDesiredSamplingRate(twin);
            }

            if (updateType === DistributedSettingUpdateType.OnlySamplingRate) {
                mode = undefined;
            }

            if (updateType === DistributedSettingUpdateType.OnlyMode) {
                samplingRate = undefined;
            }
        }

        if (updateType !== DistributedSettingUpdateType.OnlySamplingRate) {
            let selectedItem: SamplingModeItem = await vscode.window.showQuickPick(
                this.getSamplingModePickupItems(),
                { placeHolder: "Select whether to enable/disable the distributed tracing...", ignoreFocusOut: true },
            );
            if (!selectedItem) {
                return;
            }
            mode = selectedItem.distributedTracingEnabled;
        }

        if (updateType !== DistributedSettingUpdateType.OnlyMode) {
            if (mode !== false) {
                samplingRate = await this.promptForSamplingRate(`Enter sampling rate, within [0, 100]`, samplingRate);

                if (samplingRate === undefined) {
                    return;
                }
            }
        }

        TelemetryClient.sendEvent(Constants.IoTHubAIUpdateDistributedSettingStartEvent);

        try {
            await Promise.all(deviceIds.map(async (devcieId) => {
                if (!twin) {
                    twin = await Utility.getTwin(registry, devcieId);
                }
                await this.updateDistributedTraceTwin(twin, mode, samplingRate, registry, iotHubConnectionString);
            }));
            TelemetryClient.sendEvent(Constants.IoTHubAIUpdateDistributedSettingDoneEvent, { Result: "Success" }, iotHubConnectionString);
        } catch (err) {
            TelemetryClient.sendEvent(Constants.IoTHubAIUpdateDistributedSettingDoneEvent, { Result: "Fail" , Message: err.message}, iotHubConnectionString);
        }
    }

    private async updateDistributedTraceTwin(twin: any, enable: boolean, samplingRate: number, registry: iothub.Registry, iotHubConnectionString: string) {
        if (enable === undefined && samplingRate === undefined) {
            return;
        }

        if (!twin.properties.desired[Constants.DISTRIBUTED_TWIN_NAME]) {
            twin.properties.desired[Constants.DISTRIBUTED_TWIN_NAME] = {};
        }

        if (enable !== undefined) {
            twin.properties.desired[Constants.DISTRIBUTED_TWIN_NAME].sampling_mode = enable ? 1 : 0;
        }

        if (samplingRate !== undefined) {
            twin.properties.desired[Constants.DISTRIBUTED_TWIN_NAME].sampling_rate = samplingRate;
        }

        return new Promise((resolve, reject) => {
            registry.updateTwin(twin.deviceId, JSON.stringify(twin), twin.etag, (err) => {
                if (err) {
                    return reject();
                } else {
                    return resolve();
                }
            });
        });
    }

    private getSamplingModePickupItems(): SamplingModeItem[] {
        return [true, false].map((samplingMode) => new SamplingModeItem(samplingMode));
    }

    private async promptForSamplingRate(prompt: string, defaultValue: number): Promise<number> {
        if (defaultValue === undefined || defaultValue > 100 || defaultValue < 0) {
            defaultValue = 100;
        }
        let samplingRate: string = await vscode.window.showInputBox({ prompt, value: defaultValue.toString() , ignoreFocusOut: true});
        if (samplingRate !== undefined) {
            samplingRate = samplingRate.trim();
            if (!samplingRate) {
                vscode.window.showErrorMessage("Sampling rate cannot be empty");
                return undefined;
            }

            const floatValue: number = parseFloat(samplingRate);
            if (!Number.isInteger(floatValue) || floatValue < 0 || floatValue > 100) {
                vscode.window.showErrorMessage("Sampling rate should be a positive integer within [0, 100]");
                return undefined;
            }
            return floatValue;
        }

        return undefined;
    }
}
