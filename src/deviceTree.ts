import { ConnectionString } from "azure-iot-device";
import * as path from "path";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { DeviceItem } from "./Model/DeviceItem";
import { Utility } from "./utility";
import iothub = require("azure-iothub");

export class DeviceTree implements vscode.TreeDataProvider<DeviceItem> {
    public _onDidChangeTreeData: vscode.EventEmitter<DeviceItem | undefined> = new vscode.EventEmitter<DeviceItem | undefined>();
    public readonly onDidChangeTreeData: vscode.Event<DeviceItem | undefined> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {
    }

    public refresh(): void {
        this._onDidChangeTreeData.fire();
        AppInsightsClient.sendEvent("RefreshDeviceTree");
    }

    public getTreeItem(element: DeviceItem): vscode.TreeItem {
        return element;
    }

    public async getChildren(element?: DeviceItem): Promise<DeviceItem[]> {
        let iotHubConnectionString = await Utility.getConfig("iotHubConnectionString", "IoT Hub Connection String");
        if (!iotHubConnectionString) {
            return;
        }

        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
        let devices = [];
        let hostName = Utility.getHostName(iotHubConnectionString);

        return new Promise<DeviceItem[]>((resolve) => {
            registry.list((err, deviceList) => {
                deviceList.forEach((device, index) => {
                    let image = device.connectionState.toString() === "Connected" ? "device-on.png" : "device-off.png";
                    devices.push(new DeviceItem(device.deviceId,
                        ConnectionString.createWithSharedAccessKey(hostName, device.deviceId, device.authentication.SymmetricKey.primaryKey),
                        this.context.asAbsolutePath(path.join("resources", image)),
                        {
                            command: "azure-iot-toolkit.getDevice",
                            title: "",
                            arguments: [device.deviceId],
                        }));
                });
                resolve(devices);
            });
        });
    }
}
