"use strict";
import * as crypto from "crypto";
import * as vscode from "vscode";
import { TelemetryClient } from "./telemetryClient";

export class Utility {
    public static getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration("azure-iot-toolkit");
    }

    public static async getConnectionString(id: string, name: string) {
        let config = Utility.getConfiguration();
        let configValue = config.get<string>(id);
        if (!configValue || configValue.startsWith("<<insert")) {
            return this.setConnectionString(id, name);
        }
        return configValue;
    }

    public static async setConnectionString(id: string, name: string) {
        TelemetryClient.sendEvent("General.SetConfig.Popup");
        return vscode.window.showInputBox({
            prompt: `${name}`,
            placeHolder: `Enter your ${name}`,
        }).then((value: string) => {
            if (value !== undefined) {
                TelemetryClient.sendEvent("General.SetConfig.Done");
                let config = Utility.getConfiguration();
                config.update(id, value, true);
                return value;
            }
            return null;
        });
    }

    public static getConnectionStringWithId(id: string) {
        let config = Utility.getConfiguration();
        let configValue = config.get<string>(id);
        if (!configValue || configValue.startsWith("<<insert")) {
            return null;
        }
        return configValue;
    }

    public static getConfig<T>(id: string): T {
        let config = Utility.getConfiguration();
        return config.get<T>(id);
    }

    public static getHostName(iotHubConnectionString: string): string {
        let result = /^HostName=([^=]+);/.exec(iotHubConnectionString);
        return result ? result[1] : "";
    }

    public static hash(data: string): string {
        return crypto.createHash("sha256").update(data).digest("hex");
    }
}
