// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { IoTHubMessageExplorer } from "./iotHubMessageExplorer";
import { DeviceItem } from "./Model/DeviceItem";
import { SimulatorWebview } from "./simulatorwebview/simulatorwebview";
import { Utility } from "./utility";

export class Simulator {

    public static async getInputDeviceList(): Promise<DeviceItem[]> {
        const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle, false);
        return await Utility.getFilteredDeviceList(iotHubConnectionString, false);
    }

    public static getSimulatorOutputChannel(): vscode.OutputChannel {
        return Simulator.simulatorOutputChannel;
    }

    public static isProcessing(): boolean {
        return Simulator.processing;
    }

    public static setProcessing(processing: boolean) {
        this.processing = processing;
    }

    private static simulatorOutputChannel: vscode.OutputChannel = vscode.window.createOutputChannel(Constants.SimulatorOutputChannelTitle);
    private static processing: boolean = false;

    private _iotHubMessageExplorer: IoTHubMessageExplorer;

    constructor(private context: vscode.ExtensionContext) {
        this._iotHubMessageExplorer = new IoTHubMessageExplorer(Simulator.getSimulatorOutputChannel());
    }

    public async showWebview(deviceItem: DeviceItem): Promise<void> {
        const simulatorwebview = SimulatorWebview.getInstance(this.context);
        await simulatorwebview.openSimulatorWebviewPage(deviceItem);
        return;
    }

    public async sendD2CMessage(deviceConnectionStrings: string[], message: string, times: number, interval: number) {
        Simulator.setProcessing(true);
        await this._iotHubMessageExplorer.sendD2CMessageFromMultipleDevicesRepeatedlyWithProgressBar(deviceConnectionStrings, message, times, interval);
        Simulator.setProcessing(false);
    }
}
