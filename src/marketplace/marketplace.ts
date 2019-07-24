// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { LocalServer } from "./localserver";


const marketplacePanelViewType = "IoT Edge Marketplace";
const marketplacePanelViewTitle = "IoT Edge Marketplace";

export class Marketplace {
    public static getInstance(context: vscode.ExtensionContext) {
        if (!Marketplace.instance) {
            Marketplace.instance = new Marketplace(context);
        }
        return Marketplace.instance;
    }

    private static instance: Marketplace;
    private panel: vscode.WebviewPanel;
    private localServer: LocalServer;

    private constructor(private context: vscode.ExtensionContext) {
        this.localServer = new LocalServer(context);
    }

    public async openMarketplacePage(): Promise<any> {
        if (!this.panel) {
            this.localServer.startServer();
            this.panel = vscode.window.createWebviewPanel(
                marketplacePanelViewType,
                marketplacePanelViewTitle,
                vscode.ViewColumn.One,
                {
                    enableCommandUris: true,
                    enableScripts: true,
                    retainContextWhenHidden: true,
                },
            );

            let html = fs.readFileSync(this.context.asAbsolutePath(path.join("src", "marketplace", "assets", "index.html")), "utf8");
            html = html
                .replace(/{{root}}/g, vscode.Uri.file(this.context.asAbsolutePath(".")).with({ scheme: "vscode-resource" }).toString())
                .replace(/{{endpoint}}/g, this.localServer.getServerUri());
            this.panel.webview.html = html;

            this.panel.onDidDispose(() => {
                this.panel = undefined;
                this.localServer.stopServer();
            });
        } else {
            this.panel.reveal();
        }
    }
}
