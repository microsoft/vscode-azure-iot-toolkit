// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { QuickPickItem } from "vscode";

export class SamplingModeItem implements QuickPickItem {
    public readonly label: string;
    public readonly description: string;
    public readonly picked: boolean;
    public readonly distributedTracingEnabled: boolean;
    constructor(mode: boolean) {
        this.label = mode ? "Enable" : "Disable";
        this.description = mode ? "Enable Distributed Tracing" : "Disable Distributed Tracing";
        this.distributedTracingEnabled = mode;
    }
}
