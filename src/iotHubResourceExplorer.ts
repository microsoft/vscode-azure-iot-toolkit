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
import { IotHubItem } from "./Model/IotHubItem";
import { LocationItem } from "./Model/LocationItem";
import { ResourceGroupItem } from "./Model/ResourceGroupItem";
import { SubscriptionItem } from "./Model/SubscriptionItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class IoTHubResourceExplorer extends BaseExplorer {
    private readonly accountApi: AzureAccount;

    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
        this.accountApi = vscode.extensions.getExtension<AzureAccount>("ms-vscode.azure-account")!.exports;
    }

    public async createIoTHub(): Promise<{iotHubDescription: IotHubDescription, iotHubConnectionString: string}> {
        TelemetryClient.sendEvent(Constants.IoTHubAICreateStartEvent);
        if (!(await this.waitForLogin(this.createIoTHub))) {
            return;
        }

        const subscriptionItem = await vscode.window.showQuickPick(
            this.loadSubscriptionItems(this.accountApi),
            { placeHolder: "Select a subscription to create your IoT Hub in...", ignoreFocusOut: true },
        );
        if (!subscriptionItem) {
            return;
        }

        const resourceGroupItem = await this.getOrCreateResourceGroup(subscriptionItem);
        if (!resourceGroupItem) {
            return;
        }

        const locationItem = await vscode.window.showQuickPick(
            this.getLocationItems(subscriptionItem),
            { placeHolder: "Select a location to create your IoT Hub in...", ignoreFocusOut: true },
        );
        if (!locationItem) {
            return;
        }

        const sku = await vscode.window.showQuickPick(
            ["F1", "S1", "S2", "S3"],
            { placeHolder: "Select SKU for your IoT Hub...", ignoreFocusOut: true },
        );
        if (!sku) {
            return;
        }

        const name = await this.getIoTHubName(subscriptionItem);
        if (!name) {
            return;
        }

        return vscode.window.withProgress({
            title: `Creating IoT Hub '${name}'`,
            location: vscode.ProgressLocation.Window,
        }, async (progress) => {
            const { session, subscription } = subscriptionItem;
            const client = new IoTHubClient(session.credentials, subscription.subscriptionId);
            const iotHubCreateParams = {
                location: locationItem.location.name,
                subscriptionid: subscription.subscriptionId,
                resourcegroup: resourceGroupItem.resourceGroup.name,
                sku:
                    {
                        name: sku,
                        capacity: 1,
                    },
            };
            return client.iotHubResource.createOrUpdate(resourceGroupItem.resourceGroup.name, name, iotHubCreateParams)
                .then(async (iotHubDescription) => {
                    const newIotHubConnectionString = await this.getIoTHubConnectionString(subscriptionItem, iotHubDescription)
                    const currentIotHubConnectionString = Utility.getConnectionStringWithId(Constants.IotHubConnectionStringKey);
                    if (currentIotHubConnectionString) {
                        vscode.window.showInformationMessage<vscode.MessageItem>(`IoT Hub '${name}' is created. Do you want to refresh device list using this IoT Hub?`,
                            { title: "Yes" },
                            { title: "No", isCloseAffordance: true },
                        ).then((selection) => {
                            if (selection.title === "Yes") {
                                this.updateIoTHubConnectionString(newIotHubConnectionString);
                            }
                        });
                    } else {
                        vscode.window.showInformationMessage(`IoT Hub '${name}' is created.`);
                        this.updateIoTHubConnectionString(newIotHubConnectionString);
                    }
                    TelemetryClient.sendEvent(Constants.IoTHubAICreateDoneEvent, { Result: "Success" });
                    return {iotHubDescription, iotHubConnectionString: newIotHubConnectionString};
                })
                .catch((err) => {
                    let errorMessage: string;
                    if (err.message) {
                        errorMessage = err.message;
                    } else if (err.body && err.body.message) {
                        errorMessage = err.body.message;
                    } else {
                        errorMessage = "Error occurred when creating IoT Hub.";
                    }
                    vscode.window.showErrorMessage(errorMessage);
                    TelemetryClient.sendEvent(Constants.IoTHubAICreateDoneEvent, { Result: "Fail", Message: errorMessage });
                    return Promise.reject(err);
                });
        });
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
                const iotHubConnectionString = await this.getIoTHubConnectionString(subscriptionItem, iotHubItem.iotHubDescription);
                await this.updateIoTHubConnectionString(iotHubConnectionString);
                TelemetryClient.sendEvent("AZ.Select.IoTHub.Done");
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
                callback = callback.bind(this);
                callback();
            });
            vscode.commands.executeCommand("azure-account.askForLogin");
            return false;
        } else {
            return true;
        }
    }

    private async loadSubscriptionItems(api: AzureAccount) {
        const subscriptionItems: SubscriptionItem[] = [];
        for (const session of api.sessions) {
            const credentials = session.credentials;
            const subscriptionClient = new SubscriptionClient(credentials);
            const subscriptions = await this.listAll(subscriptionClient.subscriptions, subscriptionClient.subscriptions.list());
            subscriptionItems.push(...subscriptions.map((subscription) => new SubscriptionItem(subscription, session)));
        }
        subscriptionItems.sort((a, b) => a.label.localeCompare(b.label));
        TelemetryClient.sendEvent("General.Load.Subscription", { SubscriptionCount: subscriptionItems.length.toString() });
        return subscriptionItems;
    }

    private async loadIoTHubItems(subscriptionItem: SubscriptionItem) {
        const iotHubItems: IotHubItem[] = [];
        const { session, subscription } = subscriptionItem;
        const client = new IoTHubClient(session.credentials, subscription.subscriptionId);
        const iotHubs = await client.iotHubResource.listBySubscription();
        iotHubItems.push(...iotHubs.map((iotHub) => new IotHubItem(iotHub)));
        iotHubItems.sort((a, b) => a.label.localeCompare(b.label));
        TelemetryClient.sendEvent("General.Load.IoTHub", { IoTHubCount: iotHubItems.length.toString() });
        return iotHubItems;
    }

    private async updateIoTHubConnectionString(iotHubConnectionString: string) {
        const config = Utility.getConfiguration();
        await config.update(Constants.IotHubConnectionStringKey, iotHubConnectionString, true);
        vscode.commands.executeCommand("azure-iot-toolkit.refresh");
    }

    private async getIoTHubConnectionString(subscriptionItem: SubscriptionItem, iotHubDescription: IotHubDescription) {
        const { session, subscription } = subscriptionItem;
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

    private async getOrCreateResourceGroup(subscriptionItem: SubscriptionItem): Promise<ResourceGroupItem> {
        const pick = await vscode.window.showQuickPick(
            this.getResourceGroupItems(subscriptionItem),
            { placeHolder: "Select a resource group to create your IoT Hub in...", ignoreFocusOut: true },
        );

        if (pick) {
            if (pick instanceof (ResourceGroupItem)) {
                return pick;
            } else {
                const newGroup = await this.createResourceGroup(subscriptionItem);
                if (newGroup) {
                    return new ResourceGroupItem(newGroup);
                }
            }
        }
        return null;
    }

    private async getResourceGroupItems(subscriptionItem: SubscriptionItem): Promise<vscode.QuickPickItem[]> {
        const resourceManagementClient = new ResourceManagementClient(subscriptionItem.session.credentials, subscriptionItem.subscription.subscriptionId);
        const resourceGroups = await resourceManagementClient.resourceGroups.list();
        let resourceGroupItems: vscode.QuickPickItem[] = [{
            label: "$(plus) Create Resource Group",
            description: null,
        }];
        return resourceGroupItems.concat(resourceGroups.map((resourceGroup) => new ResourceGroupItem(resourceGroup)));
    }

    private async getLocationItems(subscriptionItem: SubscriptionItem): Promise<LocationItem[]> {
        const subscriptionClient = new SubscriptionClient(subscriptionItem.session.credentials);
        const locations = await subscriptionClient.subscriptions.listLocations(subscriptionItem.subscription.subscriptionId);
        return locations.map((location) => new LocationItem(location));
    }

    private async getIoTHubName(subscriptionItem: SubscriptionItem): Promise<string> {
        const client = new IoTHubClient(subscriptionItem.session.credentials, subscriptionItem.subscription.subscriptionId);

        while (true) {
            const accountName = await vscode.window.showInputBox({
                placeHolder: "IoT Hub name",
                prompt: "Provide IoT Hub name",
                validateInput: this.validateIoTHubName,
                ignoreFocusOut: true,
            });

            if (!accountName) {
                // If the user escaped the input box, exit the while loop
                break;
            }

            try {
                const nameAvailable = (await client.iotHubResource.checkNameAvailability(accountName)).nameAvailable;
                if (nameAvailable) {
                    return accountName;
                } else {
                    await vscode.window.showErrorMessage(`IoT Hub name '${accountName}' is not available.`);
                }
            } catch (error) {
                await vscode.window.showErrorMessage(error.message);
            }
        }
    }

    private validateIoTHubName(name: string): string {
        const min = 3;
        const max = 50;
        if (name.length < min || name.length > max) {
            return `The name must be between ${min} and ${max} characters long.`;
        }
        if (name.match(/[^a-zA-Z0-9-]/)) {
            return "The name must contain only alphanumeric characters or -";
        }
        if (name.startsWith("-")) {
            return "The name must not start with -";
        }
        if (name.endsWith("-")) {
            return "The name must not end with -";
        }
        return null;
    }

    private async createResourceGroup(subscriptionItem: SubscriptionItem): Promise<ResourceModels.ResourceGroup> {
        const resourceGroupName = await vscode.window.showInputBox({
            placeHolder: "Resource Group Name",
            prompt: "Provide a resource group name",
            validateInput: this.validateResourceGroupName,
            ignoreFocusOut: true,
        });

        if (resourceGroupName) {
            const locationItem = await vscode.window.showQuickPick(
                this.getLocationItems(subscriptionItem),
                { placeHolder: "Select a location to create your Resource Group in...", ignoreFocusOut: true },
            );

            if (locationItem) {
                return vscode.window.withProgress({
                    title: `Creating resource group '${resourceGroupName}'`,
                    location: vscode.ProgressLocation.Window,
                }, async (progress) => {
                    const resourceManagementClient = new ResourceManagementClient(subscriptionItem.session.credentials, subscriptionItem.subscription.subscriptionId);
                    return resourceManagementClient.resourceGroups.createOrUpdate(resourceGroupName, { location: locationItem.location.name });
                });
            }
        }
        return null;
    }

    private validateResourceGroupName(name: string): string {
        const min = 1;
        const max = 90;
        if (name.length < min || name.length > max) {
            return `The name must be between ${min} and ${max} characters long.`;
        }
        if (name.match(/[^a-zA-Z0-9\.\_\-\(\)]/)) {
            return "The name must contain only alphanumeric characters or the symbols ._-()";
        }
        if (name.endsWith(".")) {
            return "The name must not end in a period.";
        }
        return null;
    }
}

interface IPartialList<T> extends Array<T> {
    nextLink?: string;
}
