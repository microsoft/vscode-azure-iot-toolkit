"use strict";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";

export class Utility {
    public static getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration("azure-iot-toolkit");
    }

    public static async getConfig(id: string, name: string) {
        let config = Utility.getConfiguration();
        let configValue = config.get<string>(id);
        if (!configValue || configValue.startsWith("<<insert")) {
            AppInsightsClient.sendEvent("SetConfig");
            return await vscode.window.showInputBox({
                prompt: `${name}`,
                placeHolder: `Enter your ${name}`,
            }).then((value: string) => {
                if (value !== undefined) {
                    config.update(id, value, true);
                    return value;
                }
                return null;
            });
        }
        return configValue;
    }

    public static getConfigWithId(id: string) {
        let config = Utility.getConfiguration();
        let configValue = config.get<string>(id);
        if (!configValue || configValue.startsWith("<<insert")) {
            return null;
        }
        return configValue;
    }

    public static getConfigFlag(id: string): boolean {
        let config = Utility.getConfiguration();
        return config.get<boolean>(id);
    }

    public static getHostName(iotHubConnectionString: string): string {
        let result = /^HostName=([^=]+);/.exec(iotHubConnectionString);
        return result ? result[1] : "";
    }
}
