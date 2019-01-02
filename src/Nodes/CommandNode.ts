// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { INode } from "./INode";

export class CommandNode implements INode {

    constructor(private readonly label: string, private readonly command: string, private args?: any[]) {
    }

    public getTreeItem(): vscode.TreeItem {
        return this.createCommandItem(this.label, this.command, this.args);
    }

    public getChildren(): INode[] {
        return [];
    }

    private createCommandItem(label: string, command: string, args: any[]): vscode.TreeItem {
        const commandItem = new vscode.TreeItem(label);
        commandItem.command = {
            command,
            title: "",
            arguments: args,
        };
        return commandItem;
    }
}
