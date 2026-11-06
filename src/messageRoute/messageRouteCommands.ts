// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IotHubDescription, RouteProperties, RoutingProperties } from "@azure/arm-iothub";
import * as vscode from "vscode";
import { confirmDestructiveAction, pickMany, pickOne, promptRequired, requireInput } from "../common/ui";
import {
    equalsIgnoreCase,
    getCustomEndpointNames,
    getSelectedHub,
    updateHubRouting,
    validateRoutingName,
} from "../messageEndpoint/hubRouting";

// Keep route source choices aligned with the Azure CLI.
const ROUTE_SOURCE_TYPES = [
    "DeviceMessages",
    "TwinChangeEvents",
    "DeviceLifecycleEvents",
    "DeviceJobLifecycleEvents",
    "DigitalTwinChangeEvents",
    "DeviceConnectionStateEvents",
];

/** The built-in endpoint is always a valid route target but is not listed under `routing.endpoints`. */
const BUILT_IN_ENDPOINT_NAME = "events";

const DEFAULT_CONDITION = "true";

function getRoutes(hub: IotHubDescription): RouteProperties[] {
    return hub?.properties?.routing?.routes ?? [];
}

function getRoutableEndpointNames(hub: IotHubDescription): string[] {
    return [BUILT_IN_ENDPOINT_NAME, ...getCustomEndpointNames(hub)];
}

export async function createMessageRoute(
    outputChannel: vscode.OutputChannel,
    presetEndpointName?: string,
): Promise<void> {
    const selected = await getSelectedHub();
    const existing = getRoutes(selected.hub);

    const name = await promptRequired({
        prompt: "Route name",
        placeHolder: "my-route",
        value: presetEndpointName ? suggestRouteName(presetEndpointName, existing) : undefined,
        validateInput: (value) => validateRouteName(value, existing),
    });

    const source = await pickSourceType();

    const endpointNames = presetEndpointName
        ? [presetEndpointName]
        : await pickEndpointNames(selected.hub);

    const condition = await promptCondition(DEFAULT_CONDITION);
    const isEnabled = await pickEnabled(true);

    const route: RouteProperties = { name, source, endpointNames, condition, isEnabled };

    await updateHubRouting(selected, `Creating route '${name}'...`, (routing) => {
        ensureRoutes(routing).push(route);
    });

    outputChannel.appendLine(
        `[MessageRoute] Created route '${name}' (${source} -> ${endpointNames.join(", ")}) on IoT Hub '${selected.hubName}'.`,
    );
    vscode.window.showInformationMessage(`Route '${name}' created.`);
}

export async function updateMessageRoute(
    outputChannel: vscode.OutputChannel,
    routeName?: string,
): Promise<void> {
    const selected = await getSelectedHub();
    const existing = getRoutes(selected.hub);

    if (existing.length === 0) {
        throw new Error(`IoT Hub '${selected.hubName}' has no routes to update.`);
    }

    const targetName = routeName ?? await pickRouteName(existing, "Select the route to update");
    const index = existing.findIndex((route) => equalsIgnoreCase(route.name, targetName));
    if (index < 0) {
        throw new Error(`Route '${targetName}' was not found on IoT Hub '${selected.hubName}'.`);
    }

    const current = existing[index];

    const source = await pickSourceType(current.source);
    const endpointNames = await pickEndpointNames(selected.hub, current.endpointNames);
    const condition = await promptCondition(current.condition ?? DEFAULT_CONDITION);
    const isEnabled = await pickEnabled(current.isEnabled !== false);

    await updateHubRouting(selected, `Updating route '${targetName}'...`, (routing) => {
        const target = ensureRoutes(routing)[index];
        target.source = source;
        target.endpointNames = endpointNames;
        target.condition = condition;
        target.isEnabled = isEnabled;
    });

    outputChannel.appendLine(
        `[MessageRoute] Updated route '${targetName}' (${source} -> ${endpointNames.join(", ")}) on IoT Hub '${selected.hubName}'.`,
    );
    vscode.window.showInformationMessage(`Route '${targetName}' updated.`);
}

export async function deleteMessageRoute(
    outputChannel: vscode.OutputChannel,
    routeName?: string,
): Promise<void> {
    const selected = await getSelectedHub();
    const existing = getRoutes(selected.hub);

    if (existing.length === 0) {
        throw new Error(`IoT Hub '${selected.hubName}' has no routes to delete.`);
    }

    const targetName = routeName ?? await pickRouteName(existing, "Select the route to delete");
    const target = existing.find((route) => equalsIgnoreCase(route.name, targetName));
    if (!target) {
        throw new Error(`Route '${targetName}' was not found on IoT Hub '${selected.hubName}'.`);
    }

    await confirmDestructiveAction(
        `Delete route '${targetName}' from IoT Hub '${selected.hubName}'?`,
        "Delete",
        `Messages from ${target.source} will stop being delivered to ${(target.endpointNames ?? []).join(", ")}.`,
    );

    await updateHubRouting(selected, `Deleting route '${targetName}'...`, (routing) => {
        const routes = ensureRoutes(routing);
        const index = routes.findIndex((route) => equalsIgnoreCase(route.name, targetName));
        if (index >= 0) {
            routes.splice(index, 1);
        }
    });

    outputChannel.appendLine(`[MessageRoute] Deleted route '${targetName}' from IoT Hub '${selected.hubName}'.`);
    vscode.window.showInformationMessage(`Route '${targetName}' deleted.`);
}

export async function offerRouteForEndpoint(outputChannel: vscode.OutputChannel, endpointName: string): Promise<void> {
    const choice = await vscode.window.showInformationMessage(
        `Endpoint '${endpointName}' needs a route to receive messages. Create one now?`,
        "Create Route",
        "Later",
    );
    if (choice !== "Create Route") {
        return;
    }
    await createMessageRoute(outputChannel, endpointName);
}

function ensureRoutes(routing: RoutingProperties): RouteProperties[] {
    routing.routes = routing.routes ?? [];
    return routing.routes;
}

function validateRouteName(value: string, existing: RouteProperties[]): string | undefined {
    const nameError = validateRoutingName(value, "Route");
    if (nameError) {
        return nameError;
    }
    if (existing.some((route) => equalsIgnoreCase(route.name, value))) {
        return `A route named '${value}' already exists on this IoT Hub.`;
    }
    return undefined;
}

function suggestRouteName(endpointName: string, existing: RouteProperties[]): string {
    const base = `${endpointName}-route`.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 64);
    if (!existing.some((route) => equalsIgnoreCase(route.name, base))) {
        return base;
    }
    for (let suffix = 2; ; suffix++) {
        const suffixText = `-${suffix}`;
        const candidate = `${base.slice(0, 64 - suffixText.length)}${suffixText}`;
        if (!existing.some((route) => equalsIgnoreCase(route.name, candidate))) {
            return candidate;
        }
    }
}

async function promptCondition(currentValue: string): Promise<string> {
    const result = requireInput(await vscode.window.showInputBox({
        prompt: "Condition. Use 'true' to route all messages",
        placeHolder: DEFAULT_CONDITION,
        value: currentValue,
        ignoreFocusOut: true,
    }));
    return result.trim() || DEFAULT_CONDITION;
}

async function pickSourceType(currentValue?: string): Promise<string> {
    const picked = await pickOne(
        ROUTE_SOURCE_TYPES.map((source) => ({
            label: source,
            description: equalsIgnoreCase(source, currentValue) ? "current" : undefined,
        })),
        "Select a message source",
    );
    return picked.label;
}

async function pickEndpointNames(hub: IotHubDescription, currentValue?: string[]): Promise<string[]> {
    const current = new Set((currentValue ?? []).map((name) => name.toLowerCase()));

    const picked = await pickMany(
        getRoutableEndpointNames(hub).map((name) => ({
            label: name,
            description: name === BUILT_IN_ENDPOINT_NAME ? "built-in endpoint" : undefined,
            picked: current.has(name.toLowerCase()),
        })),
        "Select one or more endpoints",
    );

    if (picked.length === 0) {
        throw new Error("Select at least one endpoint.");
    }
    return picked.map((item) => item.label);
}

async function pickEnabled(currentValue: boolean): Promise<boolean> {
    const enabledLabel = "Enabled";
    const picked = await pickOne(
        [
            { label: enabledLabel, description: currentValue ? "current" : undefined },
            { label: "Disabled", description: currentValue ? undefined : "current" },
        ],
        "Enable this route?",
    );
    return picked.label === enabledLabel;
}

async function pickRouteName(routes: RouteProperties[], placeHolder: string): Promise<string> {
    const picked = await pickOne(
        routes.map((route) => ({
            label: route.name,
            description: `${route.source} -> ${(route.endpointNames ?? []).join(", ")}`,
            detail: route.isEnabled === false ? "Disabled" : undefined,
        })),
        placeHolder,
    );
    return picked.label;
}
