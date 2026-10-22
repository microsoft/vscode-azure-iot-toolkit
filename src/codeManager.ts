// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fs from "fs-extra";
import * as path from "path";
import * as replace from "replace-in-file";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { DeviceItem } from "./Model/DeviceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class CodeManager {
    // Ruby single-quoted literals treat only backslash and single quote as special.
    public static escapeRubySingleQuoted(value: string): string {
        return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    }

    // Generated SAS tokens look like: SharedAccessSignature sr=...&sig=...&se=...[&skn=...]
    public static isSafeSasToken(token: string): boolean {
        return token === "" || /^SharedAccessSignature [A-Za-z0-9%&=._~+\-/]+$/.test(token);
    }

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

        const iotHubConnectionString = await Utility.getConnectionStringWithId(Constants.IotHubConnectionStringKey);
        if (!iotHubConnectionString) {
            vscode.window.showErrorMessage("IoT Hub connection string is not set. Please set it first.");
            return;
        }
        const template = this.context.asAbsolutePath(path.join("resources", "code-template", Constants.CodeTemplates[language][type]));
        const hostName = Utility.getHostName(iotHubConnectionString);
        if (!/^[A-Za-z0-9.-]+$/.test(hostName || "")) {
            vscode.window.showErrorMessage("IoT Hub host name contains invalid characters.");
            return;
        }
        let sasToken = "";
        try {
            if (deviceItem.connectionString && !deviceItem.connectionString.includes("x509=true")) {
                sasToken = Utility.generateSasTokenForDevice(deviceItem.connectionString);
            }
        } catch {
            // x509 or cert-based devices don't support SAS tokens
        }
        if (!CodeManager.isSafeSasToken(sasToken)) {
            vscode.window.showErrorMessage("Generated SAS token contains unexpected characters.");
            return;
        }
        const replacements = new Map(
            [[/{{deviceConnectionString}}/g, deviceItem.connectionString || ""],
            [/{{iotHubConnectionString}}/g, iotHubConnectionString],
            [/{{deviceId}}/g, language === "Ruby" ? encodeURIComponent(deviceItem.deviceId) : deviceItem.deviceId],
            [/{{iotHubHostName}}/g, hostName],
            [/{{deviceSasToken}}/g, language === "Ruby" ? CodeManager.escapeRubySingleQuoted(sasToken) : sasToken],
            ]);
        if ((await fs.stat(template)).isFile()) {
            let content = await fs.readFile(template, "utf8");
            for (const [key, value] of replacements) {
                content = content.replace(key, value);
            }
            const textDocument = await vscode.workspace.openTextDocument({ content, language: Constants.LanguageIds[language] });
            vscode.window.showTextDocument(textDocument);
        } else {
            const folderUri: vscode.Uri[] = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
            });
            if (!folderUri) {
                return;
            }
            const folder = folderUri[0].fsPath;
            await fs.copy(template, folder);
            await replace.replaceInFile({
                files: `${folder}/**/*`,
                from: [...replacements.keys()],
                to: [...replacements.values()],
            });
            await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(folder), true);
        }

        TelemetryClient.sendEvent("AZ.Generate.Code.Done", { language, codeType: type });
    }
}
