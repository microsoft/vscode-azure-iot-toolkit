'use strict';
import * as vscode from 'vscode';

export class Utility {
    static output(outputChannel: vscode.OutputChannel, label: string, message: string): void {
        outputChannel.appendLine(`[${label}] ${message}`);
    }

    static getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration('azure-iot-toolkit');
    }
}