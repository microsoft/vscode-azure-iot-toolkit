// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { Message } from "azure-iot-common";
import { Client as ServiceClient, DeviceMethodParams } from "azure-iothub";
import { Callback } from "azure-iothub/lib/interfaces";
import * as vscode from "vscode";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { DeviceItem } from "./Model/DeviceItem";
import { ModuleItem } from "./Model/ModuleItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class IotHubDirectMethodExplorer extends BaseExplorer {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public async invokeDeviceDirectMethod(deviceItem: DeviceItem) {
        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        deviceItem = await Utility.getInputDevice(deviceItem, Constants.IoTHubAIInvokeDeviceMethodEvent);
        if (!deviceItem) {
            return;
        }

        this.invokeDirectMethod(iotHubConnectionString, deviceItem.deviceId);
    }

    public async invokeModuleDirectMethod(moduleItem: ModuleItem) {
        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        TelemetryClient.sendEvent(Constants.IoTHubAIInvokeModuleMethodEvent);
        this.invokeDirectMethod(iotHubConnectionString, moduleItem.deviceId, moduleItem.moduleId);
    }

    private invokeDirectMethod(iotHubConnectionString: string, deviceId: string, moduleId?: string) {
        const target = moduleId ?  `[${deviceId}]-[${moduleId}]` : `[${deviceId}]`;

        vscode.window.showInputBox({ prompt: `Enter [Method Name] sent to ${target}`, ignoreFocusOut: true }).then((methodName: string) => {
            if (methodName === undefined) {
                return;
            }
            vscode.window.showInputBox({ prompt: `Enter [Payload] sent to ${target}`, ignoreFocusOut: true }).then((payload: string) => {
                if (payload === undefined) {
                    return;
                }
                const methodParams: DeviceMethodParams = {
                    methodName,
                    payload,
                    responseTimeoutInSeconds: 10,
                    connectTimeoutInSeconds: 10,
                };
                const serviceClient = ServiceClient.fromConnectionString(iotHubConnectionString);
                this._outputChannel.show();
                this.outputLine(Constants.IoTHubDirectMethodLabel, `Invoking Direct Method [${methodName}] to ${target} ...`);
                serviceClient.open((error) => {
                    if (error) {
                        this.outputLine(Constants.IoTHubDirectMethodLabel, error.message);
                    } else {
                        this.invokeDirectMethodWithServiceClient(serviceClient, deviceId, methodParams, (err, result) => {
                            if (err) {
                                this.outputLine(Constants.IoTHubDirectMethodLabel, `Failed to invoke Direct Method: ${err.message}`);
                            } else {
                                this.outputLine(Constants.IoTHubDirectMethodLabel, `Response from ${target}:`);
                                this._outputChannel.appendLine(JSON.stringify(result, null, 2));
                            }
                        }, moduleId);
                    }
                });
            });
        });
    }

    private invokeDirectMethodWithServiceClient(serviceClient: ServiceClient, deviceId: string, methodParams: DeviceMethodParams, done?: Callback<any>, moduleId?: string) {
        if (moduleId) {
            serviceClient.invokeDeviceMethod(deviceId, moduleId, methodParams, done);
        } else {
            serviceClient.invokeDeviceMethod(deviceId, methodParams, done);
        }
    }
}
