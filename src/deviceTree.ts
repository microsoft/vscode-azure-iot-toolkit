import { ConnectionString } from "azure-iot-device";
import * as path from "path";
import * as vscode from "vscode";
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
    }

    public getTreeItem(element: DeviceItem): vscode.TreeItem {
        return element;
    }

    public getChildren(element?: DeviceItem): Thenable<DeviceItem[]> {
        let iotHubConnectionString = Utility.getConfig("iotHubConnectionString", "IoT Hub Connection String");
        if (!iotHubConnectionString) {
            return;
        }

        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
        let devices = [];
        let result = /^HostName=([^=]+);/.exec(iotHubConnectionString);
        let hostName = result[1];

        return new Promise((resolve) => {
            registry.list((err, deviceList) => {
                deviceList.forEach((device, index) => {
                    devices.push(new DeviceItem(device.deviceId,
                        ConnectionString.createWithSharedAccessKey(hostName, device.deviceId, device.authentication.SymmetricKey.primaryKey),
                        this.context.asAbsolutePath(path.join("resources", "device.png"))));
                });
                resolve(devices);
            });
        });
    }
}
