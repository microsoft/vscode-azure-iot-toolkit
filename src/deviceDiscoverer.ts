"use strict";
import { exec } from "child_process";
import * as path from "path";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { BaseExplorer } from "./baseExplorer";
import { Utility } from "./utility";
const types = ["eth", "usb", "wifi"];
const devdisco = "devdisco";

export class DeviceDiscoverer extends BaseExplorer {
    private _deviceStatus = {};
    private _context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
        super(outputChannel);
        this._context = context;
    }

    public discoverDevice(): void {
        let label = "Discovery";
        vscode.window.showQuickPick(types, { placeHolder: "Enter device type to discover" }).then((type) => {
            if (type !== undefined) {
                this._outputChannel.show();
                this.outputLine(label, `Start discovering ${type} devices..`);
                this.deviceDiscovery(label, type);
            }
        });
    }

    private deviceDiscovery(label: string, type: string): void {
        let devdiscoDir = this._context.asAbsolutePath(path.join("node_modules", "device-discovery-cli"));
        let process = exec(`${devdisco} list --${type}`, { cwd: devdiscoDir });
        let startTime = new Date();
        let devdiscoNotFound = false;
        let nodeNotFound = false;

        process.stdout.on("data", (data) => {
            this._outputChannel.append(data.toString());
        });

        process.stderr.on("data", (data) => {
            data = data.toString();
            this._outputChannel.append(data);
            if (data.indexOf(devdisco) >= 0) {
                devdiscoNotFound = true;
            } else if (data.indexOf("node") >= 0) {
                nodeNotFound = true;
            }
        });

        process.on("close", (code) => {
            let endTime = new Date();
            let elapsedTime = (endTime.getTime() - startTime.getTime()) / 1000;
            AppInsightsClient.sendEvent(`${label}.${type}`, { Code: code.toString() });
            this.outputLine(label, "Finished with exit code=" + code + " in " + elapsedTime + " seconds");
            if (devdiscoNotFound && code >= 1) {
                this.outputLine(label, "[Note!!!] Please install device-discovery-cli with below command if not yet:");
                this.outputLine(label, "npm install --global device-discovery-cli");
            } else if (nodeNotFound && code >= 1) {
                this.outputLine(label, "[Note!!!] Please install Node.js if not yet");
            }
        });
    }
}
