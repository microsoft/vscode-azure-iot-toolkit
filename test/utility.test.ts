// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as assert from "assert";
import * as vscode from "vscode";
import { Constants } from "../src/constants";
import { Utility } from "../src/utility";
import { TestConstants } from "./constants";

suite("Utility Tests ", () => {

    test("should be able to get hostname", () => {
        const hostname = Utility.getHostName(TestConstants.IotHubConnectionString);
        assert.equal(hostname, TestConstants.IotHubHostName);
    });

    test("should be able to get postfix of hostname", () => {
        assert.equal(Utility.getPostfixFromHostName(TestConstants.IotHubHostName), "azure-devices.net");
    });

    test("should be able to get config", () => {
        const iotHubD2CMessageStringify = Utility.getConfig<boolean>(Constants.IoTHubD2CMessageStringifyKey);
        assert.equal(iotHubD2CMessageStringify, false);
    });

    test("should be able to get auto refresh enable flag", () => {
        const autoRefreshEnable = Utility.getConfig<boolean>(Constants.TreeViewAutoRefreshEnableKey);
        assert.equal(autoRefreshEnable, false);
    });

    test("should be able to get auto refresh interval", () => {
        const autoRefreshIntervalInSeconds = Utility.getConfig<boolean>(Constants.TreeViewAutoRefreshIntervalInSecondsKey);
        assert.equal(autoRefreshIntervalInSeconds, 60);
    });

    test("should be able to generate SAS Token for IoT Hub", () => {
        const sasTokenForService = Utility.generateSasTokenForService(TestConstants.IotHubConnectionString, 10);
        assert.equal(/^SharedAccessSignature sr=iot-hub-test.azure-devices.net&sig=.+&skn=iothubowner&se=.+$/.test(sasTokenForService), true);
    });

    test("should be able to generate SAS Token for Device", () => {
        const sasTokenForDevice = Utility.generateSasTokenForDevice(TestConstants.DeviceConnectionString, 10);
        assert.equal(/^SharedAccessSignature sr=iot-hub-test.azure-devices.net%2Fdevices%2Fdevice1&sig=.+&se=.+$/.test(sasTokenForDevice), true);
    });

    test("should reject SAS tokens for X.509 devices", () => {
        const connectionString = `HostName=${TestConstants.IotHubHostName};DeviceId=device1;x509=true`;
        assert.equal(Utility.hasDeviceSharedAccessKey(connectionString), false);
        assert.throws(
            () => Utility.generateSasTokenForDevice(connectionString, 10),
            /symmetric key/,
        );
    });

    test("should be able to validate target condition", () => {
        assert.equal(Utility.isValidTargetCondition("*"), true);

        assert.equal(Utility.isValidTargetCondition("tags.city='Shanghai'"), true);

        assert.equal(Utility.isValidTargetCondition("properties.reported.lastStatus='200'"), true);

        assert.equal(Utility.isValidTargetCondition("deviceId='device1'"), true);

        assert.equal(Utility.isValidTargetCondition("properties.desired.lastStatus='200'"), false);

        assert.equal(Utility.isValidTargetCondition("tags.='Shanghai'"), false);

        assert.equal(Utility.isValidTargetCondition("tag.stauts='200'"), false);
    });

    suite("device connection string", () => {
        const build = (device: any): string =>
            (Utility as any).buildDeviceConnectionString(TestConstants.IotHubHostName, device);

        test("uses the primary key looked up from the device identity", () => {
            const connectionString = build({
                deviceId: "device1",
                authentication: { symmetricKey: { primaryKey: "a2V5" } },
            });
            assert.equal(connectionString,
                `HostName=${TestConstants.IotHubHostName};DeviceId=device1;SharedAccessKey=a2V5`);
        });

        test("returns empty when a twin carries no key and no thumbprint", () => {
            assert.equal(build({ deviceId: "device1", authenticationType: "sas" }), "");
        });

        test("recognises the thumbprint on a twin, where it sits at the top level", () => {
            const connectionString = build({
                deviceId: "device1",
                authenticationType: "selfSigned",
                x509Thumbprint: { primaryThumbprint: "AB12" },
            });
            assert.equal(connectionString,
                `HostName=${TestConstants.IotHubHostName};DeviceId=device1;x509=true`);
        });

        test("recognises the thumbprint on an identity, where it sits under authentication", () => {
            const connectionString = build({
                deviceId: "device1",
                authentication: { x509Thumbprint: { primaryThumbprint: "AB12" } },
            });
            assert.equal(connectionString,
                `HostName=${TestConstants.IotHubHostName};DeviceId=device1;x509=true`);
        });

        test("recognises certificate authority authentication without a thumbprint", () => {
            const connectionString = build({
                deviceId: "device1",
                authentication: { type: "certificateAuthority" },
            });
            assert.equal(connectionString,
                `HostName=${TestConstants.IotHubHostName};DeviceId=device1;x509=true`);
        });

        test("prefers the symmetric key over a thumbprint", () => {
            const connectionString = build({
                deviceId: "device1",
                x509Thumbprint: { primaryThumbprint: "AB12" },
                authentication: { symmetricKey: { primaryKey: "a2V5" } },
            });
            assert.equal(connectionString,
                `HostName=${TestConstants.IotHubHostName};DeviceId=device1;SharedAccessKey=a2V5`);
        });
    });

    suite("isJsonString", () => {
        test("accepts JSON objects and arrays", () => {
            assert.equal(Utility.isJsonString('{"a":1}'), true);
            assert.equal(Utility.isJsonString("[1,2,3]"), true);
            assert.equal(Utility.isJsonString('  {"a":1}  '), true);
        });

        test("accepts JSON scalars produced by JSON.stringify", () => {
            assert.equal(Utility.isJsonString(JSON.stringify("Hello World")), true);
            assert.equal(Utility.isJsonString("123"), true);
            assert.equal(Utility.isJsonString("null"), true);
        });

        test("rejects plain text that would break a JSON parser", () => {
            assert.equal(Utility.isJsonString("Hello World"), false);
            assert.equal(Utility.isJsonString("$counter"), false);
            assert.equal(Utility.isJsonString('{"a":1'), false);
        });

        test("rejects empty, blank and non-string payloads", () => {
            assert.equal(Utility.isJsonString(""), false);
            assert.equal(Utility.isJsonString("   "), false);
            assert.equal(Utility.isJsonString(undefined), false);
            assert.equal(Utility.isJsonString(null), false);
            assert.equal(Utility.isJsonString({ a: 1 }), false);
        });
    });
});
