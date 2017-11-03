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
        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
        let devices = [];
        let hostName = Utility.getHostName(iotHubConnectionString);

        return new Promise<vscode.TreeItem[]>((resolve, reject) => {
            registry.list((err, deviceList) => {
                if (err) {
                    TelemetryClient.sendEvent(Constants.IoTHubAILoadDeviceTreeEvent, { Result: "Fail", Message: err.message });
                    let items = [];
                    items.push(new vscode.TreeItem("Failed to list IoT Hub devices"));
                    items.push(new vscode.TreeItem(`Error: ${err.message}`));
                    resolve(items);
                } else {
                    TelemetryClient.sendEvent(Constants.IoTHubAILoadDeviceTreeEvent, { Result: "Success", DeviceCount: deviceList.length.toString() });
                    deviceList.forEach((device, index) => {
                        let image = device.connectionState.toString() === "Connected" ? "device-on.png" : "device-off.png";
                        let deviceConnectionString = "";
                        if (device.authentication.SymmetricKey.primaryKey != null) {
                            deviceConnectionString = ConnectionString.createWithSharedAccessKey(hostName, device.deviceId,
                                device.authentication.SymmetricKey.primaryKey);
                        } else if (device.authentication.x509Thumbprint.primaryThumbprint != null) {
                            deviceConnectionString = ConnectionString.createWithX509Certificate(hostName, device.deviceId);
                        }
                        devices.push(new DeviceItem(device.deviceId,
                            deviceConnectionString,
                            this.context.asAbsolutePath(path.join("resources", image)),
                            {
                                command: "azure-iot-toolkit.getDevice",
                                title: "",
                                arguments: [device.deviceId],
                            }));
                    });
                    resolve(devices.sort((a, b) => { return a.deviceId < b.deviceId ? -1 : 1; }));
                }
            });
        });
    }
}
