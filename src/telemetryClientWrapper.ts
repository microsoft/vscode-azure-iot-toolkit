// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { TelemetryClient } from "./telemetryClient";

// Instan
export class TelemetryClientWrapper {

    private _eventNamePrefix: string;

    constructor(eventNamePrefix?: string) {
        this._eventNamePrefix = eventNamePrefix;
    }

    public async sendTelemetryEvent(eventName: string, properties?: { [key: string]: string }, measurements?: { [key: string]: number }): Promise<void> {
        if (this._eventNamePrefix) {
            eventName = this._eventNamePrefix + eventName;
        }

        TelemetryClient.sendEvent(eventName, properties, undefined, measurements);
    }
}
