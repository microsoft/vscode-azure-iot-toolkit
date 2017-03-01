"use strict";
import * as vscode from "vscode";

export class Utility {
    public static getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration("azure-iot-toolkit");
    }

    public static getConfig(id: string, name: string): string {
        let config = Utility.getConfiguration();
        let value = config.get<string>(id);
        if (!value || value.startsWith("<<insert")) {
            vscode.window.showErrorMessage(`Please set your ${name} in settings.json`);
            return null;
        }
        return value;
    }
}
