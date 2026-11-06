// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {
    IotHubDescription,
    KnownEventStreamAuthenticationType,
    RoutingEventStreamProperties,
    RoutingProperties,
} from "@azure/arm-iothub";
import * as vscode from "vscode";
import {
    promptForGuid,
    promptOptional,
    promptOptionalGuid,
    promptRequired,
    pickOne,
    validateGuid,
} from "../common/ui";
import {
    equalsIgnoreCase,
    getCustomEndpointNames,
    getSelectedHub,
    updateHubRouting,
    validateRoutingName,
} from "./hubRouting";

// Matches the Azure CLI sentinel for the hub's system-assigned identity.
export const SYSTEM_ASSIGNED_IDENTITY = "[system]";

const RESERVED_ENDPOINT_NAMES = ["events", "fileNotifications", "$default"];

const IDENTITY_REQUIRED_MSG = `Enter '${SYSTEM_ASSIGNED_IDENTITY}' or a user-assigned identity resource ID.`;

export { validateGuid };

export function getEventStreamEndpoints(hub: IotHubDescription): RoutingEventStreamProperties[] {
    return hub?.properties?.routing?.endpoints?.eventStreams ?? [];
}

function ensureEventStreams(routing: RoutingProperties): RoutingEventStreamProperties[] {
    routing.endpoints = routing.endpoints ?? {};
    routing.endpoints.eventStreams = routing.endpoints.eventStreams ?? [];
    return routing.endpoints.eventStreams;
}

export async function createFabricEventStreamEndpoint(outputChannel: vscode.OutputChannel): Promise<string> {
    const selected = await getSelectedHub();
    const existingNames = getCustomEndpointNames(selected.hub);

    const name = await promptRequired({
        prompt: "Endpoint name",
        placeHolder: "my-fabric-endpoint",
        validateInput: (value) => validateEndpointName(value, existingNames),
    });

    const identity = await promptRequired({
        prompt: `Identity (${SYSTEM_ASSIGNED_IDENTITY} or a user-assigned identity resource ID)`,
        placeHolder: SYSTEM_ASSIGNED_IDENTITY,
        value: SYSTEM_ASSIGNED_IDENTITY,
        requiredMessage: IDENTITY_REQUIRED_MSG,
    });

    const endpointUri = await promptRequired({
        prompt: "Fabric Custom Endpoint URI",
        placeHolder: "sb://<namespace>.servicebus.windows.net",
        requiredMessage: "Endpoint URI is required.",
        validateInput: validateEndpointUri,
    });

    const entityPath = await promptRequired({
        prompt: "Fabric Custom Endpoint entity path",
        placeHolder: "es_abcd1234",
        requiredMessage: "Entity path is required.",
    });

    const workspaceId = await promptFabricId("Workspace ID");
    const eventStreamId = await promptFabricId("Event stream ID");
    const sourceId = await promptFabricId("Source ID");

    const endpoint: RoutingEventStreamProperties = {
        name,
        endpointUri,
        entityPath,
        authenticationType: KnownEventStreamAuthenticationType.IdentityBased,
        identity: buildEndpointIdentity(identity),
        workspaceId,
        eventStreamId,
        sourceId,
    };

    await updateHubRouting(selected, `Creating Fabric event stream endpoint '${name}'...`, (routing) => {
        ensureEventStreams(routing).push(endpoint);
    });

    outputChannel.appendLine(`[FabricEventStream] Created endpoint '${name}' on IoT Hub '${selected.hubName}'.`);
    return name;
}

export async function updateFabricEventStreamEndpoint(
    outputChannel: vscode.OutputChannel,
    endpointName?: string,
): Promise<void> {
    const selected = await getSelectedHub();
    const existing = getEventStreamEndpoints(selected.hub);

    if (existing.length === 0) {
        throw new Error(`IoT Hub '${selected.hubName}' has no Fabric event stream endpoints to update.`);
    }

    const targetName = endpointName ?? await pickEndpointName(existing);
    const index = existing.findIndex((endpoint) => endpoint.name === targetName);
    if (index < 0) {
        throw new Error(`Fabric event stream endpoint '${targetName}' was not found on IoT Hub '${selected.hubName}'.`);
    }

    const current = existing[index];

    // Mirrors the CLI: endpointUri and identity cannot be changed after creation.
    const entityPath = await promptOptional({ prompt: "Entity path", value: current.entityPath });
    const workspaceId = await promptOptionalGuid("Workspace ID", current.workspaceId);
    const eventStreamId = await promptOptionalGuid("Event stream ID", current.eventStreamId);
    const sourceId = await promptOptionalGuid("Source ID", current.sourceId);

    if (entityPath === undefined && workspaceId === undefined && eventStreamId === undefined && sourceId === undefined) {
        vscode.window.showInformationMessage("No changes made.");
        return;
    }

    await updateHubRouting(selected, `Updating Fabric event stream endpoint '${targetName}'...`, (routing) => {
        const target = ensureEventStreams(routing)[index];
        if (entityPath !== undefined) {
            target.entityPath = entityPath;
        }
        if (workspaceId !== undefined) {
            target.workspaceId = workspaceId;
        }
        if (eventStreamId !== undefined) {
            target.eventStreamId = eventStreamId;
        }
        if (sourceId !== undefined) {
            target.sourceId = sourceId;
        }
    });

    outputChannel.appendLine(`[FabricEventStream] Updated endpoint '${targetName}' on IoT Hub '${selected.hubName}'.`);
    vscode.window.showInformationMessage(`Fabric event stream endpoint '${targetName}' updated.`);
}

export function buildEndpointIdentity(identity: string): RoutingEventStreamProperties["identity"] {
    return identity === SYSTEM_ASSIGNED_IDENTITY ? undefined : { userAssignedIdentity: identity };
}

export function validateEndpointName(value: string, existingNames: string[]): string | undefined {
    const nameError = validateRoutingName(value, "Endpoint");
    if (nameError) {
        return nameError;
    }
    if (RESERVED_ENDPOINT_NAMES.some((name) => equalsIgnoreCase(name, value))) {
        return `'${value}' is a reserved endpoint name.`;
    }
    if (existingNames.some((name) => equalsIgnoreCase(name, value))) {
        return `An endpoint named '${value}' already exists on this IoT Hub.`;
    }
    return undefined;
}

export function validateEndpointUri(value: string): string | undefined {
    if (!value) {
        return "Endpoint URI is required.";
    }
    if (!value.startsWith("sb://")) {
        return "Enter an sb:// URI, for example sb://<namespace>.servicebus.windows.net.";
    }
    return undefined;
}

async function promptFabricId(label: string): Promise<string> {
    return promptForGuid(label, label, `${label} is required.`);
}

async function pickEndpointName(endpoints: RoutingEventStreamProperties[]): Promise<string> {
    const picked = await pickOne(
        endpoints.map((endpoint) => ({ label: endpoint.name, description: endpoint.entityPath })),
        "Select an endpoint to update",
    );
    return picked.label;
}
