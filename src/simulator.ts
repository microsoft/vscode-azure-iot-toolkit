// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { ConnectionString } from "azure-iot-common";
import { Message } from "azure-iot-device";
import { Client } from "azure-iot-device";
import { clientFromConnectionString } from "azure-iot-device-mqtt";
import * as dummyjson from "dummy-json";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { IoTHubResourceExplorer } from "./iotHubResourceExplorer";
import { DeviceItem } from "./Model/DeviceItem";
import { SendStatus } from "./sendStatus";
import { SimulatorWebview } from "./simulatorwebview/simulatorwebview";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class Simulator {
  public static getInstance(context?: vscode.ExtensionContext) {
    if (!Simulator.instance) {
      if (!context) {
        vscode.window.showErrorMessage("Cannot create Simulator instance.");
      } else {
        Simulator.instance = new Simulator(context);
      }
    }
    return Simulator.instance;
  }

  private static instance: Simulator;
  private readonly context: vscode.ExtensionContext;
  private readonly outputChannel: vscode.OutputChannel;
  private processing: boolean;
  private cancelToken: boolean;
  private totalStatus: SendStatus;
  private closeDuration: number;
  private persistedInputs: {
    hostName: string;
    deviceConnectionStrings: string[];
    numbers: string;
    interval: string;
    intervalUnit: string;
    messageBody: string;
    plainTextArea: string;
    dummyJsonArea: string;
  };

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.outputChannel = vscode.window.createOutputChannel(
      Constants.SimulatorOutputChannelTitle
    );
    this.processing = false;
    this.cancelToken = false;
    this.closeDuration = 0;
    this.persistedInputs = {
      hostName: "",
      deviceConnectionStrings: [],
      numbers: "",
      interval: "",
      intervalUnit: "",
      messageBody: "",
      plainTextArea: "",
      dummyJsonArea: ""
    };
  }

  public async selectIoTHub() {
    const _IoTHubResourceExplorer = new IoTHubResourceExplorer(
      this.outputChannel
    );
    await _IoTHubResourceExplorer.selectIoTHub();
  }

  public async getInputDeviceList(): Promise<DeviceItem[]> {
    const iotHubConnectionString = await Utility.getConnectionString(
      Constants.IotHubConnectionStringKey,
      Constants.IotHubConnectionStringTitle,
      false
    );
    return await Utility.getFilteredDeviceList(iotHubConnectionString, false);
  }

  public isProcessing(): boolean {
    return this.processing || this.closeDuration > 0;
  }

  public cancel() {
    this.cancelToken = true;
  }

  public async launch(deviceItem: DeviceItem): Promise<void> {
    let deviceConnectionStrings = [];
    if (this.isProcessing()) {
      this.closeDuration = 3500;
      // vscode.window.showInformationMessage(
      //     "A previous simulation is in progress, please wait or cancel it.",
      // );
      await this.showWebview(false);
      await this.delay(this.closeDuration);
      this.closeDuration = 0;
    } else {
      let iotHubConnectionString = await Utility.getConnectionString(
        Constants.IotHubConnectionStringKey,
        Constants.IotHubConnectionStringTitle,
        false
      );
      if (deviceItem) {
        const hostName = ConnectionString.parse(iotHubConnectionString)
          .HostName;
        const hostNamePersisted = this.persistedInputs.hostName;
        deviceConnectionStrings.push(deviceItem.connectionString);
        const deviceConnectionStringsPersisted = this.persistedInputs
          .deviceConnectionStrings;
        await this.showWebview(
          hostName !== hostNamePersisted ||
            deviceConnectionStrings !== deviceConnectionStringsPersisted,
          hostName,
          deviceConnectionStrings
        );
      } else {
        if (!iotHubConnectionString) {
          await Simulator.getInstance().selectIoTHub();
        }
        if (!iotHubConnectionString) {
          return;
        }
        const hostName = ConnectionString.parse(iotHubConnectionString)
          .HostName;
        const hostNamePersisted = this.persistedInputs.hostName;
        const deviceConnectionStringsPersisted = this.persistedInputs
          .deviceConnectionStrings;
        await this.showWebview(
          hostName !== hostNamePersisted ||
            deviceConnectionStringsPersisted.length != 0,
          hostName,
          deviceConnectionStrings
        );
      }
    }
  }

  public async sendD2CMessage(
    deviceConnectionStrings: string[],
    template: string,
    isTemplate: boolean,
    numbers: number,
    interval: number
  ) {
    if (!this.processing) {
      this.processing = true;
      this.outputChannel.show();
      await this.sendD2CMessageFromMultipleDevicesRepeatedly(
        deviceConnectionStrings,
        template,
        isTemplate,
        numbers,
        interval
      );
      this.processing = false;
      // The cancel token can only be re-initialized out of any send() or delay() functions.
      this.cancelToken = false;
    } else {
      vscode.window.showErrorMessage(
        "A previous simulation is in progress, please wait or cancel it."
      );
    }
  }

  public getStatus(): SendStatus {
    return this.totalStatus;
  }

  public persistInputs(persistedInputs) {
    this.persistedInputs = persistedInputs;
  }

  public getPersistedInputs() {
    return this.persistedInputs;
  }

  private setPreSelectedHostName(hostName: string) {
    this.persistedInputs.hostName = hostName;
  }

  private setPreSelectedDeviceConnectionStrings(
    deviceConnectionStrings: string[]
  ) {
    this.persistedInputs.deviceConnectionStrings = deviceConnectionStrings;
  }

  private async showWebview(
    forceReload: boolean,
    hostName?: string,
    deviceConnectionStrings?: string[]
  ): Promise<void> {
    const simulatorwebview = SimulatorWebview.getInstance(this.context);
    if (hostName) {
      await this.setPreSelectedHostName(hostName);
    }
    if (deviceConnectionStrings) {
      await this.setPreSelectedDeviceConnectionStrings(deviceConnectionStrings);
    }
    await simulatorwebview.showWebview(forceReload);
    return;
  }

  private output(message: string) {
    this.outputChannel.appendLine(
      `[${new Date().toLocaleTimeString("en-US")}] ${message}`
    );
  }

  private sendEventDoneCallback(
    client,
    aiEventName: string,
    status: SendStatus,
    totalStatus: SendStatus
  ) {
    return async (err, result) => {
      const total = await status.getTotal();
      if (err) {
        await status.addFailed();
        await totalStatus.addFailed();
      }
      if (result) {
        await status.addSucceed();
        await totalStatus.addSucceed();
      }
      const sum = await status.sum();
      if (sum === total) {
        client.close(() => {
          return;
        });
      }
    };
  }

  private async sendD2CMessageCore(
    client: Client,
    message: string,
    status: SendStatus,
    totalStatus: SendStatus
  ) {
    let stringify = Utility.getConfig<boolean>(
      Constants.IoTHubD2CMessageStringifyKey
    );
    await client.sendEvent(
      new Message(stringify ? JSON.stringify(message) : message),
      this.sendEventDoneCallback(
        client,
        Constants.IoTHubAIMessageDoneEvent,
        status,
        totalStatus
      )
    );
  }

  private async delay(milliSecond: number) {
    return new Promise(resolve => setTimeout(resolve, milliSecond));
  }

  private async cancellableDelay(milliSecond: number) {
    while (milliSecond > 1000) {
      await this.delay(1000);
      if (this.cancelToken) {
        return;
      } else {
        milliSecond -= 1000;
      }
    }
    if (milliSecond > 0) {
      await this.delay(milliSecond);
    }
  }

  private async sendD2CMessageFromMultipleDevicesRepeatedly(
    deviceConnectionStrings: string[],
    template: string,
    isTemplate: boolean,
    numbers: number,
    interval: number
  ) {
    const deviceCount = deviceConnectionStrings.length;
    const total = deviceCount * numbers;
    if (total <= 0) {
      this.output(`Invalid Operation.`);
      return Promise.reject();
    }
    const startTime = new Date();
    this.output(
      `Start sending messages from ${deviceCount} device(s) to IoT Hub.`
    );
    let clients = [];
    let statuses = [];
    let ids = [];
    this.totalStatus = new SendStatus("Total", total);
    for (let i = 0; i < deviceCount; i++) {
      clients.push(
        await clientFromConnectionString(deviceConnectionStrings[i])
      );
      statuses.push(
        new SendStatus(
          ConnectionString.parse(deviceConnectionStrings[i]).DeviceId,
          numbers
        )
      );
      ids.push(i);
    }
    for (let i = 0; i < numbers; i++) {
      // No await here, beacause the interval should begin as soon as it called send(), not after it sent.
      ids.map(j => {
        // We use a template so that each time the message can be randomly generated.
        const generatedMessage = isTemplate
          ? dummyjson.parse(template)
          : template;
        this.sendD2CMessageCore(
          clients[j],
          generatedMessage,
          statuses[j],
          this.totalStatus
        );
      });
      this.totalStatus.addSent(deviceCount);
      if (this.cancelToken) {
        break;
      }
      if (i < numbers - 1) {
        // There won"t be a delay after the last iteration.
        await this.cancellableDelay(interval);
      }
    }
    const endTime = new Date();
    this.output(
      this.cancelToken ? `User aborted.` : `All device(s) finished sending in ${(endTime.getTime() - startTime.getTime()) /
      1000} second(s).`
    );
    while (
      !this.cancelToken &&
      await this.totalStatus.sum() !== await this.totalStatus.getTotal()
    ) {
      await this.delay(500);
    }
    this.output(
      `${await this.totalStatus.getSucceed()} succeeded, and ${await this.totalStatus.getFailed()} failed.`
    );
  }
}
