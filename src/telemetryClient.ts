// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { TelemetryReporterWrapper } from "./telemetryReporterWrapper";
import { Utility } from "./utility";

const packageJSON = vscode.extensions.getExtension(Constants.ExtensionId).packageJSON;
const extensionVersion: string = packageJSON.version;
const aiKey: string = packageJSON.aiKey;

export class TelemetryClient {
    public static initialize(context: vscode.ExtensionContext) {
        this._client = new TelemetryReporterWrapper(Constants.ExtensionId, extensionVersion, aiKey, context);
    }

    public static async sendEvent(eventName: string, properties?: { [key: string]: string; }, iotHubConnectionString?: string) {
        properties = await this.addCommonProperties(properties, iotHubConnectionString);
        this._client.sendTelemetryEvent(eventName, properties);
    }

    private static _client: TelemetryReporterWrapper;

    private static async addCommonProperties(properties?: { [key: string]: string; }, iotHubConnectionString?: string) {
        let newProperties = properties ? properties : {};
        if (!iotHubConnectionString) {
            iotHubConnectionString = await Utility.getConnectionStringWithId(Constants.IotHubConnectionStringKey);
            if (!iotHubConnectionString) {
                iotHubConnectionString = await Utility.getConnectionStringWithId(Constants.DeviceConnectionStringKey);
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
