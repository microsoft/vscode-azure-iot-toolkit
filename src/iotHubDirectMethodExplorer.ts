"use strict";
import { Message } from "azure-iot-common";
import { Client as ServiceClient } from "azure-iothub";
import * as vscode from "vscode";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { DeviceItem } from "./Model/DeviceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class IotHubDirectMethodExplorer extends BaseExplorer {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public async invokeDeviceMethod(deviceItem: DeviceItem) {
        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        deviceItem = await Utility.getInputDevice(deviceItem, Constants.IoTHubAIInvokeDeviceMethodEvent);
        if (!deviceItem) {
            return;
        }

        vscode.window.showInputBox({ prompt: `Enter [Method Name] sent to [${deviceItem.deviceId}]` }).then((methodName: string) => {
            if (methodName !== undefined) {
                vscode.window.showInputBox({ prompt: `Enter [Payload] sent to [${deviceItem.deviceId}]` }).then((payload: string) => {
                    let methodParams = {
                        methodName,
                        payload,
                        timeoutInSeconds: 10,
                        connectTimeoutInSeconds: 10,
                    };
                    let serviceClient = ServiceClient.fromConnectionString(iotHubConnectionString);
                    this._outputChannel.show();
                    this.outputLine(Constants.IoTHubDirectMethodLabel, `Invokeing Direct Method [${methodName}] to [${deviceItem.deviceId}] ...`);
                    serviceClient.open((error) => {
                        if (error) {
                            this.outputLine(Constants.IoTHubDirectMethodLabel, error.message);
                        } else {
                            serviceClient.invokeDeviceMethod(deviceItem.deviceId, methodParams, (err, result) => {
                                if (err) {
                                    this.outputLine(Constants.IoTHubDirectMethodLabel, `Failed to invoke Direct Method: ${err.message}`);
                                } else {
                                    this.outputLine(Constants.IoTHubDirectMethodLabel, `Response from [${deviceItem.deviceId}]:`);
                                    this.outputLine(Constants.IoTHubDirectMethodLabel, JSON.stringify(result, null, 2));
                                }
                            });
                        }
                    });
                });
            }
        });
    }
}
