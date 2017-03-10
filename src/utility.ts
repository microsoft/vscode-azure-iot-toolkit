"use strict";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";

export class Utility {
    public static getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration("azure-iot-toolkit");
    }

    public static getConfig(id: string, name: string): string {
        let config = Utility.getConfiguration();
        let value = config.get<string>(id);
        if (!value || value.startsWith("<<insert")) {
            vscode.window.showErrorMessage(`Please set your ${name} (${id}) in User Settings`);
            vscode.commands.executeCommand("workbench.action.openGlobalSettings");
            AppInsightsClient.sendEvent("OpenSettings");
            return null;
        }
        return value;
    }
}
