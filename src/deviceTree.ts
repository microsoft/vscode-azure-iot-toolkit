// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Constants } from "./constants";
import { DeviceItem } from "./Model/DeviceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class DeviceTree implements vscode.TreeDataProvider<vscode.TreeItem> {
    public _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<vscode.TreeItem | undefined>();
    public readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;
    private autoRefreshIntervalID: NodeJS.Timer;

    constructor(private context: vscode.ExtensionContext) {
    }

    public refresh(element): void {
        this._onDidChangeTreeData.fire(element);
        TelemetryClient.sendEvent("AZ.Refresh");
    }

    public async setIoTHubConnectionString() {
        TelemetryClient.sendEvent("General.Set.IoTHubConnectionString");
        const iotHubConnectionString = await Utility.setConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (iotHubConnectionString) {
            vscode.window.showInformationMessage(`${Constants.IotHubConnectionStringTitle} is updated.`);
            this._onDidChangeTreeData.fire();
        }
    }

    public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    public async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle, false);
        if (!iotHubConnectionString) {
            return this.getDefaultTreeItems();
        }

        if (element && element.contextValue === "edge") {
            TelemetryClient.sendEvent(Constants.IoTHubAILoadEdgeModuleTreeStartEvent);
            try {
                const moduleList: vscode.TreeItem[] = await Utility.getModuleItemsForEdge(iotHubConnectionString, element as DeviceItem, this.context);
                TelemetryClient.sendEvent(Constants.IoTHubAILoadEdgeModuleTreeDoneEvent, { Result: "Success" });
                return moduleList;
            } catch (err) {
                TelemetryClient.sendEvent(Constants.IoTHubAILoadEdgeModuleTreeDoneEvent, { Result: "Fail", Message: err.message });
                return this.getErrorMessageTreeItems("modules", err.message);
            }
        } else if (element && element.contextValue === "device") {
            TelemetryClient.sendEvent(Constants.IoTHubAILoadModuleTreeStartEvent);
            try {
                const moduleList: vscode.TreeItem[] = await Utility.getModuleItems(iotHubConnectionString, element as DeviceItem, this.context);
                TelemetryClient.sendEvent(Constants.IoTHubAILoadModuleTreeDoneEvent, { Result: "Success" });
                if (moduleList.length === 0) {
                    moduleList.push(new vscode.TreeItem(`No modules`));
                }
                return moduleList;
            } catch (err) {
                TelemetryClient.sendEvent(Constants.IoTHubAILoadModuleTreeDoneEvent, { Result: "Fail", Message: err.message });
                return this.getErrorMessageTreeItems("modules", err.message);
            }
        } else {
            if (this.autoRefreshIntervalID) {
                clearInterval(this.autoRefreshIntervalID);
            }
            TelemetryClient.sendEvent(Constants.IoTHubAIStartLoadDeviceTreeEvent);
            try {
                const deviceList: vscode.TreeItem[] = await Utility.getDeviceList(iotHubConnectionString, this.context);
                TelemetryClient.sendEvent(Constants.IoTHubAILoadDeviceTreeEvent, { Result: "Success", DeviceCount: deviceList.length.toString() });
                if (deviceList.length === 0) {
                    deviceList.push(new vscode.TreeItem(`No devices in ${Utility.getHostName(iotHubConnectionString)}`));
                }
                this.autoRefreshIntervalID = this.generateAutoRefreshInterval();
                return deviceList;
            } catch (err) {
                TelemetryClient.sendEvent(Constants.IoTHubAILoadDeviceTreeEvent, { Result: "Fail", Message: err.message });
                return this.getErrorMessageTreeItems("IoT Hub devices", err.message);
            }
        }
    }

    private getDefaultTreeItems(): vscode.TreeItem[] {
        TelemetryClient.sendEvent("General.Load.DefaultTreeItems");
        const items = [];
        items.push(this.createCommandItem("-> Set IoT Hub Connection String", "azure-iot-toolkit.setIoTHubConnectionString"));
        items.push(this.createCommandItem("-> Select IoT Hub", "azure-iot-toolkit.selectIoTHub"));
        items.push(this.createCommandItem("-> Create IoT Hub", "azure-iot-toolkit.createIoTHub"));
        return items;
    }

    private getErrorMessageTreeItems(item: string, error: string): vscode.TreeItem[] {
        const items = [];
        items.push(new vscode.TreeItem(`Failed to list ${item}`));
        items.push(new vscode.TreeItem(`Error: ${error}`));
        items.push(new vscode.TreeItem(`Try another IoT Hub?`));
        items.push(...this.getDefaultTreeItems());
        return items;
    }

    private createCommandItem(label: string, command: string): vscode.TreeItem {
        const commandItem = new vscode.TreeItem(label);
        commandItem.command = {
            command,
            title: "",
        };
        return commandItem;
    }

    private generateAutoRefreshInterval(): NodeJS.Timer {
        let treeViewAutoRefreshEnable = Utility.getConfig<boolean>(Constants.TreeViewAutoRefreshEnableKey);
        if (treeViewAutoRefreshEnable) {
            let treeViewAutoRefreshIntervalInSeconds = Utility.getConfig<number>(Constants.TreeViewAutoRefreshIntervalInSecondsKey);
            return setInterval(() => {
                this._onDidChangeTreeData.fire();
            }, treeViewAutoRefreshIntervalInSeconds * 1000);
        }
        return undefined;
    }
}
