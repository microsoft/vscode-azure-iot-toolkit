"use strict";
import { SubscriptionClient, SubscriptionModels } from "azure-arm-resource";
import IoTHubClient = require("azure-arm-iothub");
import * as vscode from "vscode";
import { IotHubDescription } from "../node_modules/azure-arm-iothub/lib/models";
import { AzureAccount, AzureLoginStatus, AzureResourceFilter, AzureSession } from "./azure-account.api";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class IoTHubResourceExplorer extends BaseExplorer {
    private readonly accountApi: AzureAccount;

    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
        this.accountApi = vscode.extensions.getExtension<AzureAccount>("ms-vscode.azure-account")!.exports;
    }

    public async selectIoTHub() {
        TelemetryClient.sendEvent("General.Select.IoTHub.Start");
        if (!(await this.accountApi.waitForLogin())) {
            TelemetryClient.sendEvent("General.AskForAzureLogin");
            return vscode.commands.executeCommand("azure-account.askForLogin");
        }
        TelemetryClient.sendEvent("General.Select.Subscription.Start");
        const subscriptionItems = this.loadSubscriptionItems(this.accountApi);
        const subscriptionItem = await vscode.window.showQuickPick(subscriptionItems, { placeHolder: "Select Subscription", ignoreFocusOut: true });
        if (subscriptionItem) {
            TelemetryClient.sendEvent("General.Select.Subscription.Done");
            const iotHubItems = this.loadIoTHubItems(subscriptionItem);
            const iotHubItem = await vscode.window.showQuickPick(iotHubItems, { placeHolder: "Select IoT Hub", ignoreFocusOut: true });
            if (iotHubItem) {
                const iotHubConnectionString = await this.getIoTHubConnectionString(subscriptionItem, iotHubItem);
                const config = Utility.getConfiguration();
                await config.update(Constants.IotHubConnectionStringKey, iotHubConnectionString, true);
                TelemetryClient.sendEvent("AZ.Select.IoTHub.Done");
                vscode.window.showInformationMessage(`Selected IoT Hub [${iotHubItem.label}]. Refreshing the device list...`);
                vscode.commands.executeCommand("azure-iot-toolkit.refreshDeviceTree");
            }
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
        TelemetryClient.sendEvent("General.Load.Subscription", { SubscriptionCount: subscriptionItems.length.toString() })
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
        TelemetryClient.sendEvent("General.Load.IoTHub", { IoTHubCount: iotHubItems.length.toString() })
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

interface IPartialList<T> extends Array<T> {
    nextLink?: string;
}
