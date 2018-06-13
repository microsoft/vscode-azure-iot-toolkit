// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";

import * as vscode from "vscode";

export class ModuleTwinCodeLensProvider implements vscode.CodeLensProvider {
    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
        const range = new vscode.Range(0, 0, 0, 0);
        const cmd: vscode.Command = {
            title: "Update Module Twin",
            command: "azure-iot-toolkit.updateModuleTwin",
        };
        return Promise.resolve([new vscode.CodeLens(range, cmd)]);
    }
}
