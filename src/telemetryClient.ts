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
    public static initialize(context: vscode.ExtensionContext) {
        this._extensionContext = context;
    }

    public static sendEvent(eventName: string, properties?: { [key: string]: string; }, iotHubConnectionString?: string): void {
        properties = this.addCommonProperties(properties, iotHubConnectionString);
        this._client.sendTelemetryEvent(eventName, properties);

        if (eventName.startsWith("AZ.") && eventName !== Constants.IoTHubAILoadDeviceTreeEvent) {
            if (this._extensionContext) {
                NSAT.takeSurvey(this._extensionContext);
            }
        }
    }

    private static _client = new TelemetryReporter(Constants.ExtensionId, extensionVersion, aiKey);
    private static _extensionContext: vscode.ExtensionContext;
    private static _isInternal: boolean = TelemetryClient.isInternalUser();

    private static addCommonProperties(properties?: { [key: string]: string; }, iotHubConnectionString?: string): any {
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

        newProperties.IsInternal = this._isInternal === true ? "true" : "false";

        return newProperties;
    }

    private static isInternalUser(): boolean {
        const userDomain = process.env.USERDNSDOMAIN ? process.env.USERDNSDOMAIN.toLowerCase() : "";
        return userDomain.endsWith("microsoft.com");
    }
}
