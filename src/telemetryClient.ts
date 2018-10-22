// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import { Constants } from "./constants";
import { NSAT } from "./nsat";
import { Utility } from "./utility";

const packageJSON = vscode.extensions.getExtension(Constants.ExtensionId).packageJSON;
const extensionVersion: string = packageJSON.version;
const aiKey: string = packageJSON.aiKey;

export class TelemetryClient {
    public static extensionContext: vscode.ExtensionContext;

    public static sendEvent(eventName: string, properties?: { [key: string]: string; }, iotHubConnectionString?: string): void {
        properties = this.addIoTHubHostName(properties, iotHubConnectionString);
        this._client.sendTelemetryEvent(eventName, properties);
        if (eventName.startsWith("AZ.") || eventName.startsWith("Edge.")) {
            NSAT.takeSurvey(this.extensionContext);
        }
    }

    private static _client = new TelemetryReporter(Constants.ExtensionId, extensionVersion, aiKey);

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
                newProperties.IoTHubHostNamePostfix = Utility.getPostfixFromHostName(iotHubHostName);
            }
        }
        return newProperties;
    }
}
