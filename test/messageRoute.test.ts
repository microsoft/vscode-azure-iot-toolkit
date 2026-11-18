// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as assert from "assert";
import { KnownRoutingSource, RoutingProperties } from "@azure/arm-iothub";
import * as vscode from "vscode";
import * as ui from "../src/common/ui";
import * as hubRouting from "../src/messageEndpoint/hubRouting";
import { updateMessageRoute } from "../src/messageRoute/messageRouteCommands";

suite("Message Route Tests", () => {

    test("keeps current values selected when updating a route", async () => {
        const route = {
            name: "route-a",
            source: KnownRoutingSource.MqttBrokerMessages,
            endpointNames: ["custom-endpoint"],
            condition: "true",
            isEnabled: false,
        };
        const selectedHub = {
            hubName: "hub-a",
            hub: {
                properties: {
                    routing: {
                        endpoints: {
                            eventHubs: [{ name: "custom-endpoint" }],
                        },
                        routes: [route],
                    },
                },
            },
        } as any;
        const originalGetSelectedHub = hubRouting.getSelectedHub;
        const originalUpdateHubRouting = hubRouting.updateHubRouting;
        const originalPickOne = ui.pickOne;
        const originalShowInputBox = vscode.window.showInputBox;
        const originalShowInformationMessage = vscode.window.showInformationMessage;
        const firstItems: string[] = [];

        try {
            (hubRouting as any).getSelectedHub = async () => selectedHub;
            (hubRouting as any).updateHubRouting = async (
                _selected: hubRouting.ISelectedHub,
                _title: string,
                mutate: (routing: RoutingProperties) => void,
            ) => {
                mutate(selectedHub.hub.properties.routing);
            };
            (ui as any).pickOne = async (items: vscode.QuickPickItem[]) => {
                firstItems.push(items[0].label);
                return items[0];
            };
            (vscode.window as any).showInputBox = async (options: vscode.InputBoxOptions) => options.value;
            (vscode.window as any).showInformationMessage = async () => undefined;

            await updateMessageRoute({ appendLine: () => undefined } as any, route.name);

            assert.deepStrictEqual(firstItems, [KnownRoutingSource.MqttBrokerMessages, "custom-endpoint", "Disabled"]);
            assert.deepStrictEqual(route, {
                name: "route-a",
                source: KnownRoutingSource.MqttBrokerMessages,
                endpointNames: ["custom-endpoint"],
                condition: "true",
                isEnabled: false,
            });
        } finally {
            (hubRouting as any).getSelectedHub = originalGetSelectedHub;
            (hubRouting as any).updateHubRouting = originalUpdateHubRouting;
            (ui as any).pickOne = originalPickOne;
            (vscode.window as any).showInputBox = originalShowInputBox;
            (vscode.window as any).showInformationMessage = originalShowInformationMessage;
        }
    });
});
