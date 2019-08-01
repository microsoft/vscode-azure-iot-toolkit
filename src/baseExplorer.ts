// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { DeviceItem } from "./Model/DeviceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";
import { SendStatus }  from "./iotHubMessageExplorer";
import { Send } from "express-serve-static-core";
import { Constants } from "./constants";

export class BaseExplorer {
    protected _outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this._outputChannel = outputChannel;
    }

    protected output(label: string, message: string, outputChannel: vscode.OutputChannel = this._outputChannel): void {
        outputChannel.append(`[${label}] ${message}`);
    }

    protected outputLine(label: string, message: string, outputChannel: vscode.OutputChannel = this._outputChannel): void {
        outputChannel.appendLine(`[${label}] ${message}`);
    }

    protected sendEventDone(client, label: string, target: string, aiEventName: string) {
        this.outputLine(label, `Sending message to [${target}] ...`);

        return (err, result) => {
            if (err) {
                this.outputLine(label, `Failed to send message to [${target}]`);
                this.outputLine(label, err.toString());
                TelemetryClient.sendEvent(aiEventName, { Result: "Fail" });
            }
            if (result) {
                this.outputLine(label, `[Success] Message sent to [${target}]`);
                TelemetryClient.sendEvent(aiEventName, { Result: "Success" });
            }
            client.close(() => { return; });
        };
    }

    protected sendEventDoneWithProgress(client, aiEventName: string, status: SendStatus, progress: vscode.Progress<{
        message?: string;
        increment?: number;
    }>, step: number, total: number) {

        return (err, result) => {
            if (err) {
                status.newStatus(false);
                TelemetryClient.sendEvent(aiEventName, { Result: "Fail" });
            }
            if (result) {
                status.newStatus(true);
                TelemetryClient.sendEvent(aiEventName, { Result: "Success" });
            }
            const succeeded = status.getSucceed();
            const failed = status.getFailed();
            const sum = status.sum();
            progress.report({
                increment: step,
                message: `Receiving sending status: ${succeeded} succeeded and ${failed} failed.`
            })
            if (sum == total) {
                this.outputLine(Constants.SimulatorSummaryLabel, `Sending ${total} message(s) done, with ${succeeded} succeeded and ${failed} failed.`);
            }
            client.close(() => { return; });
        };
    }
}
