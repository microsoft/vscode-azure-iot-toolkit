// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IotHubClient, IotHubDescription, RoutingProperties } from "@azure/arm-iothub";
import { ensureLoggedIn, getCredential } from "../azureAuth";
import { withProgress } from "../common/ui";
import { Constants } from "../constants";
import { Utility } from "../utility";

const NO_HUB_SELECTED_MSG = "Select an IoT Hub first.";

export interface ISelectedHub {
    client: IotHubClient;
    hub: IotHubDescription;
    resourceGroupName: string;
    hubName: string;
}

export function getCustomEndpointNames(hub: IotHubDescription): string[] {
    const endpoints = hub?.properties?.routing?.endpoints;
    return [
        ...(endpoints?.eventHubs ?? []),
        ...(endpoints?.serviceBusQueues ?? []),
        ...(endpoints?.serviceBusTopics ?? []),
        ...(endpoints?.storageContainers ?? []),
        ...(endpoints?.cosmosDBSqlContainers ?? []),
        ...(endpoints?.eventStreams ?? []),
    ].map((endpoint) => endpoint.name);
}

export async function getSelectedHub(): Promise<ISelectedHub> {
    if (!(await ensureLoggedIn())) {
        throw new Error("Sign in to Azure first.");
    }

    const subscriptionId = Constants.ExtensionContext.globalState.get<string>(Constants.StateKeySubsID);
    const hubId = Constants.ExtensionContext.globalState.get<string>(Constants.StateKeyIoTHubID);
    if (!subscriptionId || !hubId) {
        throw new Error(NO_HUB_SELECTED_MSG);
    }

    const resourceGroupName = Utility.getResourceGroupNameFromId(hubId);
    const hubName = hubId.split("/").pop();
    if (!resourceGroupName || !hubName) {
        throw new Error(NO_HUB_SELECTED_MSG);
    }

    const client = new IotHubClient(getCredential(), subscriptionId);
    const hub = await client.iotHubResource.get(resourceGroupName, hubName);

    return { client, hub, resourceGroupName, hubName };
}

export async function refreshSelectedHub(selected: ISelectedHub): Promise<ISelectedHub> {
    const hub = await selected.client.iotHubResource.get(selected.resourceGroupName, selected.hubName);
    return { ...selected, hub };
}

/** Uses the latest hub etag to reject concurrent routing updates. */
export async function updateHubRouting(
    selected: ISelectedHub,
    title: string,
    mutate: (routing: RoutingProperties) => void,
): Promise<void> {
    const { client, hub, resourceGroupName, hubName } = selected;

    hub.properties = hub.properties ?? {};
    hub.properties.routing = hub.properties.routing ?? {};

    mutate(hub.properties.routing);

    await withProgress(title, async () => {
        const poller = await client.iotHubResource.beginCreateOrUpdate(resourceGroupName, hubName, hub, { ifMatch: hub.etag });
        await poller.pollUntilDone();
    });
}

export function validateRoutingName(value: string, label: string): string | undefined {
    if (!value) {
        return `${label} name is required.`;
    }
    if (value.length > 64) {
        return `${label} name can be up to 64 characters.`;
    }
    if (!/^[A-Za-z0-9._-]+$/.test(value)) {
        return `${label} name can use only letters, numbers, periods, underscores, and hyphens.`;
    }
    return undefined;
}

export function equalsIgnoreCase(left: string | undefined, right: string | undefined): boolean {
    return (left ?? "").toLowerCase() === (right ?? "").toLowerCase();
}
