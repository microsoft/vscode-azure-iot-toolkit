// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { ResourceManagementClient, ResourceManagementModels } from "@azure/arm-resources";
import { SubscriptionClient } from "@azure/arm-subscriptions";
import * as vscode from "vscode";
import { AzExtTreeDataProvider, AzureTreeItem, IActionContext, createAzureClient, createAzureSubscriptionClient } from "vscode-azureextensionui";
import { IotHubModels, IotHubClient } from "@azure/arm-iothub";
import { AzureAccount } from "./azure-account.api";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { CredentialStore } from "./credentialStore";
import { DeviceItem } from "./Model/DeviceItem";
import { IotHubItem } from "./Model/IotHubItem";
import { LocationItem } from "./Model/LocationItem";
import { ResourceGroupItem } from "./Model/ResourceGroupItem";
import { SubscriptionItem } from "./Model/SubscriptionItem";
import { IoTHubResourceTreeItem } from "./Nodes/IoTHub/IoTHubResourceTreeItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";
import { Environment } from "@azure/ms-rest-azure-env";

export class IoTHubResourceExplorer extends BaseExplorer {
    private readonly accountApi: AzureAccount;

    constructor(outputChannel: vscode.OutputChannel, private iotHubTreeDataProvider?: AzExtTreeDataProvider) {
        super(outputChannel);
        this.accountApi = Utility.getAzureAccountApi();
    }

    public async createIoTHub(outputChannel: vscode.OutputChannel = this._outputChannel, subscriptionId?: string, resourceGroupName?: string): Promise<IotHubModels.IotHubDescription> {
        TelemetryClient.sendEvent(Constants.IoTHubAICreateStartEvent);
        if (!(await this.waitForLogin())) {
            return;
        }

        const subscriptionItem = await this.getOrSelectSubscriptionItem(outputChannel, subscriptionId);
        if (!subscriptionItem) {
            return;
        }

        if (!resourceGroupName) {
            const resourceGroupItem = await this.getOrCreateResourceGroup(subscriptionItem);
            if (!resourceGroupItem) {
                return;
            }
            resourceGroupName = resourceGroupItem.resourceGroup.name;
            outputChannel.show();
            outputChannel.appendLine(`Resource Group selected: ${resourceGroupName}`);
        }

        const locationItem = await vscode.window.showQuickPick(
            this.getLocationItems(subscriptionItem),
            { placeHolder: "Select a location to create your IoT Hub in...", ignoreFocusOut: true },
        );
        if (!locationItem) {
            return;
        }
        outputChannel.show();
        outputChannel.appendLine(`Location selected: ${locationItem.label}`);

        const skuMap = {
            "S1: Standard tier": "S1",
            "S2: Standard tier": "S2",
            "S3: Standard tier": "S3",
            "B1: Basic tier": "B1",
            "B2: Basic tier": "B2",
            "B3: Basic tier": "B3",
            "F1: Free tier": "F1",
        };
        const sku = await vscode.window.showQuickPick(
            Object.keys(skuMap),
            { placeHolder: "Select pricing and scale tier for your IoT Hub...", ignoreFocusOut: true },
        );
        if (!sku) {
            return;
        }
        outputChannel.appendLine(`Pricing and scale tier selected: ${sku}`);

        const name = await this.getIoTHubName(subscriptionItem);
        if (!name) {
            return;
        }

        return vscode.window.withProgress({
            title: `Creating IoT Hub '${name}'`,
            location: vscode.ProgressLocation.Notification,
        }, async (progress) => {
            outputChannel.appendLine(`Creating IoT Hub: ${name}`);
            const intervalID = setInterval(() => {
                outputChannel.append(".");
            }, 1000);

            const { session, subscription } = subscriptionItem;
            const client = createAzureClient({
                credentials: session.credentials2,
                subscriptionId: subscription.subscriptionId,
                environment: session.environment
            }, IotHubClient);
            const iotHubCreateParams = {
                location: locationItem.location.name,
                subscriptionid: subscription.subscriptionId,
                resourcegroup: resourceGroupName,
                sku:
                {
                    name: skuMap[sku],
                    capacity: 1,
                },
            };
            return client.iotHubResource.createOrUpdate(resourceGroupName, name, iotHubCreateParams)
                .then(async (iotHubDescription) => {
                    clearInterval(intervalID);
                    outputChannel.appendLine("");
                    const newIotHubConnectionString = await this.updateAndStoreIoTHubInfo(subscriptionItem.session.credentials2,
                        subscriptionItem.subscription.subscriptionId, subscriptionItem.session.environment , iotHubDescription);
                    outputChannel.appendLine(`IoT Hub '${name}' is created.`);
                    (iotHubDescription as any).iotHubConnectionString = newIotHubConnectionString;
                    TelemetryClient.sendEvent(Constants.IoTHubAICreateDoneEvent, { Result: "Success" }, newIotHubConnectionString);
                    return iotHubDescription;
                })
                .catch((err) => {
                    clearInterval(intervalID);
                    outputChannel.appendLine("");
                    let errorMessage: string;
                    if (err.message) {
                        errorMessage = err.message;
                    } else if (err.body && err.body.message) {
                        errorMessage = err.body.message;
                    } else {
                        errorMessage = "Error occurred when creating IoT Hub.";
                    }
                    outputChannel.appendLine(errorMessage);
                    TelemetryClient.sendEvent(Constants.IoTHubAICreateDoneEvent, { Result: "Fail", [Constants.errorProperties.Message]: errorMessage });
                    return Promise.reject(err);
                });
        });
    }

    public async selectIoTHub(outputChannel: vscode.OutputChannel = this._outputChannel, subscriptionId?: string): Promise<IotHubModels.IotHubDescription> {
        TelemetryClient.sendEvent("General.Select.IoTHub.Start");
        if (!(await this.waitForLogin())) {
            return;
        }
        TelemetryClient.sendEvent("General.Select.Subscription.Start");
        const subscriptionItem = await this.getOrSelectSubscriptionItem(outputChannel, subscriptionId);
        if (!subscriptionItem) {
            return;
        }
        TelemetryClient.sendEvent("General.Select.Subscription.Done");
        const iotHubItem = await this.selectIoTHubItem(subscriptionItem);
        if (iotHubItem) {
            outputChannel.show();
            outputChannel.appendLine(`IoT Hub selected: ${iotHubItem.label}`);
            const iotHubConnectionString = await this.updateAndStoreIoTHubInfo(subscriptionItem.session.credentials2,
                subscriptionItem.subscription.subscriptionId, subscriptionItem.session.environment , iotHubItem.iotHubDescription);
            (iotHubItem.iotHubDescription as any).iotHubConnectionString = iotHubConnectionString;
            TelemetryClient.sendEvent("AZ.Select.IoTHub.Done", undefined, iotHubConnectionString);
            return iotHubItem.iotHubDescription;
        }
    }

    public async setIoTHub(context: IActionContext, node?: IoTHubResourceTreeItem): Promise<void> {
        if (!node) {
            node = await this.iotHubTreeDataProvider.showTreeItemPicker<IoTHubResourceTreeItem>("IotHub", context);
        }
        this._outputChannel.show();
        this._outputChannel.appendLine(`IoT Hub selected: ${node.iotHub.name}`);
        vscode.commands.executeCommand("iotHubDevices.focus");
        await this.updateAndStoreIoTHubInfo(node.root.credentials,
            node.root.subscriptionId, node.root.environment , node.iotHub);
    }

    public async loadMore(actionContext: IActionContext, node: AzureTreeItem): Promise<void> {
        await this.iotHubTreeDataProvider.loadMore(node, actionContext);
    }

    public async refresh(context: IActionContext, node?: AzureTreeItem): Promise<void> {

        await this.iotHubTreeDataProvider.refresh(node);
    }

    public async copyIoTHubConnectionString() {
        TelemetryClient.sendEvent("AZ.Copy.IotHubConnectionString");
        const iotHubConnectionString = await Utility.getConnectionStringWithId(Constants.IotHubConnectionStringKey);
        if (iotHubConnectionString) {
            await vscode.env.clipboard.writeText(iotHubConnectionString);
        }
    }

    public async copyDeviceConnectionString(deviceItem: DeviceItem) {
        deviceItem = await Utility.getInputDevice(deviceItem, "AZ.Copy.DeviceConnectionString");
        if (deviceItem && deviceItem.connectionString) {
            await vscode.env.clipboard.writeText(deviceItem.connectionString);
        }
    }

    public async generateSasTokenForIotHub() {
        TelemetryClient.sendEvent("AZ.Generate.SasToken.Service");
        const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (iotHubConnectionString) {
            this.generateSasToken(Utility.generateSasTokenForService, iotHubConnectionString, "IoT Hub");
        }
    }

    public async generateSasTokenForDevice(deviceItem: DeviceItem) {
        deviceItem = await Utility.getInputDevice(deviceItem, "AZ.Generate.SasToken.Device");
        if (deviceItem && deviceItem.connectionString) {
            this.generateSasToken(Utility.generateSasTokenForDevice, deviceItem.connectionString, deviceItem.deviceId);
        }
    }

    private async generateSasToken(sasTokenFunction: (connectionString: string, expiryInHours: number) => string, connectionString: string, target: string) {
        const expiryInHours = await vscode.window.showInputBox({
            prompt: `Enter expiration time (hours)`,
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value || isNaN(parseFloat(value))) {
                    return "Provided expiration time is not a number, enter correct expiration time (hours).";
                }
            }});

        const sasToken = sasTokenFunction(connectionString, parseFloat(expiryInHours));
        await vscode.env.clipboard.writeText(sasToken);
        this._outputChannel.show();
        this.outputLine("SASToken", `SAS token for [${target}] is generated and copied to clipboard:`);
        this._outputChannel.appendLine(sasToken);
    }

    private async waitForLogin(): Promise<boolean> {
        if (!(await this.accountApi.waitForLogin())) {
            TelemetryClient.sendEvent("General.AskForAzureLogin");
            await vscode.commands.executeCommand("azure-account.askForLogin");
            return this.accountApi.waitForLogin();
        } else {
            return true;
        }
    }

    private async loadSubscriptionItems(api: AzureAccount) {
        await api.waitForFilters();
        const subscriptionItems: SubscriptionItem[] = api.filters.map((filter) => new SubscriptionItem(filter.subscription, filter.session));
        TelemetryClient.sendEvent("General.Load.Subscription", { SubscriptionCount: subscriptionItems.length.toString() });
        if (subscriptionItems.length === 0) {
            vscode.window.showInformationMessage("No subscription found, click an Azure account at the bottom left corner and choose Select All.");
        }
        return subscriptionItems;
    }

    private async loadIoTHubItems(subscriptionItem: SubscriptionItem): Promise<IotHubItem[]> {
        const iotHubItems: IotHubItem[] = [];
        const { session, subscription } = subscriptionItem;
        const client = createAzureClient({
            credentials: session.credentials2,
            subscriptionId: subscription.subscriptionId,
            environment: session.environment
        }, IotHubClient);
        const iotHubs = await client.iotHubResource.listBySubscription();
        iotHubItems.push(...iotHubs.map((iotHub) => new IotHubItem(iotHub)));
        iotHubItems.sort((a, b) => a.label.localeCompare(b.label));
        TelemetryClient.sendEvent("General.Load.IoTHub", { IoTHubCount: iotHubItems.length.toString() });
        return iotHubItems;
    }

    private async selectIoTHubItem(subscriptionItem: SubscriptionItem): Promise<IotHubItem> {
        const iotHubItems = this.loadIoTHubItems(subscriptionItem);
        let retryCount = 3;
        let iotHubItem;
        // Sometimes showQuickPick of VS Code would return 'undefined' and disappear immediately without waiting for Promise is resolved
        // Workaround here to add retry logic
        do {
            const start = new Date().getTime();
            iotHubItem = await vscode.window.showQuickPick(iotHubItems, { placeHolder: "Select IoT Hub", ignoreFocusOut: true });
            // If user press 'Esc', the showQuickPick would also return 'undefined'
            // So we will retry only if showQuickPick retrun 'undefined' within 500 ms (Mostly not triggered by user pressing 'Esc')
            if (iotHubItem === undefined && (new Date().getTime() - start < 500)) {
                retryCount--;
            } else {
                return iotHubItem;
            }
        } while (retryCount > 0);
        return iotHubItem;
    }

    private async updateAndStoreIoTHubInfo(
        credentials: any,
        subscriptionId: string,
        environment: Environment,
        iotHubDescription: IotHubModels.IotHubDescription): Promise<string>
    {
        const iotHubConnectionString = await this.getIoTHubConnectionString(credentials,
            subscriptionId, environment, iotHubDescription);
        const eventHubConnectionString = await this.getEventHubConnectionString(credentials,
            subscriptionId, environment, iotHubDescription);
        await this.updateIoTHubEventHubConnectionString(eventHubConnectionString);
        await this.updateIoTHubConnectionString(iotHubConnectionString);
        vscode.commands.executeCommand("azure-iot-toolkit.refresh");

        await Utility.storeIoTHubInfo(subscriptionId, iotHubDescription);
        return iotHubConnectionString;
    }
    private async updateIoTHubEventHubConnectionString(eventHubConnectionString: string) {
        await CredentialStore.setPassword(Constants.IotHubEventHubConnectionStringKey, eventHubConnectionString);
    }

    private async updateIoTHubConnectionString(iotHubConnectionString: string) {
        await CredentialStore.setPassword(Constants.IotHubConnectionStringKey, iotHubConnectionString);
    }

    private async getIoTHubConnectionString(credentials: any, subscriptionId: string, environment: Environment, iotHubDescription: IotHubModels.IotHubDescription) {
        const client = createAzureClient({
            credentials,
            subscriptionId,
            environment
        }, IotHubClient);
        return client.iotHubResource.getKeysForKeyName(Utility.getResourceGroupNameFromId(iotHubDescription.id), iotHubDescription.name, "iothubowner").then((result) => {
            return `HostName=${iotHubDescription.properties.hostName};SharedAccessKeyName=${result.keyName};SharedAccessKey=${result.primaryKey}`;
        });
    }
    private async getEventHubConnectionString(credentials: any, subscriptionId: string, environment: Environment, iotHubDescription: IotHubModels.IotHubDescription) {
        const client = createAzureClient({
            credentials,
            subscriptionId,
            environment
        }, IotHubClient);

        return client.iotHubResource.getKeysForKeyName(Utility.getResourceGroupNameFromId(iotHubDescription.id), iotHubDescription.name, "iothubowner").then((result) => {
            return `Endpoint=${iotHubDescription.properties.eventHubEndpoints.events.endpoint};SharedAccessKeyName=${result.keyName};SharedAccessKey=${result.primaryKey};EntityPath=${iotHubDescription.properties.eventHubEndpoints.events.path}`;
        });
    }

    private async getOrSelectSubscriptionItem(outputChannel: vscode.OutputChannel, subscriptionId: string): Promise<SubscriptionItem> {
        if (subscriptionId) {
            const azureSubscription = this.accountApi.subscriptions.find((subscription) => subscription.subscription.subscriptionId === subscriptionId);
            if (azureSubscription) {
                return new SubscriptionItem(azureSubscription.subscription, azureSubscription.session);
            }
        } else {
            const subscriptionItem = await vscode.window.showQuickPick(
                this.loadSubscriptionItems(this.accountApi),
                { placeHolder: "Select Subscription", ignoreFocusOut: true },
            );
            if (subscriptionItem) {
                outputChannel.show();
                outputChannel.appendLine(`Subscription selected: ${subscriptionItem.label}`);
                return subscriptionItem;
            }
        }
        return undefined;
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
        const resourceManagementClient = createAzureClient({
            credentials: subscriptionItem.session.credentials2,
            subscriptionId: subscriptionItem.subscription.subscriptionId,
            environment: subscriptionItem.session.environment
        }, ResourceManagementClient);
        const resourceGroups = await resourceManagementClient.resourceGroups.list();
        const resourceGroupItems: vscode.QuickPickItem[] = [{
            label: "$(plus) Create Resource Group",
            description: null,
        }];
        return resourceGroupItems.concat(resourceGroups.map((resourceGroup) => new ResourceGroupItem(resourceGroup)));
    }

    private async getLocationItems(subscriptionItem: SubscriptionItem): Promise<LocationItem[]> {
        const subscriptionClient =  createAzureSubscriptionClient({
            credentials: subscriptionItem.session.credentials2,
            environment: subscriptionItem.session.environment}, SubscriptionClient);
        const locations = await subscriptionClient.subscriptions.listLocations(subscriptionItem.subscription.subscriptionId);
        return locations.map((location) => new LocationItem(location));
    }

    private async getIoTHubName(subscriptionItem: SubscriptionItem): Promise<string> {
        const client = createAzureClient({
            credentials: subscriptionItem.session.credentials2,
            subscriptionId: subscriptionItem.subscription.subscriptionId,
            environment: subscriptionItem.session.environment
        }, IotHubClient);

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
        if (!name || name.length < min || name.length > max) {
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

    private async createResourceGroup(subscriptionItem: SubscriptionItem): Promise<ResourceManagementModels.ResourceGroup> {
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
                    location: vscode.ProgressLocation.Notification,
                }, async (progress) => {
                    const resourceManagementClient = createAzureClient({
                        credentials: subscriptionItem.session.credentials2,
                        subscriptionId: subscriptionItem.subscription.subscriptionId,
                        environment: subscriptionItem.session.environment
                    }, ResourceManagementClient);
                    return resourceManagementClient.resourceGroups.createOrUpdate(resourceGroupName, { location: locationItem.location.name });
                });
            }
        }
        return null;
    }

    private validateResourceGroupName(name: string): string {
        const min = 1;
        const max = 90;
        if (!name || name.length < min || name.length > max) {
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
