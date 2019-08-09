// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from  "../constants";
import { IoTHubResourceExplorer } from "../iotHubResourceExplorer";
import { DeviceItem } from "../Model/DeviceItem";
import { Simulator } from "../simulator";
import { Utility } from "../utility";
import { LocalServer } from "./localserver";

const simulatorWebviewPanelViewType = "IoT Edge SimulatorWebview";
const simulatorWebviewPanelViewTitle = "IoT Edge SimulatorWebview";

export class SimulatorWebview {
    public static getInstance(context: vscode.ExtensionContext) {
        if (!SimulatorWebview.instance) {
            SimulatorWebview.instance = new SimulatorWebview(context);
        }
        return SimulatorWebview.instance;
    }

    private static instance: SimulatorWebview;
    private panel: vscode.WebviewPanel;
    private localServer: LocalServer;

    private constructor(private context: vscode.ExtensionContext) {
        this.localServer = new LocalServer(context);
    }

    public async openSimulatorWebviewPage(deviceItem: DeviceItem): Promise<any> {
        const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle, false);
        if (!iotHubConnectionString) {
            let outputChannel = Simulator.getSimulatorOutputChannel();
            const _IoTHubResourceExplorer = new IoTHubResourceExplorer(outputChannel);
            await _IoTHubResourceExplorer.selectIoTHub();
        }
        if (!iotHubConnectionString) {
            return;
        }
        if (!this.panel) {
            this.localServer.startServer();
            // the following statement aims at setting a specific device as default
            if (deviceItem !== undefined) {
                this.localServer.setPreSelectedDevice(deviceItem);
            }
            this.panel = vscode.window.createWebviewPanel(
                simulatorWebviewPanelViewType,
                simulatorWebviewPanelViewTitle,
                vscode.ViewColumn.One,
                {
                    enableCommandUris: true,
                    enableScripts: true,
                    retainContextWhenHidden: true,
                },
            );

            let html = fs.readFileSync(this.context.asAbsolutePath(path.join("src", "simulatorwebview", "assets", "index.html")), "utf8");
            html = html
                .replace(/{{root}}/g, vscode.Uri.file(this.context.asAbsolutePath(".")).with({ scheme: "vscode-resource" }).toString())
                .replace(/{{endpoint}}/g, this.localServer.getServerUri());
            this.panel.webview.html = html;

            this.panel.onDidDispose(() => {
                this.panel = undefined;
                this.localServer.stopServer();
            });
        } else {
            this.panel.reveal();
        }
    }
}
