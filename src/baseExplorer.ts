// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { SendStatus } from "./sendStatus";
import { TelemetryClient } from "./telemetryClient";

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

    protected sendEventDoneWithProgress(client, aiEventName: string, status: SendStatus, totalStatus: SendStatus) {
        return (err, result) => {
            const id = status.getDeviceId();
            const total = status.getTotal();

            if (err) {
                TelemetryClient.sendEvent(aiEventName, { Result: "Fail" });
                status.AddFailed();
                totalStatus.AddFailed();
                this.outputLine(Constants.SimulatorSummaryLabel, `Device ${id}: Error: ${err.toString()}`);
            }
            if (result) {
                TelemetryClient.sendEvent(aiEventName, { Result: "Success" });
                status.AddSucceed();
                totalStatus.AddSucceed();
            }
            const succeeded = status.getSucceed();
            const failed = status.getFailed();
            const sum = status.sum();
            if (sum === total) {
                this._outputChannel.show();
                this.outputLine(Constants.SimulatorSummaryLabel, `Device ${id}: Sending ${sum} message(s) done, with ${succeeded} succeeded and ${failed} failed.`);
                client.close(() => { return; });
            }
        };
    }
}
