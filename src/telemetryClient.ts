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

    public static async sendEvent(eventName: string, properties?: { [key: string]: string; }, iotHubConnectionString?: string, measurements?: { [key: string]: number }) {
        properties = await this.addCommonProperties(properties, iotHubConnectionString);
        const errorProperties = Object.values(Constants.errorProperties);
        if (this.hasErrorProperties(properties, errorProperties)) {
            this._client.sendTelemetryErrorEvent(eventName, properties, measurements, errorProperties);
        } else {
            this._client.sendTelemetryEvent(eventName, properties, measurements);
        }

        if (eventName.startsWith("AZ.") && eventName !== Constants.IoTHubAILoadDeviceTreeEvent) {
            if (this._extensionContext) {
                NSAT.takeSurvey(this._extensionContext);
            }
        }
    }

    private static _client = new TelemetryReporter(Constants.ExtensionId, extensionVersion, aiKey, true);
    private static _extensionContext: vscode.ExtensionContext;
    private static _isInternal: boolean = TelemetryClient.isInternalUser();

    private static async addCommonProperties(properties?: { [key: string]: string; }, iotHubConnectionString?: string) {
        const newProperties = properties ? properties : {};
        if (!iotHubConnectionString) {
            iotHubConnectionString = await Utility.getConnectionStringWithId(Constants.IotHubConnectionStringKey);
            if (!iotHubConnectionString) {
                iotHubConnectionString = await Utility.getConnectionStringWithId(Constants.DeviceConnectionStringKey);
            }
        }

        if (iotHubConnectionString) {
            const iotHubHostName = Utility.getHostName(iotHubConnectionString);
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

    private static hasErrorProperties(properties: { [key: string]: string; }, errorProperties: string[]): boolean {
        const propertyKeys = Object.keys(properties);
        return errorProperties.some((value) => propertyKeys.includes(value));
    }
}
