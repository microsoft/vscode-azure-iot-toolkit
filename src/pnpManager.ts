// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import axios from "axios";
import * as vscode from "vscode";
import { BaseExplorer } from "./baseExplorer";
import { Constants } from "./constants";
import { InterfaceItem } from "./Model/InterfaceItem";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class PnpManager extends BaseExplorer {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
    }

    public async getInterface(interfaceItem: InterfaceItem) {
        if (interfaceItem) {
            await this.getInterfaceById(interfaceItem.deviceId, interfaceItem.name)
        }
    }

    private async getInterfaceById(deviceId: string, interfaceName: string) {
        TelemetryClient.sendEvent(Constants.IoTHubAIGetInterfaceStartEvent);
        const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
        if (!iotHubConnectionString) {
            return;
        }

        try {
            const interfaceJson = (await axios.get(`https://${Utility.getHostName(iotHubConnectionString)}/digitalTwins/${deviceId}/interfaces/${interfaceName}?api-version=2019-07-01-preview`, {
                headers: {
                    Authorization: Utility.generateSasTokenForService(iotHubConnectionString),
                }
            })).data;
            Utility.writeJson(Constants.InterfaceJosnFilePath, interfaceJson);
            const document = await vscode.workspace.openTextDocument(Constants.InterfaceJosnFilePath);
            if (document.isDirty) {
                throw new Error(`Your ${Constants.InterfaceJosnFileName} has unsaved changes. Please close or save the file. Then try again.`);
            }
            vscode.window.showTextDocument(document);
            TelemetryClient.sendEvent(Constants.IoTHubAIGetInterfaceDoneEvent, { Result: "Success" });
        } catch (error) {
            this._outputChannel.show();
            this.outputLine(Constants.IoTHubModuleTwinLabel, `Failed to get Interface: ${error}`);
            TelemetryClient.sendEvent(Constants.IoTHubAIGetInterfaceDoneEvent, { Result: "Fail", Message: error });
        }
    }
}
