// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as assert from "assert";
import * as vscode from "vscode";
import { Constants } from "../src/constants";
import { Utility } from "../src/utility";
import { TestConstants } from "./constants";

suite("Utility Tests ", () => {

    test("should be able to get hostname", () => {
        let hostname = Utility.getHostName(TestConstants.IotHubConnectionString);
        assert.equal(hostname, TestConstants.IotHubHostName);
    });

    test("should be able to get config", () => {
        let iotHubD2CMessageStringify = Utility.getConfig<boolean>(Constants.IoTHubD2CMessageStringifyKey);
        assert.equal(iotHubD2CMessageStringify, false);
    });

    // tslint:disable-next-line:only-arrow-functions
    test("should be able to get IoT Hub Connection String", function (done) {
        this.timeout(5 * 1000);
        let config = Utility.getConfiguration();
        config.update(Constants.IotHubConnectionStringKey, TestConstants.IotHubConnectionString, true).then(() => {
            Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle).then((IotHubConnectionString) => {
                assert.equal(IotHubConnectionString, TestConstants.IotHubConnectionString);
                done();
            });
        });
    });

    // tslint:disable-next-line:only-arrow-functions
    test("should be able to get 'null' value when querying a invalid IoT Hub Connection String", function (done) {
        this.timeout(5 * 1000);
        let config = Utility.getConfiguration();
        config.update(Constants.IotHubConnectionStringKey, TestConstants.InvalidIotHubConnectionString, true).then(() => {
            let IotHubConnectionString = Utility.getConnectionStringWithId(Constants.IotHubConnectionStringKey);
            assert.equal(IotHubConnectionString, null);
            done();
        });
    });

    test("should be able to generate SAS Token for IoT Hub", () => {
        let sasTokenForService = Utility.generateSasTokenForService(TestConstants.IotHubConnectionString, 10);
        assert.equal(/^SharedAccessSignature sr=iot-hub-test.azure-devices.net&sig=.+&skn=iothubowner&se=.+$/.test(sasTokenForService), true);
    });

    test("should be able to generate SAS Token for Device", () => {
        let sasTokenForDevice = Utility.generateSasTokenForDevice(TestConstants.DeviceConnectionString, 10);
        assert.equal(/^SharedAccessSignature sr=iot-hub-test.azure-devices.net%2Fdevices%2Fdevice1&sig=.+&se=.+$/.test(sasTokenForDevice), true);
    });
});
