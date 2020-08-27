// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { TelemetryClient } from "./telemetryClient";

export class WelcomePage {
    private panel: vscode.WebviewPanel;

    constructor(private context: vscode.ExtensionContext) {
    }

    public checkAndShow() {
        if (!this.context.globalState.get(Constants.IsWelcomePageShown) && !vscode.extensions.getExtension("vsciot-vscode.azure-iot-tools")) {
            TelemetryClient.sendEvent(Constants.IoTHubAIShowWelcomePagetEvent, { trigger: "auto" });
            this.show();
            this.context.globalState.update(Constants.IsWelcomePageShown, true);
        }
    }

    public show() {
        if (!this.panel) {
            const startTime = new Date();
            this.panel = vscode.window.createWebviewPanel(
                "welcomePage",
                "Welcome to Azure IoT Hub Extension",
                vscode.ViewColumn.One,
                {
                    enableCommandUris: true,
                    enableScripts: true,
                    retainContextWhenHidden: true,
                },
            );
            let html = fs.readFileSync(this.context.asAbsolutePath(path.join("resources", "welcome", "index.html")), "utf8");
            html = html.replace(/{{root}}/g, this.panel.webview.asWebviewUri(vscode.Uri.file(this.context.asAbsolutePath("."))).toString());
            this.panel.webview.html = html;
            this.panel.onDidDispose(() => {
                this.panel = undefined;
                const duration = (new Date().getTime() - startTime.getTime()) / 1000;
                TelemetryClient.sendEvent("General.WelcomePage.Close", { duration: duration.toString() });
            });
            this.panel.webview.onDidReceiveMessage((message) => {
                TelemetryClient.sendEvent("General.WelcomePage.Click", { href: message.href });
            });
        } else {
            this.panel.reveal(vscode.ViewColumn.One);
        }
    }
}
