// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as assert from "assert";
import {
    buildEndpointIdentity,
    getEventStreamEndpoints,
    SYSTEM_ASSIGNED_IDENTITY,
    validateEndpointName,
    validateEndpointUri,
    validateGuid,
} from "../src/messageEndpoint/fabricEventStreamCommands";
import { getCustomEndpointNames, refreshSelectedHub } from "../src/messageEndpoint/hubRouting";

suite("Fabric Event Stream Tests", () => {

    test("should map [system] to no endpoint identity", () => {
        assert.strictEqual(buildEndpointIdentity(SYSTEM_ASSIGNED_IDENTITY), undefined);
    });

    test("should map any other identity to a user assigned identity", () => {
        const resourceId = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg"
            + "/providers/Microsoft.ManagedIdentity/userAssignedIdentities/my-identity";
        assert.deepStrictEqual(buildEndpointIdentity(resourceId), { userAssignedIdentity: resourceId });
    });

    test("should validate endpoint names against the service rules", () => {
        assert.strictEqual(validateEndpointName("fabric-endpoint", []), undefined);
        assert.ok(validateEndpointName("", []));
        assert.ok(validateEndpointName("has space", []));
        assert.ok(validateEndpointName("events", []));
        assert.ok(validateEndpointName("fileNotifications", []));
        assert.ok(validateEndpointName("$default", []));
        assert.ok(validateEndpointName("a".repeat(65), []));
    });

    test("should reject duplicate endpoint names", () => {
        const existing = ["taken"];
        assert.ok(validateEndpointName("taken", existing));
        assert.ok(validateEndpointName("TAKEN", existing));
        assert.strictEqual(validateEndpointName("free", existing), undefined);
    });

    test("should collect endpoint names across all custom endpoint types", () => {
        const hub = {
            properties: {
                routing: {
                    endpoints: {
                        eventHubs: [{ name: "event-hub" }],
                        serviceBusQueues: [{ name: "queue" }],
                        serviceBusTopics: [{ name: "topic" }],
                        storageContainers: [{ name: "storage" }],
                        cosmosDBSqlContainers: [{ name: "cosmos" }],
                        eventStreams: [{ name: "event-stream" }],
                    },
                },
            },
        } as any;
        assert.deepStrictEqual(getCustomEndpointNames(hub),
            ["event-hub", "queue", "topic", "storage", "cosmos", "event-stream"]);
    });

    test("should refresh the original hub for follow-up routing changes", async () => {
        const latestHub = { etag: "new-etag" } as any;
        const calls: string[][] = [];
        const client = {
            iotHubResource: {
                get: async (resourceGroupName: string, hubName: string) => {
                    calls.push([resourceGroupName, hubName]);
                    return latestHub;
                },
            },
        } as any;
        const selected = {
            client,
            hub: { etag: "old-etag" } as any,
            resourceGroupName: "resource-group",
            hubName: "original-hub",
        };

        const refreshed = await refreshSelectedHub(selected);

        assert.deepStrictEqual(calls, [["resource-group", "original-hub"]]);
        assert.strictEqual(refreshed.client, client);
        assert.strictEqual(refreshed.hub, latestHub);
    });

    test("should require the sb:// protocol on the endpoint URI", () => {
        assert.strictEqual(validateEndpointUri("sb://ns.servicebus.windows.net"), undefined);
        assert.ok(validateEndpointUri("https://ns.servicebus.windows.net"));
        assert.ok(validateEndpointUri("ns.servicebus.windows.net"));
        assert.ok(validateEndpointUri(""));
    });

    test("should validate the Fabric GUIDs", () => {
        assert.strictEqual(validateGuid("6f3c1a2b-4d5e-4f60-8a71-9b2c3d4e5f60"), undefined);
        assert.strictEqual(validateGuid("6F3C1A2B-4D5E-4F60-8A71-9B2C3D4E5F60"), undefined);
        assert.ok(validateGuid("not-a-guid"));
        assert.ok(validateGuid(""));
        assert.ok(validateGuid(undefined));
    });

    test("should name the offending field when the caller supplies a label", () => {
        assert.strictEqual(validateGuid("", "Workspace ID"), "Workspace ID is required");
        assert.strictEqual(validateGuid("nope", "Workspace ID"), "Workspace ID must be a GUID");
        assert.strictEqual(validateGuid("6f3c1a2b-4d5e-4f60-8a71-9b2c3d4e5f60", "Workspace ID"), undefined);
    });

    test("should tolerate hubs without routing configuration", () => {
        assert.deepStrictEqual(getEventStreamEndpoints(undefined), []);
        assert.deepStrictEqual(getEventStreamEndpoints({} as any), []);
        assert.deepStrictEqual(getEventStreamEndpoints({ properties: {} } as any), []);
        assert.deepStrictEqual(getEventStreamEndpoints({ properties: { routing: { endpoints: {} } } } as any), []);
    });

    test("should read the event stream endpoints of a configured hub", () => {
        const hub = {
            properties: { routing: { endpoints: { eventStreams: [{ name: "es1" }] } } },
        } as any;
        assert.strictEqual(getEventStreamEndpoints(hub).length, 1);
        assert.strictEqual(getEventStreamEndpoints(hub)[0].name, "es1");
    });
});
