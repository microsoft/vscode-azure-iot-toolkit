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

    public async test() {
        vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "I am long running!",
			cancellable: true
		}, (progress, token) => {
			token.onCancellationRequested(() => {
				console.log("User canceled the long running operation");
			});

			progress.report({ increment: 0 });

			setTimeout(() => {
				progress.report({ increment: 10, message: "I am long running! - still going..." });
			}, 1000);

			setTimeout(() => {
				progress.report({ increment: 40, message: "I am long running! - still going even more..." });
			}, 2000);

			setTimeout(() => {
				progress.report({ increment: 50, message: "I am long running! - almost there..." });
			}, 3000);

			var p = new Promise(resolve => {
				setTimeout(() => {
					resolve();
				}, 5000);
			});

			return p;
		});
    }

    public static async getInputDeviceList(): Promise<DeviceItem[]> {
        return await Utility.getInputDeviceList(Constants.IoTHubAIMessageStartEvent);
    }

}
