// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { SimulatorWebview } from "./simulatorwebview/simulatorwebview";
import { Utility } from "./utility";
import { DeviceItem } from "./Model/DeviceItem";
import { Constants } from "./constants";


export class Simulator {

    constructor(private context: vscode.ExtensionContext) {
    }

    
    public async showWebview(): Promise<void> {
        const simulatorwebview = SimulatorWebview.getInstance(this.context);
        await simulatorwebview.openSimulatorWebviewPage();
        return;
    }

    public static async getInputDeviceList(): Promise<DeviceItem[]> {
        return await Utility.getInputDeviceList(Constants.IoTHubAIMessageStartEvent);
    }

}
