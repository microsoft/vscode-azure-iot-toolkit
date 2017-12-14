"use strict";
import axios from "axios";
import { ConnectionString as DeviceConnectionString } from "azure-iot-device";
import { ConnectionString, Registry, SharedAccessSignature } from "azure-iothub";
import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { DeviceItem } from "./Model/DeviceItem";
import { ModuleItem } from "./Model/ModuleItem";
import { TelemetryClient } from "./telemetryClient";

export class Utility {
    public static getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration("azure-iot-toolkit");
    }

    public static async getConnectionString(id: string, name: string) {
        const connectionString = this.getConnectionStringWithId(id);
        if (!connectionString && Utility.getConfiguration().get<boolean>(Constants.ShowConnectionStringInputBoxKey)) {
            return this.setConnectionString(id, name);
        }
        return connectionString;
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

    public static generateSasTokenForService(iotHubConnectionString: string): string {
        const connectionString = ConnectionString.parse(iotHubConnectionString);
        const expiry = Math.floor(Date.now() / 1000) + 3600;
        return SharedAccessSignature.create(connectionString.HostName, connectionString.SharedAccessKeyName, connectionString.SharedAccessKey, expiry).toString();
    }

    public static adjustTerminalCommand(command: string): string {
        return (os.platform() === "linux" || os.platform() === "darwin") ? `sudo ${command}` : command;
    }

    public static adjustFilePath(filePath: string): string {
        if (os.platform() !== "win32") {
            return filePath;
        }
        const windowsShell = vscode.workspace.getConfiguration("terminal").get<string>("integrated.shell.windows");
        if (!windowsShell) {
            return filePath;
        }
        const terminalRoot = Utility.getConfiguration().get<string>("terminalRoot");
        if (terminalRoot) {
            return filePath.replace(/^([A-Za-z]):/, (match, p1) => `${terminalRoot}${p1.toLowerCase()}`).replace(/\\/g, "/");
        }
        let winshellLowercase = windowsShell.toLowerCase();
        if (winshellLowercase.indexOf("bash") > -1 && winshellLowercase.indexOf("git") > -1) {
            // Git Bash
            return filePath.replace(/^([A-Za-z]):/, (match, p1) => `/${p1.toLowerCase()}`).replace(/\\/g, "/");
        }
        if (winshellLowercase.indexOf("bash") > -1 && winshellLowercase.indexOf("windows") > -1) {
            // Bash on Ubuntu on Windows
            return filePath.replace(/^([A-Za-z]):/, (match, p1) => `/mnt/${p1.toLowerCase()}`).replace(/\\/g, "/");
        }
        return filePath;
    }

    public static getDefaultPath(filename?: string): vscode.Uri {
        if (filename) {
            const defaultPath: string = vscode.workspace.workspaceFolders ? path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, filename) : `*/${filename}`;
            return vscode.Uri.file(defaultPath);
        } else {
            return vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : undefined;
        }
    }

    public static writeFile(filePath: vscode.Uri, content: string): void {
        fs.writeFile(filePath.fsPath, content, (err) => {
            if (err) {
                vscode.window.showErrorMessage(err.message);
                return;
            }
            vscode.window.showTextDocument(filePath);
        });
    }

    public static async getModuleItems(iotHubConnectionString: string, deviceId: string) {
        const [modules, edgeAgent] = await Promise.all([Utility.getModules(iotHubConnectionString, deviceId), Utility.getModuleTwin(iotHubConnectionString, deviceId, "$edgeAgent")]);
        const reportedTwin = (edgeAgent as any).properties.reported;
        return modules.map((module) => {
            if (module.moduleId.startsWith("$")) {
                const moduleId = module.moduleId.substring(1);
                if (reportedTwin.systemModules && reportedTwin.systemModules[moduleId]) {
                    return new ModuleItem(deviceId, module.moduleId, reportedTwin.systemModules[moduleId].runtimeStatus, null);
                }
            } else {
                if (reportedTwin.modules && reportedTwin.modules[module.moduleId]) {
                    return new ModuleItem(deviceId, module.moduleId, reportedTwin.modules[module.moduleId].runtimeStatus, null);
                }
            }
            return new ModuleItem(deviceId, module.moduleId, null, null);
        });
    }

    public static async getModules(iotHubConnectionString: string, deviceId: string): Promise<any[]> {
        const sasToken = Utility.generateSasTokenForService(iotHubConnectionString);
        const hostName = Utility.getHostName(iotHubConnectionString);
        const config = {
            headers: {
                "Authorization": sasToken,
                "Content-Type": "application/json",
            },
        };
        const url = `https://${hostName}/devices/${deviceId}/modules?api-version=${Constants.IoTHubApiVersion}`;

        return (await axios.get(url, config)).data;
    }

    public static async getModuleTwin(iotHubConnectionString: string, deviceId: string, moduleId: string): Promise<string> {
        const sasToken = Utility.generateSasTokenForService(iotHubConnectionString);
        const hostName = Utility.getHostName(iotHubConnectionString);
        const config = {
            headers: {
                "Authorization": sasToken,
                "Content-Type": "application/json",
            },
        };
        const url = `https://${hostName}/twins/${deviceId}/modules/${moduleId}?api-version=${Constants.IoTHubApiVersion}`;

        return (await axios.get(url, config)).data;
    }

    public static async getInputDevice(deviceItem: DeviceItem, eventName: string, onlyEdgeDevice: boolean = false): Promise<DeviceItem> {
        if (!deviceItem) {
            TelemetryClient.sendEvent(eventName, { entry: "commandPalette" });
            const iotHubConnectionString: string = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
            if (!iotHubConnectionString) {
                return null;
            }

            const deviceList: Promise<DeviceItem[]> = Utility.getFilteredDeviceList(iotHubConnectionString, onlyEdgeDevice);
            deviceItem = await vscode.window.showQuickPick(deviceList, { placeHolder: "Select an IoT Hub device" });
            return deviceItem;
        } else {
            TelemetryClient.sendEvent(eventName, { entry: "contextMenu" });
            return deviceItem;
        }
    }

    public static async getDeviceList(iotHubConnectionString: string, context: vscode.ExtensionContext): Promise<DeviceItem[]> {
        const [deviceList, edgeDeviceIdSet] = await Promise.all([Utility.getIoTDeviceList(iotHubConnectionString), Utility.getEdgeDeviceIdSet(iotHubConnectionString)]);
        return deviceList.map((device) => {
            const state: string = device.connectionState.toString() === "Connected" ? "on" : "off";
            let deviceType: string;
            if (edgeDeviceIdSet.has(device.deviceId)) {
                deviceType = "edge";
                device.contextValue = "edge";
                device.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
                device.command = null;
            } else {
                deviceType = "device";
            }
            device.iconPath = context.asAbsolutePath(path.join("resources", `${deviceType}-${state}.svg`));
            return device;
        });
    }

    private static async getFilteredDeviceList(iotHubConnectionString: string, onlyEdgeDevice: boolean): Promise<DeviceItem[]> {
        if (onlyEdgeDevice) {
            const [deviceList, edgeDeviceIdSet] = await Promise.all([Utility.getIoTDeviceList(iotHubConnectionString), Utility.getEdgeDeviceIdSet(iotHubConnectionString)]);
            return deviceList.filter((device) => edgeDeviceIdSet.has(device.deviceId));
        } else {
            return Utility.getIoTDeviceList(iotHubConnectionString);
        }
    }

    private static async getIoTDeviceList(iotHubConnectionString: string): Promise<DeviceItem[]> {
        if (!iotHubConnectionString) {
            return null;
        }

        const registry: Registry = Registry.fromConnectionString(iotHubConnectionString);
        const devices: DeviceItem[] = [];
        const hostName: string = Utility.getHostName(iotHubConnectionString);

        return new Promise<DeviceItem[]>((resolve, reject) => {
            registry.list((err, deviceList) => {
                if (err) {
                    reject(err);
                } else {
                    deviceList.forEach((device, index) => {
                        let deviceConnectionString: string = "";
                        if (device.authentication.SymmetricKey.primaryKey != null) {
                            deviceConnectionString = DeviceConnectionString.createWithSharedAccessKey(hostName, device.deviceId,
                                device.authentication.SymmetricKey.primaryKey);
                        } else if (device.authentication.x509Thumbprint.primaryThumbprint != null) {
                            deviceConnectionString = DeviceConnectionString.createWithX509Certificate(hostName, device.deviceId);
                        }
                        devices.push(new DeviceItem(device.deviceId,
                            deviceConnectionString,
                            null,
                            {
                                command: "azure-iot-toolkit.getDevice",
                                title: "",
                                arguments: [device],
                            },
                            device.connectionState.toString(),
                            null));
                    });
                    resolve(devices.sort((a: DeviceItem, b: DeviceItem) => { return a.deviceId.localeCompare(b.deviceId); }));
                }
            });
        });
    }

    private static async getEdgeDeviceIdSet(iotHubConnectionString: string): Promise<Set<string>> {
        const edgeDevices = await Utility.getEdgeDeviceList(iotHubConnectionString);
        const set = new Set<string>();
        for (const edgeDevice of edgeDevices) {
            set.add(edgeDevice.deviceId);
        }
        return set;
    }

    private static async getEdgeDeviceList(iotHubConnectionString: string): Promise<any[]> {
        const sasToken = Utility.generateSasTokenForService(iotHubConnectionString);
        const hostName = Utility.getHostName(iotHubConnectionString);
        const body = {
            query: "SELECT * FROM DEVICES where capabilities.iotEdge=true",
        };
        const config = {
            headers: {
                "Authorization": sasToken,
                "Content-Type": "application/json",
            },
        };
        const url = `https://${hostName}/devices/query?api-version=${Constants.IoTHubApiVersion}`;

        return (await axios.post(url, body, config)).data;
    }

    private static showIoTHubInformationMessage(): void {
        let config = Utility.getConfiguration();
        let showIoTHubInfo = config.get<boolean>(Constants.ShowIoTHubInfoKey);
        if (showIoTHubInfo) {
            const GoToAzureRegistrationPage = "Go to Azure registration page";
            const GoToAzureIoTHubPage = "Go to Azure IoT Hub page";
            const DoNotShowAgain = "Don't show again";
            vscode.window.showInformationMessage("Don't have Azure IoT Hub? Register a free Azure account to get a free one.",
                GoToAzureRegistrationPage, GoToAzureIoTHubPage, DoNotShowAgain).then((selection) => {
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
                        case DoNotShowAgain:
                            config.update(Constants.ShowIoTHubInfoKey, false, true);
                            TelemetryClient.sendEvent("General.IoTHubInfo.DoNotShowAgain");
                            break;
                        default:
                    }
                });
        }
    }

    private static isValidConnectionString(id: string, value: string): boolean {
        if (!value) {
            return false;
        }
        return Constants.ConnectionStringRegex[id].test(value);
    }
}
