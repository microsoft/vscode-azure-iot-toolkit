// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import { Constants } from "./constants";
import { Utility } from "./utility";

const extensionVersion: string = vscode.extensions.getExtension(Constants.ExtensionId).packageJSON.version;

export class TelemetryClient {
    public static sendEvent(eventName: string, properties?: { [key: string]: string; }, iotHubConnectionString?: string): void {
        properties = this.addIoTHubHostName(properties, iotHubConnectionString);
        this._client.sendTelemetryEvent(eventName, properties);
    }

    private static _client = new TelemetryReporter(Constants.ExtensionId, extensionVersion, Constants.AIKey);

    private static addIoTHubHostName(properties?: { [key: string]: string; }, iotHubConnectionString?: string): any {
        let newProperties = properties ? properties : {};
        if (!iotHubConnectionString) {
            iotHubConnectionString = Utility.getConnectionStringWithId(Constants.IotHubConnectionStringKey);
            if (!iotHubConnectionString) {
                iotHubConnectionString = Utility.getConnectionStringWithId(Constants.DeviceConnectionStringKey);
            }
        }

        if (iotHubConnectionString) {
            let iotHubHostName = Utility.getHostName(iotHubConnectionString);
            if (iotHubHostName) {
                newProperties.IoTHubHostName = Utility.hash(iotHubHostName);
            }
        }
        return newProperties;
    }
}
