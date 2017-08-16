import * as assert from "assert";
import * as vscode from "vscode";
import { Constants } from "../src/constants";
import { Utility } from "../src/utility";

suite("Utility Tests ", () => {

    test("should be able to get hostname", () => {
        let hostname = Utility.getHostName("HostName=iot-hub-test.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=abcdef");
        assert.equal(hostname, "iot-hub-test.azure-devices.net");
    });

    test("should be able to get config", () => {
        let iotHubD2CMessageStringify = Utility.getConfig<boolean>(Constants.IoTHubD2CMessageStringifyKey);
        assert.equal(iotHubD2CMessageStringify, false);
    });
});
