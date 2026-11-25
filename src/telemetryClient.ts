// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { TelemetryReporter } from "@vscode/extension-telemetry";
import { Constants } from "./constants";
import { NSAT } from "./nsat";
import { Utility } from "./utility";

export class TelemetryClient {
    public static initialize(context: vscode.ExtensionContext) {
        this._extensionContext = context;
        // Lazy-initialize TelemetryReporter after extension context is ready
        if (!this._client) {
            const packageJSON = vscode.extensions.getExtension(Constants.ExtensionId)?.packageJSON;
            const connectionString: string = packageJSON?.applicationInsightsConnectionString ||
                (packageJSON?.aiKey ? `InstrumentationKey=${packageJSON.aiKey}` : "");
            if (!connectionString) {
                return;
            }
            this._client = new TelemetryReporter(connectionString);
            context.subscriptions.push(this._client);
        }
    }

    public static async sendEvent(eventName: string, properties?: { [key: string]: string; }, iotHubConnectionString?: string, measurements?: { [key: string]: number }) {
        if (!this._client) {
            return;
        }
        properties = await this.addCommonProperties(properties, iotHubConnectionString);
        const errorProperties = Object.values(Constants.errorProperties);
        if (this.hasErrorProperties(properties, errorProperties)) {
            this._client.sendTelemetryErrorEvent(eventName, properties, measurements);
        } else {
            this._client.sendTelemetryEvent(eventName, properties, measurements);
        }

        if (eventName.startsWith("AZ.") && eventName !== Constants.IoTHubAILoadDeviceTreeEvent) {
            if (this._extensionContext) {
                NSAT.takeSurvey(this._extensionContext);
            }
        }
    }

    private static _client: TelemetryReporter | undefined;
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
