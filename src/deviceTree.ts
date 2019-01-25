// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Constants } from "./constants";
import { DeviceItem } from "./Model/DeviceItem";
import { DeviceNode } from "./Nodes/DeviceNode";
import { InfoNode } from "./Nodes/InfoNode";
import { INode } from "./Nodes/INode";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class DeviceTree implements vscode.TreeDataProvider<INode> {
    public _onDidChangeTreeData: vscode.EventEmitter<INode | undefined> = new vscode.EventEmitter<INode | undefined>();
    public readonly onDidChangeTreeData: vscode.Event<INode | undefined> = this._onDidChangeTreeData.event;
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

    public getTreeItem(element: INode): Promise<vscode.TreeItem> | vscode.TreeItem  {
        return element.getTreeItem();
    }

    public async getChildren(element?: INode): Promise<INode[]> {
        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle, false);
        if (!iotHubConnectionString) {
            return Utility.getDefaultTreeItems();
        }

        if (!element) {
          return this.showDeviceList(iotHubConnectionString);
        }

        return element.getChildren(this.context, iotHubConnectionString);
    }

    private async showDeviceList(iotHubConnectionString: string) {
        if (this.autoRefreshIntervalID) {
            clearInterval(this.autoRefreshIntervalID);
        }
        TelemetryClient.sendEvent(Constants.IoTHubAIStartLoadDeviceTreeEvent);

        try {
            const deviceList: vscode.TreeItem[] = await Utility.getDeviceList(iotHubConnectionString, this.context);
            this.autoRefreshIntervalID = this.generateAutoRefreshInterval();

            let deviceNode: INode[] = deviceList.map((item) => new DeviceNode(item as DeviceItem));

            if (deviceNode.length === 0) {
                deviceNode.push(new InfoNode(`No devices in ${Utility.getHostName(iotHubConnectionString)}`));
            }

            TelemetryClient.sendEvent(Constants.IoTHubAILoadDeviceTreeEvent, { Result: "Success", DeviceCount: deviceList.length.toString() });

            return deviceNode;
        } catch (err) {
            TelemetryClient.sendEvent(Constants.IoTHubAILoadDeviceTreeEvent, { Result: "Fail", Message: err.message });
            return Utility.getErrorMessageTreeItems("IoT Hub devices", err.message);
        }
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
