// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { SimulatorWebview } from "./simulatorwebview/simulatorwebview";
import { Utility } from "./utility";
import { DeviceItem } from "./Model/DeviceItem";
import { Constants } from "./constants";
import { IoTHubMessageExplorer } from "./iotHubMessageExplorer";

export class Simulator {

	private _iotHubMessageExplorer: IoTHubMessageExplorer;

    constructor(private context: vscode.ExtensionContext) {
		let outputChannel = vscode.window.createOutputChannel("Azure IoT Hub Toolkit Simulator");
		this._iotHubMessageExplorer = new IoTHubMessageExplorer(outputChannel);
    }

    public async showWebview(): Promise<void> {
        const simulatorwebview = SimulatorWebview.getInstance(this.context);
        await simulatorwebview.openSimulatorWebviewPage();
        return;
	}
	
	public async sendD2CMessage(inputDeviceConnectionStrings: string[], message: string, times: number, interval: number) {
        await this._iotHubMessageExplorer.sendD2CMessageFromMultipleDevicesRepeatedlyWithProgressBar(inputDeviceConnectionStrings, message, times, interval);
    }

    public static async getInputDeviceList(): Promise<DeviceItem[]> {
        return await Utility.getInputDeviceList(Constants.IoTHubAIMessageStartEvent);
    }

}
