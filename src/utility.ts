// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { ResultWithHttpResponse } from "azure-iot-common";
import { ConnectionString as DeviceConnectionString, SharedAccessSignature as DeviceSharedAccessSignature } from "azure-iot-device";
import { ConnectionString, Registry, SharedAccessSignature, Twin } from "azure-iothub";
import { IotHubModels} from "@azure/arm-iothub";
import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { DeviceItem } from "./Model/DeviceItem";
import { ModuleItem } from "./Model/ModuleItem";
import { CommandNode } from "./Nodes/CommandNode";
import { InfoNode } from "./Nodes/InfoNode";
import { INode } from "./Nodes/INode";
import { TelemetryClient } from "./telemetryClient";
import { ReceivedEventData, EventData } from "@azure/event-hubs";
import { AxiosRequestConfig, Method } from "axios";
import { AzureAccount } from "./azure-account.api";
import { CredentialStore } from "./credentialStore";
import { ResultWithIncomingMessage } from "azure-iothub/dist/interfaces";

export class Utility {
    public static getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration("azure-iot-toolkit");
    }

    public static async getConnectionString(id: string, name: string, askForConnectionString: boolean = true, helpfile: string = "iot-hub-connection-string.md") {
        const connectionString = await this.getConnectionStringWithId(id);
        if (!connectionString && askForConnectionString) {
            return this.setConnectionString(id, name, helpfile);
        }
        return connectionString;
    }

    public static async setConnectionString(id: string, name: string, helpfile: string = "iot-hub-connection-string.md") {
        TelemetryClient.sendEvent("General.SetConfig.Popup");
        return new Promise<string>((resolve) => {
            let value: string | PromiseLike<string>;
            const input = vscode.window.createInputBox();
            input.prompt = name;
            input.placeholder = Constants.ConnectionStringFormat[id];
            input.ignoreFocusOut = true;
            input.onDidAccept(async () => {
                value = input.value;
                if (this.isValidConnectionString(id, value)) {
                    TelemetryClient.sendEvent("General.SetConfig.Done", { Result: "Success" });
                    await CredentialStore.setPassword(id, value);
                    if (id === Constants.IotHubConnectionStringKey) {
                        await CredentialStore.setPassword(Constants.IotHubEventHubConnectionStringKey, undefined);
                        await Utility.deleteIoTHubInfo();
                    }
                    resolve(value);
                    input.dispose();
                } else {
                    TelemetryClient.sendEvent("General.SetConfig.Done", { Result: "Fail" });
                    vscode.commands.executeCommand("markdown.showPreview", vscode.Uri.file(Constants.ExtensionContext.asAbsolutePath(path.join("resources", helpfile))));
                    input.validationMessage = `The format should be "${Constants.ConnectionStringFormat[id]}"`;
                }
            });
            input.onDidHide(() => {
                resolve();
                input.dispose();
                if (!value) {
                    this.showIoTHubInformationMessage();
                }
            });
            input.show();
        });
    }

    public static async getConnectionStringWithId(id: string) {
        let configValue = await CredentialStore.getPassword(id);
        if (!configValue) {
            configValue = Utility.getConfiguration().get<string>(id);
        }
        if (!this.isValidConnectionString(id, configValue)) {
            return null;
        }
        return configValue;
    }

    public static getConfig<T>(id: string): T {
        const config = Utility.getConfiguration();
        return config.get<T>(id);
    }

    public static getHostName(iotHubConnectionString: string): string {
        const result = /^HostName=([^=]+);/.exec(iotHubConnectionString);
        return result ? result[1] : "";
    }

    public static getIoTHubName(iotHubConnectionString: string): string {
        const result = /^HostName=([^.]+)./.exec(iotHubConnectionString);
        return result ? result[1] : "";
    }

    public static getPostfixFromHostName(hostName: string): string {
        const result = /^[^.]+\.(.+)$/.exec(hostName);
        return result ? result[1] : "";
    }

    public static hash(data: string): string {
        return crypto.createHash("sha256").update(data).digest("hex");
    }

    public static generateSasTokenForService(iotHubConnectionString: string, expiryInHours = 1): string {
        const connectionString = ConnectionString.parse(iotHubConnectionString);
        const expiry = Math.floor(Date.now() / 1000) + expiryInHours * 60 * 60;
        return SharedAccessSignature.create(connectionString.HostName, connectionString.SharedAccessKeyName, connectionString.SharedAccessKey, expiry).toString();
    }

    public static generateSasTokenForDevice(deviceConnectionString: string, expiryInHours = 1): string {
        const connectionString = DeviceConnectionString.parse(deviceConnectionString);
        const expiry = Math.floor(Date.now() / 1000) + expiryInHours * 60 * 60;
        return DeviceSharedAccessSignature.create(connectionString.HostName, connectionString.DeviceId, connectionString.SharedAccessKey, expiry).toString();
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
        const winshellLowercase = windowsShell.toLowerCase();
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

    public static async getModuleItems(iotHubConnectionString: string, deviceItem: DeviceItem, context: vscode.ExtensionContext) {
        const modules = await Utility.getModules(iotHubConnectionString, deviceItem.deviceId);
        return modules.map((module) => {
            const isConnected = module.connectionState === "Connected";
            const state = isConnected ? "on" : "off";
            const iconPath = context.asAbsolutePath(path.join("resources", `module-${state}.svg`));
            return new ModuleItem(deviceItem, module.moduleId, module.connectionString, module.connectionState, null, iconPath, "module");
        });
    }

    public static async getModuleItemsForEdge(iotHubConnectionString: string, deviceItem: DeviceItem, context: vscode.ExtensionContext) {
        /**
         * modules: contains connection state of each module
         * edgeAgent.properties.reported: contains runtime status of each module
         */
        const [modules, edgeAgent] = await Promise.all([
            Utility.getModules(iotHubConnectionString, deviceItem.deviceId),
            Utility.getModuleTwin(iotHubConnectionString, deviceItem.deviceId, "$edgeAgent"),
        ]);
        const desiredTwin = (edgeAgent as any).properties.desired;
        const reportedTwin = (edgeAgent as any).properties.reported;

        return modules.map((module) => {
            let isConnected = module.connectionState === "Connected";
            // Due to https://github.com/Azure/iotedge/issues/39, use $edgeAgent's connectionState for $edgeHub as workaround
            if (module.moduleId === "$edgeHub") {
                isConnected = isConnected || (edgeAgent as any).connectionState === "Connected";
                if (isConnected) {
                    module.connectionState = "Connected";
                }
            }
            const state = isConnected ? "on" : "off";
            const iconPath = context.asAbsolutePath(path.join("resources", `module-${state}.svg`));
            if (module.moduleId.startsWith("$")) {
                const moduleId = module.moduleId.substring(1);
                if (desiredTwin.systemModules && desiredTwin.systemModules[moduleId]) {
                    return new ModuleItem(deviceItem, module.moduleId, module.connectionString, module.connectionState,
                        reportedTwin ? this.getModuleRuntimeStatus(moduleId, reportedTwin.systemModules) : undefined, iconPath, "edge-module");
                }
            } else {
                if (desiredTwin.modules && desiredTwin.modules[module.moduleId]) {
                    return new ModuleItem(deviceItem, module.moduleId, module.connectionString, module.connectionState,
                        reportedTwin ? this.getModuleRuntimeStatus(module.moduleId, reportedTwin.modules) : undefined, iconPath, "edge-module");
                }
            }
            const moduleType = module.moduleId.startsWith("$") ? "edge-module" : "module";
            // If Module Id starts with "$", then it is a IoT Edge System Module.
            // Otherwise, if a Module does not exist in desired properties of edgeAgent, then it is a Module Identity.
            return new ModuleItem(deviceItem, module.moduleId, module.connectionString, module.connectionState, null, iconPath, moduleType);
        }).filter((module) => module);
    }

    public static async getModules(iotHubConnectionString: string, deviceId: string): Promise<any[]> {
        const registry: Registry = Registry.fromConnectionString(iotHubConnectionString);
        const hostName: string = Utility.getHostName(iotHubConnectionString);

        return new Promise<any[]>((resolve, reject) => {
            registry.getModulesOnDevice(deviceId, (err, modules) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(modules.map((module) => {
                        if (module.authentication.symmetricKey.primaryKey) {
                            (module as any).connectionString = Utility.createModuleConnectionString(hostName, deviceId, module.moduleId, module.authentication.symmetricKey.primaryKey);
                        }
                        return module;
                    }));
                }
            });
        });
    }

    public static async getModuleTwin(iotHubConnectionString: string, deviceId: string, moduleId: string): Promise<Twin> {
        const registry: Registry = Registry.fromConnectionString(iotHubConnectionString);
        return ((await registry.getModuleTwin(deviceId, moduleId)) as ResultWithHttpResponse<Twin>).responseBody;
    }

    public static async updateModuleTwin(iotHubConnectionString: string, deviceId: string, moduleId: string, twin: any): Promise<void> {
        const registry: Registry = Registry.fromConnectionString(iotHubConnectionString);
        await registry.updateModuleTwin(deviceId, moduleId, twin, "*");
    }

    public static async readFromActiveFile(fileName: string): Promise<string> {
        const activeTextEditor = vscode.window.activeTextEditor;
        if (!activeTextEditor || !activeTextEditor.document || path.basename(activeTextEditor.document.fileName) !== fileName) {
            vscode.window.showWarningMessage(`Please open ${fileName} and try again.`);
            return "";
        }
        const document = activeTextEditor.document;
        await document.save();
        return document.getText();
    }

    public static writeJson(filePath: string, data) {
        const directory = path.dirname(filePath);
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory);
        }
        fs.writeFileSync(filePath, `${JSON.stringify(data, null, 4)}`);
    }

    public static async getInputDevice(deviceItem: DeviceItem, eventName: string, onlyEdgeDevice: boolean = false, iotHubConnectionString?: string): Promise<DeviceItem> {
        if (!deviceItem) {
            if (eventName) {
                TelemetryClient.sendEvent(eventName, { entry: "commandPalette" });
            }
            if (!iotHubConnectionString) {
                iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
                if (!iotHubConnectionString) {
                    return null;
                }
            }

            const deviceList: Promise<DeviceItem[]> = Utility.getFilteredDeviceList(iotHubConnectionString, onlyEdgeDevice);
            deviceItem = await vscode.window.showQuickPick(deviceList, { placeHolder: "Select an IoT Hub device" });
            return deviceItem;
        } else {
            if (eventName) {
                TelemetryClient.sendEvent(eventName, { entry: "contextMenu", deviceType: deviceItem.contextValue });
            }
            return deviceItem;
        }
    }

    public static async getDeviceList(iotHubConnectionString: string, context?: vscode.ExtensionContext): Promise<DeviceItem[]> {
        const [deviceList, edgeDeviceIdSet] = await Promise.all([Utility.getIoTDeviceList(iotHubConnectionString), Utility.getEdgeDeviceIdSet(iotHubConnectionString)]);
        return deviceList.map((device) => {
            const isConnected = device.connectionState.toString() === "Connected";
            const state: string = isConnected ? "on" : "off";
            let deviceType: string;
            if (edgeDeviceIdSet.has(device.deviceId)) {
                deviceType = "edge";
                device.contextValue = "edge";
                device.tooltip = "";
            } else {
                deviceType = "device";
            }
            if (context) {
                device.iconPath = context.asAbsolutePath(path.join("resources", `${deviceType}-${state}.svg`));
            }
            return device;
        });
    }

    public static async getNoneEdgeDeviceIdList(iotHubConnectionString: string): Promise<string[]> {
        const noneEdgeDevices = await this.queryDeviceTwins(iotHubConnectionString, false);
        const deviceIdList = [];
        for (const noneEdgeDevice of noneEdgeDevices) {
            deviceIdList.push(noneEdgeDevice.deviceId);
        }

        return deviceIdList;
    }

    public static isValidTargetCondition(value: string): boolean {
        return /^(\*|((deviceId|tags\..+|properties\.reported\..+).*=.+))$/.test(value);
    }

    public static getResourceGroupNameFromId(resourceId: string): string {
        const result = /resourceGroups\/([^/]+)\//.exec(resourceId);
        return result[1];
    }

    public static createModuleConnectionString(hostName: string, deviceId: string, moduleId: string, sharedAccessKey: string): string {
        return `HostName=${hostName};DeviceId=${deviceId};ModuleId=${moduleId};SharedAccessKey=${sharedAccessKey}`;
    }

    public static getDefaultTreeItems(): INode[] {
        TelemetryClient.sendEvent("General.Load.DefaultTreeItems");
        const items = [];
        items.push(new CommandNode("-> Set IoT Hub Connection String", "azure-iot-toolkit.setIoTHubConnectionString"));
        items.push(new CommandNode("-> Select IoT Hub", "azure-iot-toolkit.selectIoTHub"));
        items.push(new CommandNode("-> Create IoT Hub", "azure-iot-toolkit.createIoTHub"));
        return items;
    }

    public static getErrorMessageTreeItems(item: string, error: string): INode[] {
        const items = [];
        items.push(new InfoNode(`Failed to list ${item}`));
        items.push(new InfoNode(`Error: ${error}`));
        items.push(new InfoNode(`Try another IoT Hub?`));
        items.push(...this.getDefaultTreeItems());
        return items;
    }

    public static parseReportedSamplingMode(twin: any): boolean {
        const reportedDistributedTwinObject = twin.properties.reported[Constants.DISTRIBUTED_TWIN_NAME];
        if (reportedDistributedTwinObject.sampling_mode === undefined || reportedDistributedTwinObject.sampling_mode.value === undefined) {
            return undefined;
        }
        return twin.properties.reported[Constants.DISTRIBUTED_TWIN_NAME].sampling_mode.value === 1;
    }

    public static parseReportedSamplingRate(twin: any): number {
        const reportedDistributedTwinObject = twin.properties.reported[Constants.DISTRIBUTED_TWIN_NAME];
        if (reportedDistributedTwinObject.sampling_rate === undefined) {
            return undefined;
        }
        return twin.properties.reported[Constants.DISTRIBUTED_TWIN_NAME].sampling_rate.value;
    }

    public static parseDesiredSamplingMode(twin: any): boolean {
        if (twin.properties.desired[Constants.DISTRIBUTED_TWIN_NAME].sampling_mode === undefined) {
            return undefined;
        }

        return twin.properties.desired[Constants.DISTRIBUTED_TWIN_NAME].sampling_mode === 1;
    }

    public static parseDesiredSamplingRate(twin: any): number {
        return twin.properties.desired[Constants.DISTRIBUTED_TWIN_NAME].sampling_rate;
    }

    public static async getTwin(registry: Registry, deviceId: string): Promise<any> {
        const result = await registry.getTwin(deviceId);
        return result.responseBody;
    }

    public static getAzureAccountApi(): AzureAccount {
        return vscode.extensions.getExtension<AzureAccount>("ms-vscode.azure-account")!.exports;
    }

    public static getMessageFromEventData(message: any): any {
        const config = Utility.getConfiguration();
        const showVerboseMessage = config.get<boolean>("showVerboseMessage");
        let result;
        const body = Utility.tryGetStringFromCharCode(message.body);
        if (showVerboseMessage) {
            result = {
                body,
                applicationProperties: message.applicationProperties,
                annotations: message.annotations,
                properties: message.properties,
                systemProperties: message.systemProperties
            };
        } else if (message.applicationProperties && Object.keys(message.applicationProperties).length > 0) {
            result = {
                body,
                applicationProperties: message.applicationProperties,
            };
        } else {
            result = body;
        }
        return result;
    }

    public static getTimeMessageFromEventData(message: ReceivedEventData): string {
        return message.enqueuedTimeUtc ? `[${message.enqueuedTimeUtc.toLocaleTimeString("en-US")}] ` : "";
    }

    public static async storeIoTHubInfo(subscriptionId: string, iotHubDescription: IotHubModels.IotHubDescription) {
        await Constants.ExtensionContext.globalState.update(Constants.StateKeySubsID, subscriptionId);
        await Constants.ExtensionContext.globalState.update(Constants.StateKeyIoTHubID, iotHubDescription.id);
    }

    public static async deleteIoTHubInfo() {
        await Constants.ExtensionContext.globalState.update(Constants.StateKeySubsID, "");
        await Constants.ExtensionContext.globalState.update(Constants.StateKeyIoTHubID, "");
    }

    public static async getFilteredDeviceList(iotHubConnectionString: string, onlyEdgeDevice: boolean): Promise<DeviceItem[]> {
        if (onlyEdgeDevice) {
            const [deviceList, edgeDeviceIdSet] = await Promise.all([Utility.getIoTDeviceList(iotHubConnectionString), Utility.getEdgeDeviceIdSet(iotHubConnectionString)]);
            return deviceList.filter((device) => edgeDeviceIdSet.has(device.deviceId));
        } else {
            return Utility.getIoTDeviceList(iotHubConnectionString);
        }
    }

    public static generateIoTHubAxiosRequestConfig(iotHubConnectionString: string, url: string, method: Method, data?: any): AxiosRequestConfig {
        return {
            url,
            method,
            baseURL: `https://${Utility.getHostName(iotHubConnectionString)}`,
            headers: {
                Authorization: Utility.generateSasTokenForService(iotHubConnectionString),
            },
            data,
        };
    }

    public static getReportedInterfacesFromDigitalTwin(interfaces) {
        return interfaces &&
            interfaces.interfaces &&
            interfaces.interfaces[Constants.modelDiscoveryInterfaceName] &&
            interfaces.interfaces[Constants.modelDiscoveryInterfaceName].properties &&
            interfaces.interfaces[Constants.modelDiscoveryInterfaceName].properties.modelInformation &&
            interfaces.interfaces[Constants.modelDiscoveryInterfaceName].properties.modelInformation.reported &&
            interfaces.interfaces[Constants.modelDiscoveryInterfaceName].properties.modelInformation.reported.value &&
            interfaces.interfaces[Constants.modelDiscoveryInterfaceName].properties.modelInformation.reported.value.interfaces;
    }

    private static tryGetStringFromCharCode(source) {
        if (source instanceof Uint8Array) {
            try {
                source = String.fromCharCode.apply(null, source);
            } catch (e) {
            }
        }
        return source;
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
                            device.connectionState.toString(),
                            null));
                    });
                    resolve(devices.sort((a: DeviceItem, b: DeviceItem) => { return a.deviceId.localeCompare(b.deviceId); }));
                }
            });
        });
    }

    private static async getEdgeDeviceIdSet(iotHubConnectionString: string): Promise<Set<string>> {
        const edgeDevices = await Utility.queryDeviceTwins(iotHubConnectionString, true);
        const set = new Set<string>();
        for (const edgeDevice of edgeDevices) {
            set.add(edgeDevice.deviceId);
        }
        return set;
    }

    private static async queryDeviceTwins(iotHubConnectionString: string, isEdge: boolean): Promise<Twin[]> {
        const registry: Registry = Registry.fromConnectionString(iotHubConnectionString);
        const query = registry.createQuery("SELECT * FROM DEVICES where capabilities.iotEdge=" + isEdge);
        return ((await query.nextAsTwin()) as ResultWithIncomingMessage<Twin[]>).result;
    }

    private static showIoTHubInformationMessage(): void {
        const config = Utility.getConfiguration();
        const showIoTHubInfo = config.get<boolean>(Constants.ShowIoTHubInfoKey);
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

    private static getModuleRuntimeStatus(moduleId: string, modules): string {
        if (modules && modules[moduleId]) {
            return modules[moduleId].runtimeStatus;
        } else {
            return undefined;
        }
    }
}
