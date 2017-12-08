"use strict";
import { ResourceManagementClient, ResourceModels, SubscriptionClient, SubscriptionModels } from "azure-arm-resource";
import IoTHubClient = require("azure-arm-iothub");
import * as clipboardy from "clipboardy";
import * as vscode from "vscode";
import { IotHubDescription } from "../node_modules/azure-arm-iothub/lib/models";
import { AzureAccount, AzureLoginStatus, AzureResourceFilter, AzureSession } from "./azure-account.api";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { DeviceItem } from "./Model/DeviceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class IoTHubResourceExplorer extends BaseExplorer {
    private readonly accountApi: AzureAccount;

    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
        this.accountApi = vscode.extensions.getExtension<AzureAccount>("ms-vscode.azure-account")!.exports;
    }

    public async createIoTHub() {
        if (!(await this.waitForLogin(this.createIoTHub))) {
            return;
        }

        const subscriptionItem = await vscode.window.showQuickPick(
            this.loadSubscriptionItems(this.accountApi),
            { placeHolder: "Select a subscription to create your IoT Hub in...", ignoreFocusOut: true },
        );

        if (subscriptionItem) {
            const resourceGroupItem = await this.getResourceGroupItem(subscriptionItem);

            if (resourceGroupItem) {
                const locationItem = await vscode.window.showQuickPick(
                    this.getLocationItems(subscriptionItem),
                    { placeHolder: "Select a location to create your IoT Hub in...", ignoreFocusOut: true },
                );

                if (locationItem) {
                    const name = await vscode.window.showInputBox({
                        prompt: "IoT Hub name",
                        ignoreFocusOut: true,
                    });

                    if (name) {
                        const { session, subscription } = subscriptionItem;
                        const client = new IoTHubClient(session.credentials, subscription.subscriptionId);
                        const iotHubCreateParams = {
                            location: locationItem.location.name,
                            subscriptionid: subscription.subscriptionId,
                            resourcegroup: resourceGroupItem.resourceGroup.name,
                            sku:
                                {
                                    name: "S1",
                                    capacity: 1,
                                },
                        };
                        client.iotHubResource.createOrUpdate(resourceGroupItem.resourceGroup.name, name, iotHubCreateParams, (err, result, request, response) => {
                            if (err) {
                                // tslint:disable-next-line:no-console
                                console.log(err);
                            }
                            // tslint:disable-next-line:no-console
                            console.log(result);
                        });
                    }
                }
            }
        }
    }

    public async selectIoTHub() {
        TelemetryClient.sendEvent("General.Select.IoTHub.Start");
        if (!(await this.waitForLogin(this.selectIoTHub))) {
            return;
        }
        TelemetryClient.sendEvent("General.Select.Subscription.Start");
        const subscriptionItems = this.loadSubscriptionItems(this.accountApi);
        const subscriptionItem = await vscode.window.showQuickPick(subscriptionItems, { placeHolder: "Select Subscription", ignoreFocusOut: true });
        if (subscriptionItem) {
            TelemetryClient.sendEvent("General.Select.Subscription.Done");
            const iotHubItems = this.loadIoTHubItems(subscriptionItem);
            const iotHubItem = await vscode.window.showQuickPick(iotHubItems, { placeHolder: "Select IoT Hub", ignoreFocusOut: true });
            if (iotHubItem) {
                vscode.window.showInformationMessage(`Selected IoT Hub [${iotHubItem.label}]. Refreshing the device list...`);
                const iotHubConnectionString = await this.getIoTHubConnectionString(subscriptionItem, iotHubItem);
                const config = Utility.getConfiguration();
                await config.update(Constants.IotHubConnectionStringKey, iotHubConnectionString, true);
                TelemetryClient.sendEvent("AZ.Select.IoTHub.Done");
                vscode.commands.executeCommand("azure-iot-toolkit.refreshDeviceTree");
            }
        }
    }

    public copyIoTHubConnectionString() {
        TelemetryClient.sendEvent("AZ.Copy.IotHubConnectionString");
        const iotHubConnectionString = Utility.getConnectionStringWithId(Constants.IotHubConnectionStringKey);
        if (iotHubConnectionString) {
            clipboardy.write(iotHubConnectionString);
        }
    }

    public async copyDeviceConnectionString(deviceItem: DeviceItem) {
        deviceItem = await Utility.getInputDevice(deviceItem, "AZ.Copy.DeviceConnectionString");
        if (deviceItem && deviceItem.connectionString) {
            clipboardy.write(deviceItem.connectionString);
        }
    }

    private async waitForLogin(callback): Promise<boolean> {
        if (!(await this.accountApi.waitForLogin())) {
            TelemetryClient.sendEvent("General.AskForAzureLogin");
            const subscription = this.accountApi.onStatusChanged(() => {
                subscription.dispose();
                callback();
            });
            vscode.commands.executeCommand("azure-account.askForLogin");
            return false;
        } else {
            return true;
        }
    }

    private async loadSubscriptionItems(api: AzureAccount) {
        const subscriptionItems: ISubscriptionItem[] = [];
        for (const session of api.sessions) {
            const credentials = session.credentials;
            const subscriptionClient = new SubscriptionClient(credentials);
            const subscriptions = await this.listAll(subscriptionClient.subscriptions, subscriptionClient.subscriptions.list());
            subscriptionItems.push(...subscriptions.map((subscription) => ({
                label: subscription.displayName || "",
                description: subscription.subscriptionId || "",
                session,
                subscription,
            })));
        }
        subscriptionItems.sort((a, b) => a.label.localeCompare(b.label));
        TelemetryClient.sendEvent("General.Load.Subscription", { SubscriptionCount: subscriptionItems.length.toString() });
        return subscriptionItems;
    }

    private async loadIoTHubItems(subscriptionItem: ISubscriptionItem) {
        const iotHubItems: IIotHubItem[] = [];
        const { session, subscription } = subscriptionItem;
        const client = new IoTHubClient(session.credentials, subscription.subscriptionId);
        const iotHubs = await client.iotHubResource.listBySubscription();
        iotHubItems.push(...iotHubs.map((iotHub) => ({
            label: iotHub.name || "",
            description: iotHub.resourcegroup || "",
            iotHubDescription: iotHub,
        })));
        iotHubItems.sort((a, b) => a.label.localeCompare(b.label));
        TelemetryClient.sendEvent("General.Load.IoTHub", { IoTHubCount: iotHubItems.length.toString() });
        return iotHubItems;
    }

    private async getIoTHubConnectionString(subscriptionItem: ISubscriptionItem, iotHubItem: IIotHubItem) {
        const { session, subscription } = subscriptionItem;
        const { iotHubDescription } = iotHubItem;
        const client = new IoTHubClient(session.credentials, subscription.subscriptionId);
        return client.iotHubResource.getKeysForKeyName(iotHubDescription.resourcegroup, iotHubDescription.name, "iothubowner").then((result) => {
            return `HostName=${iotHubDescription.properties.hostName};SharedAccessKeyName=${result.keyName};SharedAccessKey=${result.primaryKey}`;
        });
    }

    private async listAll<T>(client: { listNext(nextPageLink: string): Promise<IPartialList<T>>; }, first: Promise<IPartialList<T>>): Promise<T[]> {
        const all: T[] = [];
        for (let list = await first; list.length || list.nextLink; list = list.nextLink ? await client.listNext(list.nextLink) : []) {
            all.push(...list);
        }
        return all;
    }

    private async getResourceGroupItem(subscriptionItem: ISubscriptionItem): Promise<IResourceGroup> {
        return vscode.window.showQuickPick(
            this.getResourceGroupItems(subscriptionItem),
            { placeHolder: "Select a resource group to create your IoT Hub in...", ignoreFocusOut: true },
        );
    }

    private async getResourceGroupItems(subscriptionItem: ISubscriptionItem): Promise<IResourceGroup[]> {
        const resourceManagementClient = new ResourceManagementClient(subscriptionItem.session.credentials, subscriptionItem.subscription.subscriptionId);
        const resourceGroups = await resourceManagementClient.resourceGroups.list();
        return resourceGroups.map((resourceGroup) => ({
            label: resourceGroup.name,
            description: resourceGroup.location,
            resourceGroup,
        }));
    }

    private async getLocationItems(subscriptionItem: ISubscriptionItem): Promise<ILocation[]> {
        const subscriptionClient = new SubscriptionClient(subscriptionItem.session.credentials);
        const locations = await subscriptionClient.subscriptions.listLocations(subscriptionItem.subscription.subscriptionId);
        return locations.map((location) => ({
            label: location.displayName,
            description: location.name,
            location,
        }));
    }
}

interface ISubscriptionItem {
    label: string;
    description: string;
    session: AzureSession;
    subscription: SubscriptionModels.Subscription;
}

interface IIotHubItem {
    label: string;
    description: string;
    iotHubDescription: IotHubDescription;
}

interface IResourceGroup {
    label: string;
    description: string;
    resourceGroup: ResourceModels.ResourceGroup;
}

interface ILocation {
    label: string;
    description: string;
    location: SubscriptionModels.Location;
}

interface IPartialList<T> extends Array<T> {
    nextLink?: string;
}
