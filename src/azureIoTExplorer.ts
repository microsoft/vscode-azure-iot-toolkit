"use strict";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { DeviceController } from "./deviceController";
import { DeviceDiscoverer } from "./deviceDiscoverer";
import { DeviceExplorer } from "./deviceExplorer";
import { EventHubMessageExplorer } from "./eventHubMessageExplorer";
import { IotHubC2DMessageExplorer } from "./iotHubC2DMessageExplorer";
import { IotHubDirectMethodExplorer } from "./iotHubDirectMethodExplorer";
import { IoTHubMessageExplorer } from "./iotHubMessageExplorer";
import { DeviceItem } from "./Model/DeviceItem";
import { SnippetManager } from "./snippetManager";

export class AzureIoTExplorer {
    private _iotHubC2DMessageExplorer: IotHubC2DMessageExplorer;
    private _iotHubMessageExplorer: IoTHubMessageExplorer;
    private _eventHubMessageExplorer: EventHubMessageExplorer;
    private _deviceExplorer: DeviceExplorer;
    private _deviceDiscoverer: DeviceDiscoverer;
    private _deviceController: DeviceController;
    private _snippetManager: SnippetManager;
    private _iotHubDirectMethodExplorer: IotHubDirectMethodExplorer;

    constructor(context: vscode.ExtensionContext) {
        let outputChannel = vscode.window.createOutputChannel("Azure IoT Toolkit");
        let appInsightsClient = new AppInsightsClient();
        this._iotHubC2DMessageExplorer = new IotHubC2DMessageExplorer(outputChannel);
        this._iotHubMessageExplorer = new IoTHubMessageExplorer(outputChannel);
        this._eventHubMessageExplorer = new EventHubMessageExplorer(outputChannel);
        this._deviceExplorer = new DeviceExplorer(outputChannel);
        this._deviceDiscoverer = new DeviceDiscoverer(context, outputChannel);
        this._deviceController = new DeviceController(outputChannel);
        this._snippetManager = new SnippetManager(outputChannel);
        this._iotHubDirectMethodExplorer = new IotHubDirectMethodExplorer(outputChannel);
    }

    public sendD2CMessage(deviceItem?: DeviceItem): void {
        this._iotHubMessageExplorer.sendD2CMessage(deviceItem);
    }

    public startMonitorIoTHubMessage(): void {
        this._iotHubMessageExplorer.startMonitorIoTHubMessage();
    }

    public stopMonitorIoTHubMessage(): void {
        this._iotHubMessageExplorer.stopMonitorIoTHubMessage();
    }

    public sendC2DMessage(deviceItem?: DeviceItem): void {
        this._iotHubC2DMessageExplorer.sendC2DMessage(deviceItem);
    }

    public startMonitorC2DMessage(deviceItem?: DeviceItem): void {
        this._iotHubC2DMessageExplorer.startMonitorC2DMessage(deviceItem);
    }

    public stopMonitorC2DMessage(): void {
        this._iotHubC2DMessageExplorer.stopMonitorC2DMessage();
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

    public getDevice(deviceId: string): void {
        this._deviceExplorer.getDevice(deviceId);
    }

    public async createDevice() {
        await this._deviceExplorer.createDevice();
    }

    public async deleteDevice(deviceItem?: DeviceItem) {
        await this._deviceExplorer.deleteDevice(deviceItem);
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

    public invokeDeviceMethod(deviceItem: DeviceItem): void {
        this._iotHubDirectMethodExplorer.invokeDeviceMethod(deviceItem);
    }

    public replaceConnectionString(event: vscode.TextDocumentChangeEvent): void {
        this._snippetManager.replaceConnectionString(event);
    }
}
