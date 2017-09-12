"use strict";
import * as crypto from "crypto";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { TelemetryClient } from "./telemetryClient";

export class Utility {
    public static getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration("azure-iot-toolkit");
    }

    public static async getConnectionString(id: string, name: string) {
        let config = Utility.getConfiguration();
        let configValue = config.get<string>(id);
        if (!this.isValidConnectionString(id, configValue)) {
            return this.setConnectionString(id, name);
        }
        return configValue;
    }

    public static async setConnectionString(id: string, name: string) {
        TelemetryClient.sendEvent("General.SetConfig.Popup");
        return vscode.window.showInputBox({
            prompt: `${name}`,
            placeHolder: Constants.ConnectionStringFormat[id],
        }).then(async (value: string) => {
            if (value !== undefined) {
                if (this.isValidConnectionString(id, value)) {
                    TelemetryClient.sendEvent("General.SetConfig.Done", { Result: "Success" });
                    let config = Utility.getConfiguration();
                    config.update(id, value, true);
                } else {
                    TelemetryClient.sendEvent("General.SetConfig.Done", { Result: "Fail" });
                    value = null;
                    const reset = "Reset";
                    const GoToConnectionStringPage = "More info";
                    await vscode.window.showErrorMessage(`The format should be "${Constants.ConnectionStringFormat[id]}". Please enter a valid ${name}.`,
                        reset, GoToConnectionStringPage).then(async (selection) => {
                            switch (selection) {
                                case reset:
                                    TelemetryClient.sendEvent("General.Reset.ConnectionString");
                                    value = await this.setConnectionString(id, name);
                                    break;
                                case GoToConnectionStringPage:
                                    vscode.commands.executeCommand("vscode.open",
                                        vscode.Uri.parse(
                                            `https://blogs.msdn.microsoft.com/iotdev/2017/05/09/understand-different-connection-strings-in-azure-iot-hub/?WT.mc_id=${Constants.CampaignID}`));
                                    TelemetryClient.sendEvent("General.Open.ConnectionStringPage");
                                    break;
                                default:
                            }
                        });
                }
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
        if (!this.isValidConnectionString(id, configValue)) {
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

    private static showIoTHubInformationMessage(): void {
        const GoToAzureRegistrationPage = "Go to Azure registration page";
        const GoToAzureIoTHubPage = "Go to Azure IoT Hub page";
        vscode.window.showInformationMessage("Don't have Azure IoT Hub? Register a free Azure account to get a free one.",
            GoToAzureRegistrationPage, GoToAzureIoTHubPage).then((selection) => {
                switch (selection) {
                    case GoToAzureRegistrationPage:
                        vscode.commands.executeCommand("vscode.open",
                            vscode.Uri.parse(`https://azure.microsoft.com/en-us/free/?WT.mc_id=${Constants.CampaignID}`));
                        TelemetryClient.sendEvent("General.Open.AzureRegistrationPage");
                        break;
                    case GoToAzureIoTHubPage:
                        vscode.commands.executeCommand("vscode.open",
                            vscode.Uri.parse(`https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-get-started?WT.mc_id=${Constants.CampaignID}`));
                        TelemetryClient.sendEvent("General.Open.AzureIoTHubPage");
                        break;
                    default:
                }
            });
    }

    private static isValidConnectionString(id: string, value: string): boolean {
        if (!value) {
            return false;
        }
        return Constants.ConnectionStringRegex[id].test(value);
    }
}
