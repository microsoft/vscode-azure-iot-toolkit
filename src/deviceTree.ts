import { ConnectionString } from "azure-iot-device";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { DeviceItem } from "./Model/DeviceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";
import iothub = require("azure-iothub");

export class DeviceTree implements vscode.TreeDataProvider<vscode.TreeItem> {
    public _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<vscode.TreeItem | undefined>();
    public readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {
    }

    public refresh(): void {
        this._onDidChangeTreeData.fire();
        TelemetryClient.sendEvent("AZ.RefreshDeviceTree");
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
        let iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        TelemetryClient.sendEvent(Constants.IoTHubAIStartLoadDeviceTreeEvent);
        try {
            let [deviceList, edgeDeviceIdSet] = await Promise.all([Utility.getDeviceList(iotHubConnectionString), Utility.getEdgeDeviceIdSet(iotHubConnectionString)]);
            deviceList = deviceList.map((device) => {
                const state: string = device.connectionState.toString() === "Connected" ? "on" : "off";
                let deviceType: string;
                if (edgeDeviceIdSet.has(device.deviceId)) {
                    deviceType = "edge";
                    device.contextValue = "edge";
                } else {
                    deviceType = "device";
                }
                device.iconPath = this.context.asAbsolutePath(path.join("resources", `${deviceType}-${state}.png`));
                return device;
            });

            TelemetryClient.sendEvent(Constants.IoTHubAILoadDeviceTreeEvent, { Result: "Success", DeviceCount: deviceList.length.toString() });
            return new Promise<vscode.TreeItem[]>((resolve, reject) => {
                resolve(deviceList);
            });
        } catch (err) {
            return new Promise<vscode.TreeItem[]>((resolve, reject) => {
                TelemetryClient.sendEvent(Constants.IoTHubAILoadDeviceTreeEvent, { Result: "Fail", Message: err.message });
                let items = [];
                items.push(new vscode.TreeItem("Failed to list IoT Hub devices"));
                items.push(new vscode.TreeItem(`Error: ${err.message}`));
                resolve(items);
            });
        }
    }
}
