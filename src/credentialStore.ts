// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as keytarType from "keytar";
import * as vscode from "vscode";
import { Constants } from "./constants";

export class CredentialStore {
    public static getPassword(account: string): Promise<string> {
        try {
            return this.keytar.getPassword(Constants.ExtensionId, account);
        } catch (error) {
            return Constants.ExtensionContext.globalState.get(account);
        }
    }

    public static async setPassword(account: string, password: string) {
        try {
            await this.keytar.setPassword(Constants.ExtensionId, account, password);
        } catch (error) {
            await Constants.ExtensionContext.globalState.update(account, password);
        }
    }

    private static keytar: typeof keytarType = CredentialStore.getCoreNodeModule("keytar");

    /**
     * Helper function that returns a node module installed with VSCode, or null if it fails.
     */
    private static getCoreNodeModule(moduleName: string) {
        try {
            return require(`${vscode.env.appRoot}/node_modules.asar/${moduleName}`);
        } catch (err) { }

        try {
            return require(`${vscode.env.appRoot}/node_modules/${moduleName}`);
        } catch (err) { }

        return null;
    }
}
