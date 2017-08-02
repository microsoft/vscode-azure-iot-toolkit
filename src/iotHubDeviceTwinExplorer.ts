"use strict";
import * as iothub from "azure-iothub";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { DeviceItem } from "./Model/DeviceItem";
import { Utility } from "./utility";

export class IotHubDeviceTwinExplorer extends BaseExplorer {
    private deviceTwinJosnFile: string;

    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
        this.deviceTwinJosnFile = path.join(os.tmpdir(), "azure-iot-device-twin.json");
    }

    public async getDeviceTwin(deviceId: string) {
        let iotHubConnectionString = await Utility.getConfig("iotHubConnectionString", "IoT Hub Connection String");
        if (!iotHubConnectionString) {
            return;
        }

        let registry = iothub.Registry.fromConnectionString(iotHubConnectionString);
        this._outputChannel.show();
        this.outputLine(Constants.IoTHubDeviceTwinLabel, `Get Device Twin for [${deviceId}]...`);
        registry.getTwin(deviceId, (err, twin) => {
            if (err) {
                this.outputLine(Constants.IoTHubDeviceTwinLabel, `Failed to get Device Twin: ${err.message}`);
            } else {
                this.outputLine(Constants.IoTHubDeviceTwinLabel, `${JSON.stringify(twin, null, 4)}`);
                fs.writeFileSync(this.deviceTwinJosnFile, `${JSON.stringify(twin, null, 4)}`);
                vscode.workspace.openTextDocument(this.deviceTwinJosnFile).then((document: vscode.TextDocument) => {
                    if (document.isDirty) {
                        vscode.window.showWarningMessage(`You azure-iot-device-twin.json has unsaved changes. \
                        Please close or save the file. Then try again.`);
                    }
                    vscode.window.showTextDocument(document);
                });
            }
        });
    }
}
