'use strict';
import * as vscode from 'vscode';
import { AppInsightsClient } from './appInsightsClient';

export class BaseExplorer {
    protected _outputChannel: vscode.OutputChannel;
    protected _appInsightsClient: AppInsightsClient;

    constructor(outputChannel: vscode.OutputChannel, appInsightsClient: AppInsightsClient) {
        this._outputChannel = outputChannel;
        this._appInsightsClient = appInsightsClient;
    }

    output(label: string, message: string): void {
        this._outputChannel.append(`[${label}] ${message}`);
    }

    outputLine(label: string, message: string): void {
        this._outputChannel.appendLine(`[${label}] ${message}`);
    }
}