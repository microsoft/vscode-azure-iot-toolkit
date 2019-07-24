// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fse from "fs-extra";
import * as vscode from "vscode";
import { Marketplace } from "./marketplace/marketplace";
import { Utility } from "./utility";
import * as path from "path";
export class SimulatorWebview {

    constructor(private context: vscode.ExtensionContext) {
    }

    
    public async addModule(): Promise<void> {
        const marketplace = Marketplace.getInstance(this.context);
        await marketplace.openMarketplacePage();
        return;
        
    }
}
