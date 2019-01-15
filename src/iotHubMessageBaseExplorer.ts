// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { BaseExplorer } from "./baseExplorer";

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
}
