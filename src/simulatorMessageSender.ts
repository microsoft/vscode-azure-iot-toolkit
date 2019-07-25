"use strict";
import { Message } from "azure-iot-device";
import { clientFromConnectionString } from "azure-iot-device-mqtt";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { IoTHubMessageBaseExplorer } from "./iotHubMessageBaseExplorer";
import { Utility } from "./utility";

export class SimulatorMessageSender extends IoTHubMessageBaseExplorer {

    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel, "$(primitive-square) Stop Monitoring built-in event endpoint", "azure-iot-toolkit.stopMonitorIoTHubMessage");
    }

    public async sendD2CMessageRepeatedly(inputDeviceConnectionStrings: string[], message: string, times: number, interval: number) {
        for (const deviceConnectionString of inputDeviceConnectionStrings) {
            vscode.window.showInformationMessage(deviceConnectionString);
            console.log(deviceConnectionString);
            if (message !== undefined) {
                this._outputChannel.show();
                try {
                    let i: number = 0;
                    for (i = 0; i < times; i++) {
                        let client = clientFromConnectionString(deviceConnectionString);
                        let stringify = Utility.getConfig<boolean>(Constants.IoTHubD2CMessageStringifyKey);
                        client.sendEvent(new Message(stringify ? JSON.stringify(message) : message),
                            this.sendEventDone(client, Constants.IoTHubMessageLabel, Constants.IoTHub, Constants.IoTHubAIMessageDoneEvent));
                    }
                } catch (e) {
                    this.outputLine(Constants.IoTHubMessageLabel, e);
                }
            }
        }
    }
}