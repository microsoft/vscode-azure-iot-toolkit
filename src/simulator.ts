"use strict";
import { Message } from "azure-iot-device";
import { clientFromConnectionString } from "azure-iot-device-mqtt";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { IoTHubMessageBaseExplorer } from "./iotHubMessageBaseExplorer";
import { DeviceItem } from "./Model/DeviceItem";
import { Utility } from "./utility";
import { MultiStepInput } from './multiStepInput';
import { QuickPickItem } from 'vscode';

interface State {
    title: string;
    step: number;
    totalSteps: number;
    inputDevice: DeviceItem;
    message: string;
    times: string;
}
const title = 'Send a D2C message repeatedly';

async function collectInputs() {
    const state = {} as Partial<State>;
    await MultiStepInput.run(input => pickInputDevice(input, state));
    return state as State;
}

async function pickInputDevice(input: MultiStepInput, state: Partial<State>) {
    const pick = await input.showQuickPick({
        title,
        step: 1,
        totalSteps: 3,
        placeholder: 'Pick a resource group',
        items: await Utility.getInputDeviceList(Constants.IoTHubAIMessageStartEvent),
        activeItem: typeof state.inputDevice !== 'string' ? state.inputDevice : undefined,
        shouldResume: shouldResume
    });
    state.inputDevice = pick instanceof DeviceItem ? pick : undefined;
    return (input: MultiStepInput) => inputMessage(input, state);
}

async function inputMessage(input: MultiStepInput, state: Partial<State>) {
    state.message = await input.showInputBox({
        title,
        step: 2,
        totalSteps: 3,
        value: typeof state.message === 'string' ? state.message : '',
        prompt: 'Enter the message you want to send.',
        validate: messageValidator,
        shouldResume: shouldResume
    });
    return (input: MultiStepInput) => inputTimes(input, state);
}

async function inputTimes(input: MultiStepInput, state: Partial<State>) {
    state.times = await input.showInputBox({
        title,
        step: 3,
        totalSteps: 3,
        value: typeof state.times === 'string' ? state.times : '',
        prompt: 'How many times do you want to repeat?',
        validate: timesValidator,
        shouldResume: shouldResume
    });
}

function shouldResume() {
    // Could show a notification with the option to resume.
    return new Promise<boolean>((resolve, reject) => {

    });
}

async function messageValidator(name: string) {
    // ...validate...
    return undefined;
}

async function timesValidator(name: string) {
    // ...validate...
    return undefined;
}

export class Simulator extends IoTHubMessageBaseExplorer {

    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel, "$(primitive-square) Stop Monitoring built-in event endpoint", "azure-iot-toolkit.stopMonitorIoTHubMessage");
    }

    public async sendD2CMessageRepeatedly(times: number, deviceItem?: DeviceItem) {
        const state = await collectInputs();
        deviceItem = state.inputDevice;
        const deviceConnectionString: string = deviceItem.connectionString;
        const message = state.message;
        times = Number(state.times);
        if (message !== undefined) {
            this._outputChannel.show();
            try {
                let i: number = 0;
                for (i = 0; i < times; i++) {
                    let client = clientFromConnectionString(deviceConnectionString);
                    let stringify = Utility.getConfig<boolean>(Constants.IoTHubD2CMessageStringifyKey);
                    client.sendEvent(new Message(stringify ? JSON.stringify(message) : message),
                        this.sendEventDone(client, Constants.IoTHubMessageLabel, Constants.IoTHub, Constants.IoTHubAIMessageDoneEvent));
                }
            } catch (e) {
                this.outputLine(Constants.IoTHubMessageLabel, e);
            }
        }
    }
}
