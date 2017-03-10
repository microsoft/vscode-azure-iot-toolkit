"use strict";
import * as vscode from "vscode";
import scp2 = require("scp2");
import SSH = require("simple-ssh");
import { AppInsightsClient } from "./appInsightsClient";
import { BaseExplorer } from "./baseExplorer";
import { Utility } from "./utility";

export class DeviceController extends BaseExplorer {
    private _localFolder: string;
    private _remoteFolder: string;
    private _host: string;
    private _username: string;
    private _password: string;
    private _command: string;
    private _label = "Remote";

    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public deploy(run = false): void {
        this.getConfiguration();
        this._outputChannel.show();
        this.outputLine(this._label, `Deploying from '${this._localFolder}' to '${this._remoteFolder}'`);
        let options = this.getScpOptions();
        scp2.scp(this._localFolder, options, (err) => {
            if (err) {
                this.outputLine(this._label, "Deployment failed");
                this.outputLine(this._label, err);
                AppInsightsClient.sendEvent(`${this._label}.deploy`, { Result: "Fail" });
            } else {
                this.outputLine(this._label, "Deployment done");
                AppInsightsClient.sendEvent(`${this._label}.deploy`, { Result: "Success" });
                if (run) {
                    this.run();
                }
            }
        });
    }

    public run(): void {
        this.getConfiguration();
        this._outputChannel.show();
        this.outputLine(this._label, `Running '${this._command}'`);
        this.sshExecCmd(this._command);
    }

    private sshExecCmd(cmd: string, callback = null) {
        let ssh = new SSH(this.getSshOptions());

        ssh.exec(cmd, {
            pty: true,
            out: (stdout) => {
                this.outputLine(this._label, stdout);
            },
            err: (stderr) => {
                this.outputLine(this._label, stderr);
            },
            exit: (code) => {
                this.outputLine(this._label, `Exited with code=${code}`);
                AppInsightsClient.sendEvent(`${this._label}.run`, { Code: code.toString() });
                if (code === 0 && callback) {
                    callback();
                }
            },
        }).start();
    }

    private getConfiguration(): void {
        let config = Utility.getConfiguration();
        this._localFolder = config.get<string>("localFolder");
        this._remoteFolder = config.get<string>("remoteFolder");
        this._host = config.get<string>("host");
        this._username = config.get<string>("username");
        this._password = config.get<string>("password");
        this._command = config.get<string>("command");
    }

    private getScpOptions(): any {
        return {
            host: this._host,
            username: this._username,
            password: this._password,
            path: this._remoteFolder,
        };
    }

    private getSshOptions(): any {
        return {
            host: this._host,
            user: this._username,
            pass: this._password,
            baseDir: this._remoteFolder,
            timeout: 30000,
        };
    }
}
