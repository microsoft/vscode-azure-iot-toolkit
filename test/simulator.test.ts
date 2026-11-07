// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as assert from "assert";
import { Constants } from "../src/constants";
import { DeviceItem } from "../src/Model/DeviceItem";
import { Simulator } from "../src/simulator";
import { TelemetryClient } from "../src/telemetryClient";
import { Utility } from "../src/utility";

suite("Simulator Tests", () => {

    test("returns device labels without exposing connection strings", async () => {
        const originalGetConnectionString = Utility.getConnectionString;
        const originalGetFilteredDeviceList = Utility.getFilteredDeviceList;

        try {
            (Utility as any).getConnectionString = async () => "HostName=test.azure-devices.net";
            (Utility as any).getFilteredDeviceList = async () => [{
                deviceId: "device-a",
                label: "Device A",
                connectionString: "must-not-leak",
            } as DeviceItem];

            const devices = await Simulator.getInstance({} as any).getInputDeviceList();

            assert.deepStrictEqual(devices, [{ deviceId: "device-a", label: "Device A" }]);
            assert.strictEqual("connectionString" in devices[0], false);
        } finally {
            (Utility as any).getConnectionString = originalGetConnectionString;
            (Utility as any).getFilteredDeviceList = originalGetFilteredDeviceList;
        }
    });

    test("uses the posted device count for successful send telemetry", async () => {
        const originalSendEvent = TelemetryClient.sendEvent;
        let sentProperties: { [key: string]: string };

        try {
            (TelemetryClient as any).sendEvent = (_eventName: string, properties: { [key: string]: string }) => {
                sentProperties = properties;
            };

            await Simulator.getInstance({} as any).telemetry(Constants.SimulatorSendEvent, true, {
                devices: 2,
                numbers: "3",
                interval: "1000",
                messageBodyType: "Plain Text",
            });

            assert.strictEqual(sentProperties.DeviceNumber, "2");
        } finally {
            (TelemetryClient as any).sendEvent = originalSendEvent;
        }
    });

    test("does not start sending after cancellation during device lookup", async () => {
        const simulator = Simulator.getInstance({} as any);
        const originalGetDeviceConnectionString = Utility.getDeviceConnectionString;
        const originalHasDeviceSharedAccessKey = Utility.hasDeviceSharedAccessKey;
        let resolveLookup: (connectionString: string) => void;
        let markLookupStarted: () => void;
        const lookupStarted = new Promise<void>((resolve) => {
            markLookupStarted = resolve;
        });

        try {
            (Utility as any).getDeviceConnectionString = async () => {
                markLookupStarted();
                return new Promise<string>((resolve) => {
                    resolveLookup = resolve;
                });
            };
            (Utility as any).hasDeviceSharedAccessKey = () => {
                throw new Error("The send loop started after cancellation.");
            };

            const sending = simulator.sendD2CMessage(["device-a"], "test", false, 1, 0);
            await lookupStarted;
            assert.strictEqual(simulator.getStatus().getTotal(), 1);
            await simulator.cancel();
            resolveLookup("HostName=test.azure-devices.net;DeviceId=device-a;SharedAccessKey=a2V5");

            await sending;
            assert.strictEqual(simulator.isProcessing(), false);
        } finally {
            (Utility as any).getDeviceConnectionString = originalGetDeviceConnectionString;
            (Utility as any).hasDeviceSharedAccessKey = originalHasDeviceSharedAccessKey;
        }
    });

    test("limits concurrent device identity lookups", async () => {
        const simulator = Simulator.getInstance({} as any);
        const originalGetDeviceConnectionString = Utility.getDeviceConnectionString;
        let activeLookups = 0;
        let maxActiveLookups = 0;

        try {
            (Utility as any).getDeviceConnectionString = async () => {
                activeLookups++;
                maxActiveLookups = Math.max(maxActiveLookups, activeLookups);
                await new Promise((resolve) => setTimeout(resolve, 5));
                activeLookups--;
                return "HostName=test.azure-devices.net;DeviceId=device-a;x509=true";
            };

            await assert.rejects(
                simulator.sendD2CMessage(
                    Array.from({ length: 11 }, (_, index) => `device-${index}`),
                    "test",
                    false,
                    1,
                    0,
                ),
                /symmetric key/,
            );
            assert.ok(maxActiveLookups <= 10);
        } finally {
            (Utility as any).getDeviceConnectionString = originalGetDeviceConnectionString;
        }
    });
});
