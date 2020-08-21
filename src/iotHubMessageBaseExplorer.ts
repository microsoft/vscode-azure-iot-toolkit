// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { EventHubConsumerClient } from "@azure/event-hubs";
import * as vscode from "vscode";
import { BaseExplorer } from "./baseExplorer";
import { TelemetryClient } from "./telemetryClient";

export class IoTHubMessageBaseExplorer extends BaseExplorer {
    protected _isMonitoring: boolean;
    protected _monitorStatusBarItem: vscode.StatusBarItem;

    constructor(outputChannel: vscode.OutputChannel, statusBarText: string, statusBarCommand: string) {
        super(outputChannel);
        this._isMonitoring = false;
        this._monitorStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -1);
        this._monitorStatusBarItem.text = statusBarText;
        this._monitorStatusBarItem.command = statusBarCommand;
    }

    protected updateMonitorStatus(status: boolean) {
        if (status) {
            this._isMonitoring = true;
            this._monitorStatusBarItem.show();
        } else {
            this._isMonitoring = false;
            this._monitorStatusBarItem.hide();
        }
    }

    protected async stopMonitorEventHubEndpoint(label: string, aiEvent: string, eventHubClient: EventHubConsumerClient, endpointType: string) {
        TelemetryClient.sendEvent(aiEvent);
        this._outputChannel.show();
        if (this._isMonitoring) {
            this.outputLine(label, `Stopping ${endpointType} monitoring...`);
            this._monitorStatusBarItem.hide();
            await eventHubClient.close();
            this.outputLine(label, `${endpointType.charAt(0).toUpperCase() + endpointType.substr(1)} monitoring stopped.`);
            this.updateMonitorStatus(false);
        } else {
            this.outputLine(label, `No ${endpointType} monitor job running.`);
        }
    }
}
