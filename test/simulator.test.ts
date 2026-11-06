// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as assert from "assert";
import { DeviceItem } from "../src/Model/DeviceItem";
import { Simulator } from "../src/simulator";
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
});
