// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import { Constants } from "./constants";
import { NSAT } from "./nsat";

export class TelemetryReporterWrapper extends TelemetryReporter {

    private _extensionContext: vscode.ExtensionContext;
    private _eventNamePrefix: string;

    constructor(extensionId: string, extensionVersion: string, key: string, extensionContext: vscode.ExtensionContext, eventNamePrefix?: string) {
        super(extensionId, extensionVersion, key);
        this._extensionContext = extensionContext;
        this._eventNamePrefix = eventNamePrefix;
    }

    public async sendTelemetryEvent(eventName: string, properties?: { [key: string]: string }, measurements?: { [key: string]: number }): Promise<void> {
        properties = this.addCommonProperties(properties);
        if (this._eventNamePrefix) {
            eventName = this._eventNamePrefix + eventName;
        }
        super.sendTelemetryEvent(eventName, properties, measurements);

        // TODO: Add DPS events here after discussion
        if (eventName.startsWith("AZ.") && eventName !== Constants.IoTHubAILoadDeviceTreeEvent) {
            if (this._extensionContext) {
                NSAT.takeSurvey(this._extensionContext);
            }
        }
    }

    private addCommonProperties(properties?: { [key: string]: string; }, iotHubConnectionString?: string): { [key: string]: string; } {
        let newProperties = properties ? properties : {};
        newProperties.IsInternal = this.isInternalUser() ? "true" : "false";

        return newProperties;
    }

    private isInternalUser(): boolean {
        const userDomain = process.env.USERDNSDOMAIN ? process.env.USERDNSDOMAIN.toLowerCase() : "";
        return userDomain.endsWith("microsoft.com");
    }
}
