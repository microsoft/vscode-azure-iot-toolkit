// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class SnippetManager extends BaseExplorer {
    private connectionStringKeys = [Constants.DeviceConnectionStringKey, Constants.IotHubConnectionStringKey];

    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public replaceConnectionString(event: vscode.TextDocumentChangeEvent): void {
        if (!event.contentChanges[0]) {
            return;
        }
        const changedText = event.contentChanges[0].text;
        if (/\r|\n/.exec(changedText) && event.document.uri.scheme.indexOf("git") === -1) {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }
            const document = editor.document;
            const text = document.getText();
            this.connectionStringKeys.forEach(async (connectionStringKey) => {
                const connectionStringValue = await Utility.getConnectionStringWithId(connectionStringKey);
                const connectionStringKeyWithAngleBracket = this.getTextWithAngleBracket(connectionStringKey);
                if (changedText.indexOf(connectionStringKeyWithAngleBracket) > -1
                    && connectionStringValue && !connectionStringValue.startsWith("<<insert")) {
                    let offset = text.indexOf(connectionStringKeyWithAngleBracket);
                    while (offset > -1) {
                        editor.edit((editBuilder) => {
                            editBuilder.replace(new vscode.Range(document.positionAt(offset),
                                document.positionAt(offset + connectionStringKeyWithAngleBracket.length)),
                                connectionStringValue);
                            TelemetryClient.sendEvent(`Snippet.ReplaceConnectionString`, { Type: connectionStringKey });
                        });
                        offset = text.indexOf(connectionStringKeyWithAngleBracket, offset + 1);
                    }
                }
            });
        }
    }

    private getTextWithAngleBracket(text: string): string {
        return "<" + text + ">";
    }
}
