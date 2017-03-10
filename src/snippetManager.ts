"use strict";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { Utility } from "./utility";

export class SnippetManager extends BaseExplorer {
    private connectionStringKeys = [Constants.DeviceConnectionStringKey, Constants.IotHubConnectionStringKey];

    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public replaceConnectionString(event: vscode.TextDocumentChangeEvent): void {
        let changedText = event.contentChanges[0].text;
        if (/\r|\n/.exec(changedText) && event.document.uri.scheme.indexOf("git") === -1) {
            let editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }
            let document = editor.document;
            let text = document.getText();
            let config = Utility.getConfiguration();
            this.connectionStringKeys.forEach((connectionStringKey) => {
                let connectionStringValue = config.get<string>(connectionStringKey);
                let connectionStringKeyWithAngleBracket = this.getTextWithAngleBracket(connectionStringKey);
                if (changedText.indexOf(connectionStringKeyWithAngleBracket) > -1
                    && connectionStringValue && !connectionStringValue.startsWith("<<insert")) {
                    let offset = text.indexOf(connectionStringKeyWithAngleBracket);
                    while (offset > -1) {
                        editor.edit((editBuilder) => {
                            editBuilder.replace(new vscode.Range(document.positionAt(offset),
                                document.positionAt(offset + connectionStringKeyWithAngleBracket.length)),
                                connectionStringValue);
                            AppInsightsClient.sendEvent(`ReplaceConnectionString`, { Type: connectionStringKey });
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
