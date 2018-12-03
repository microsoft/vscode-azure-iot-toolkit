// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as assert from "assert";
import * as vscode from "vscode";
import { Constants } from "../src/constants";

suite("Extension Tests", () => {

    test("should be present", () => {
        assert.ok(vscode.extensions.getExtension(Constants.ExtensionId));
    });

    // tslint:disable-next-line:only-arrow-functions
    test("should be able to activate the extension", function (done) {
        this.timeout(60 * 1000);
        const extension = vscode.extensions.getExtension(Constants.ExtensionId);
        if (!extension.isActive) {
            extension.activate().then((api) => {
                done();
            }, () => {
                done("Failed to activate extension");
            });
        } else {
            done();
        }
    });

    /* This test only works when extensionDependencies are installed, so disable it in CI
    test("should be able to register iot hub toolkit commands", () => {
        return vscode.commands.getCommands(true).then((commands) => {
            const COMMANDS = [
                "azure-iot-toolkit.refreshDeviceTree",
                "azure-iot-toolkit.getDevice",
                "azure-iot-toolkit.sendD2CMessage",
                "azure-iot-toolkit.startMonitorIoTHubMessage",
                "azure-iot-toolkit.stopMonitorIoTHubMessage",
                "azure-iot-toolkit.sendC2DMessage",
                "azure-iot-toolkit.startMonitorC2DMessage",
                "azure-iot-toolkit.stopMonitorC2DMessage",
                "azure-iot-toolkit.listDevice",
                "azure-iot-toolkit.createDevice",
                "azure-iot-toolkit.deleteDevice",
                "azure-iot-toolkit.invokeDeviceMethod",
                "azure-iot-toolkit.getDeviceTwin",
                "azure-iot-toolkit.updateDeviceTwin",
                "azure-iot-toolkit.setIoTHubConnectionString",
                "azure-iot-toolkit.selectIoTHub",
            ].sort();

            const foundCommands = commands.filter((value) => {
                return value.startsWith("azure-iot-toolkit.");
            }).sort();

            const errorMsg = "Some iot hub toolkit commands are not registered properly or a new command is not added to the test";
            assert.equal(JSON.stringify(foundCommands), JSON.stringify(COMMANDS), errorMsg);
        });
    });*/
});
