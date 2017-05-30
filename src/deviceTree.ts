import * as vscode from "vscode";
import { Utility } from "./utility";
import iothub = require("azure-iothub");

export class DeviceTree implements vscode.TreeDataProvider<string> {
    public getTreeItem(element: string): vscode.TreeItem {
        return <vscode.TreeItem> {
            label: element,
        };
    }

    public getChildren(element?: string): Thenable<string[]> {
        let iotHubConnectionString = Utility.getConfig("iotHubConnectionString", "IoT Hub Connection String");
        if (!iotHubConnectionString) {
            return;
        }

        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
        let devices = [];

        return new Promise((resolve) => {
            registry.list((err, deviceList) => {
                deviceList.forEach((device, index) => {
                    devices.push(device.deviceId);
                });
                resolve(devices);
            });
        });
    }
}
