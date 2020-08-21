// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as iothub from "azure-iothub";
import * as uuid from "uuid";
import * as vscode from "vscode";
import { BaseExplorer } from "./baseExplorer";
import { Constants, DistributedSettingUpdateType } from "./constants";
import { SamplingModeItem } from "./Model/SamplingModeItem";
import { DistributedTracingLabelNode } from "./Nodes/DistributedTracingLabelNode";
import { DistributedTracingSettingNode } from "./Nodes/DistributedTracingSettingNode";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class DistributedTracingManager extends BaseExplorer {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public async updateDistributedTracingSetting(node, updateType: DistributedSettingUpdateType) {
        const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        TelemetryClient.sendEvent(Constants.IoTHubAIUpdateDistributedSettingStartEvent);

        let deviceIds: string[] = [];
        if (!node || !node.deviceNode) {
            const selectedDeviceIds: string[] = await vscode.window.showQuickPick(
                Utility.getNoneEdgeDeviceIdList(iotHubConnectionString),
                { placeHolder: "Select devices...", ignoreFocusOut: true, canPickMany: true },
            );

            if (selectedDeviceIds !== undefined && selectedDeviceIds.length > 0) {
                deviceIds = selectedDeviceIds;
            }
        } else {
            deviceIds = [node.deviceNode.deviceId];
        }

        if (deviceIds.length === 0) {
            return;
        }

        await this.updateDistributedTracingSettingForDevices(deviceIds, iotHubConnectionString, updateType, node);
    }

    public async updateDistributedTracingSettingForDevices(deviceIds: string[], iotHubConnectionString: string, updateType: DistributedSettingUpdateType, node) {
        const registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        let mode: boolean;
        let samplingRate: number;
        let twin;

        if (deviceIds.length === 1) {
            await vscode.window.withProgress({
                title: `Get Current Distributed Tracing Setting`,
                location: vscode.ProgressLocation.Notification,
            }, async () => {
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
            });
        }

        if (updateType !== DistributedSettingUpdateType.OnlySamplingRate) {
            const selectedItem: SamplingModeItem = await vscode.window.showQuickPick(
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
                samplingRate = await this.promptForSamplingRate(`Enter sampling rate, integer within [0, 100]`, samplingRate);

                if (samplingRate === undefined) {
                    return;
                }
            }
        }

        await vscode.window.withProgress({
            title: `Update Distributed Tracing Setting`,
            location: vscode.ProgressLocation.Notification,
        }, async () => {
            try {
                const result = await this.updateDeviceTwin(mode, samplingRate, iotHubConnectionString, deviceIds);
                TelemetryClient.sendEvent(Constants.IoTHubAIUpdateDistributedSettingDoneEvent,
                    { Result: "Success", UpdateType: updateType.toString(), DeviceCount: deviceIds.length.toString(),
                    SamplingRate: samplingRate ? samplingRate.toString() : "" , SamplingMode: mode ? mode.toString() : "" }, iotHubConnectionString);

                let resultTip = "";
                if (result) {
                    resultTip = "\nDetailed information are shown as below:\n" + JSON.stringify(result, null, 2);
                }
                this._outputChannel.show();
                this.outputLine(Constants.IoTHubDistributedTracingSettingLabel,
                    `Update distributed tracing setting for device [${deviceIds.join(",")}] complete!` +
                    (mode === true ? " (Distributed Tracing is in public preview stage and is available only in some regions, please check detail https://aka.ms/iottracing)" : "")
                    + resultTip);

                if (node instanceof DistributedTracingLabelNode) {
                    vscode.commands.executeCommand("azure-iot-toolkit.refresh", node);
                } else if (node instanceof DistributedTracingSettingNode) {
                    vscode.commands.executeCommand("azure-iot-toolkit.refresh", node.parent);
                } else {
                    vscode.commands.executeCommand("azure-iot-toolkit.refresh");
                }
            } catch (err) {
                TelemetryClient.sendEvent(Constants.IoTHubAIUpdateDistributedSettingDoneEvent,
                    { Result: "Fail", UpdateType: updateType.toString(), DeviceCount: deviceIds.length.toString(),
                    SamplingRate: samplingRate ? "" : samplingRate.toString(), SamplingMode: mode ? "" : mode.toString() }, iotHubConnectionString);
                this._outputChannel.show();
                this.outputLine(Constants.IoTHubDistributedTracingSettingLabel, `Failed to get or update distributed setting: ${err.message}`);
            }
        });
    }

    private async updateDeviceTwin(enable: boolean, samplingRate: number, iotHubConnectionString: string, deviceIds: string[]): Promise<any> {
        const twinPatch = {
            etag: "*",
            properties: {
                desired: {},
            },
        };

        if (enable === undefined && samplingRate === undefined) {
            return;
        }

        if (!twinPatch.properties.desired[Constants.DISTRIBUTED_TWIN_NAME]) {
            twinPatch.properties.desired[Constants.DISTRIBUTED_TWIN_NAME] = {};
        }

        if (enable !== undefined) {
            twinPatch.properties.desired[Constants.DISTRIBUTED_TWIN_NAME].sampling_mode = enable ? 1 : 2;
        }

        if (samplingRate !== undefined) {
            twinPatch.properties.desired[Constants.DISTRIBUTED_TWIN_NAME].sampling_rate = samplingRate;
        }

        if (deviceIds.length === 1) {
            const registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
            await registry.updateTwin(deviceIds[0], JSON.stringify(twinPatch), twinPatch.etag);
            return;
        }

        return this.scheduleTwinUpdate(twinPatch, iotHubConnectionString, deviceIds);
    }

    private async scheduleTwinUpdate(twinPatch, iotHubConnectionString: string, deviceIds: string[]): Promise<any> {
        const twinJobId = uuid.v4();
        const jobClient = iothub.JobClient.fromConnectionString(iotHubConnectionString);

        const queryCondition = this.generateQureyCondition(deviceIds);
        const startTime = new Date();
        const maxExecutionTimeInSeconds = 300;

        await jobClient.scheduleTwinUpdate(twinJobId, queryCondition, twinPatch, startTime, maxExecutionTimeInSeconds);
        return this.monitorJob(twinJobId, jobClient);
    }

    private generateQureyCondition(deviceids: string[]): string {
        const deviceIdsWithQuotes = deviceids.map((id) => "'" + id + "'");
        return `deviceId IN [${deviceIdsWithQuotes.join(",")}]`;
    }

    private async monitorJob(jobId, jobClient): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const jobMonitorInterval = setInterval(async () => {
                try {
                    const result = await jobClient.getJob(jobId);
                    if (result.jobStatus.status === "completed" || result.jobStatus.status === "failed" || result.jobStatus.status === "cancelled") {
                        clearInterval(jobMonitorInterval);
                        resolve(result.jobStatus);
                    }
                } catch (err) {
                    reject(err);
                }
            }, 1000);
        });
    }

    private getSamplingModePickupItems(): SamplingModeItem[] {
        return [true, false].map((samplingMode) => new SamplingModeItem(samplingMode));
    }

    private async promptForSamplingRate(prompt: string, defaultValue: number): Promise<number> {
        if (defaultValue === undefined || defaultValue > 100 || defaultValue < 0) {
            defaultValue = 100;
        }

        let samplingRate: string = await vscode.window.showInputBox({ prompt, value: defaultValue.toString(), ignoreFocusOut: true, validateInput: (value): string => {
            if (value !== undefined) {
                value = value.trim();
                if (!value) {
                    return "Sampling rate cannot be empty";
                }
                const containsOnlyNumber = /^\d+$/.test(value);
                const floatValue: number = parseFloat(value);
                if (!containsOnlyNumber || !Number.isInteger(floatValue) || floatValue < 0 || floatValue > 100) {
                    return "Sampling rate should be an integer within [0, 100]";
                }
                return undefined;
            } else {
                return "Sampling rate cannot be empty";
            }
        }});

        if (samplingRate !== undefined) {
            samplingRate = samplingRate.trim();
            const floatValue: number = parseFloat(samplingRate);
            return floatValue;
        }

        return undefined;
    }
}
