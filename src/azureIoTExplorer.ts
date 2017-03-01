"use strict";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { DeviceController } from "./deviceController";
import { DeviceDiscoverer } from "./deviceDiscoverer";
import { DeviceExplorer } from "./deviceExplorer";
import { EventHubMessageExplorer } from "./eventHubMessageExplorer";
import { IoTHubMessageExplorer } from "./iotHubMessageExplorer";

export class AzureIoTExplorer {
    private _iotHubMessageExplorer: IoTHubMessageExplorer;
    private _eventHubMessageExplorer: EventHubMessageExplorer;
    private _deviceExplorer: DeviceExplorer;
    private _deviceDiscoverer: DeviceDiscoverer;
    private _deviceController: DeviceController;

    constructor(context: vscode.ExtensionContext) {
        let outputChannel = vscode.window.createOutputChannel("Azure IoT Toolkit");
        let appInsightsClient = new AppInsightsClient();
        this._iotHubMessageExplorer = new IoTHubMessageExplorer(outputChannel, appInsightsClient);
        this._eventHubMessageExplorer = new EventHubMessageExplorer(outputChannel, appInsightsClient);
        this._deviceExplorer = new DeviceExplorer(outputChannel, appInsightsClient);
        this._deviceDiscoverer = new DeviceDiscoverer(context, outputChannel, appInsightsClient);
        this._deviceController = new DeviceController(outputChannel, appInsightsClient);
    }

    public sendD2CMessage(): void {
        this._iotHubMessageExplorer.sendD2CMessage();
    }

    public startMonitorIoTHubMessage(): void {
        this._iotHubMessageExplorer.startMonitorIoTHubMessage();
    }

    public stopMonitorIoTHubMessage(): void {
        this._iotHubMessageExplorer.stopMonitorIoTHubMessage();
    }

    public sendMessageToEventHub(): void {
        this._eventHubMessageExplorer.sendMessageToEventHub();
    }

    public startMonitorEventHubMessage(): void {
        this._eventHubMessageExplorer.startMonitorEventHubMessage();
    }

    public stopMonitorEventHubMessage(): void {
        this._eventHubMessageExplorer.stopMonitorEventHubMessage();
    }

    public listDevice(): void {
        this._deviceExplorer.listDevice();
    }

    public createDevice(): void {
        this._deviceExplorer.createDevice();
    }

    public deleteDevice(): void {
        this._deviceExplorer.deleteDevice();
    }

    public discoverDevice(): void {
        this._deviceDiscoverer.discoverDevice();
    }

    public deploy(): void {
        this._deviceController.deploy();
    }

    public run(): void {
        this._deviceController.run();
    }
}
