// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { DeviceItem } from "./Model/DeviceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class CodeManager {
    constructor(private context: vscode.ExtensionContext) {
    }

    public async generateCode(deviceItem: DeviceItem) {
        deviceItem = await Utility.getInputDevice(deviceItem, "AZ.Generate.Code.Start");
        if (!deviceItem) {
            return;
        }

        const language = await vscode.window.showQuickPick(
            Object.keys(Constants.CodeTemplates),
            { placeHolder: "Select language", ignoreFocusOut: true },
        );
        if (!language) {
            return;
        }

        const type = await vscode.window.showQuickPick(
            Object.keys(Constants.CodeTemplates[language]),
            { placeHolder: "Select code type", ignoreFocusOut: true },
        );
        if (!type) {
            return;
        }

        const iotHubConnectionString = Utility.getConnectionStringWithId(Constants.IotHubConnectionStringKey);
        const content = fs.readFileSync(this.context.asAbsolutePath(path.join("resources", "code-template", Constants.CodeTemplates[language][type])), "utf8")
            .replace(/{{deviceConnectionString}}/g, deviceItem.connectionString)
            .replace(/{{iotHubConnectionString}}/g, iotHubConnectionString)
            .replace(/{{deviceId}}/g, deviceItem.deviceId)
            .replace(/{{iotHubHostName}}/g, Utility.getHostName(iotHubConnectionString))
            .replace(/{{deviceSasToken}}/g, Utility.generateSasTokenForDevice(deviceItem.connectionString));
        const textDocument = await vscode.workspace.openTextDocument({ content, language: Constants.LanguageIds[language] });
        vscode.window.showTextDocument(textDocument);

        TelemetryClient.sendEvent("AZ.Generate.Code.Done", { language, type });
    }
}
