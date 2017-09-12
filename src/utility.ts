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
            } else {
                this.showIoTHubInformationMessage();
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

    public static showIoTHubInformationMessage(): void {
        const GoToAzureRegistrationPage = "Go to Azure registration page";
        const GoToAzureIoTHubPage = "Go to Azure IoT Hub page";
        vscode.window.showInformationMessage("Don't have Azure IoT Hub? Register a free Azure account to get a free one.",
            GoToAzureRegistrationPage, GoToAzureIoTHubPage).then((selection) => {
                switch (selection) {
                    case GoToAzureRegistrationPage:
                        vscode.commands.executeCommand("vscode.open",
                            vscode.Uri.parse("https://azure.microsoft.com/en-us/free/"));
                        TelemetryClient.sendEvent("General.Open.AzureRegistrationPage");
                        break;
                    case GoToAzureIoTHubPage:
                        vscode.commands.executeCommand("vscode.open",
                            vscode.Uri.parse("https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-get-started"));
                        TelemetryClient.sendEvent("General.Open.AzureIoTHubPage");
                        break;
                    default:
                }
            });
    }
}
