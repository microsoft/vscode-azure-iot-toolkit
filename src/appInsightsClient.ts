"use strict";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { Utility } from "./utility";
import appInsights = require("applicationinsights");

export class AppInsightsClient {
    public static sendEvent(eventName: string, properties?: { [key: string]: string; }): void {
        if (this._enableAppInsights) {
            properties = this.addIoTHubHostName(properties);
            this._client.trackEvent(eventName, properties);
        }
    }

    private static _client = appInsights.getClient("6ada6440-d926-4331-b914-d8f1ea3b012f");
    private static _enableAppInsights = Utility.getConfiguration().get<boolean>("enableAppInsights");

    private static addIoTHubHostName(properties?: { [key: string]: string; }): any {
        let newProperties = properties ? properties : {};
        let iotHubConnectionString = Utility.getConfigWithId(Constants.IotHubConnectionStringKey);
        if (!iotHubConnectionString) {
            iotHubConnectionString = Utility.getConfigWithId(Constants.DeviceConnectionStringKey);
        }

        if (iotHubConnectionString) {
            let iotHubHostName = Utility.getHostName(iotHubConnectionString);
            if (iotHubHostName) {
                newProperties.IoTHubHostName = iotHubHostName;
            }
        }
        return newProperties;
    }
}
