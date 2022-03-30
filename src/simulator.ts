// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { ConnectionString } from "azure-iot-common";
import { Message } from "azure-iot-device";
import { Client } from "azure-iot-device";
import { clientFromConnectionString } from "azure-iot-device-mqtt";
import * as vscode from "vscode";
import dummyjson from "dummy-json";
import { Constants } from "./constants";
import { IoTHubResourceExplorer } from "./iotHubResourceExplorer";
import { DeviceItem } from "./Model/DeviceItem";
import { DeviceNode } from "./Nodes/DeviceNode";
import { SendStatus } from "./sendStatus";
import { SimulatorWebview } from "./simulatorwebview/simulatorwebview";
import { TelemetryClient } from "./telemetryClient";
import { Utility } from "./utility";

export class Simulator {
  public static getInstance(context?: vscode.ExtensionContext) {
    if (!Simulator.instance) {
      if (!context) {
        vscode.window.showErrorMessage("Cannot initialize Send D2C Messages webview.");
      } else {
        Simulator.instance = new Simulator(context);
      }
    }
    return Simulator.instance;
  }

  private static instance: Simulator;
  private readonly context: vscode.ExtensionContext;
  private readonly outputChannel: vscode.OutputChannel;
  private iotHubConnectionString: string;
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
    messageBodyType: string;
    plainTextArea: string;
    dummyJsonArea: string;
    inputDeviceList: string[];
  };

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.outputChannel = vscode.window.createOutputChannel(
      Constants.SimulatorOutputChannelTitle,
    );
    this.processing = false;
    this.cancelToken = false;
    this.closeDuration = 0;
    this.iotHubConnectionString = undefined;
    this.persistedInputs = {
      hostName: "",
      deviceConnectionStrings: [],
      numbers: "",
      interval: "",
      intervalUnit: "",
      messageBodyType: "",
      plainTextArea: "",
      dummyJsonArea: "",
      inputDeviceList: [],
    };
  }

  public async selectIoTHub() {
    const _IoTHubResourceExplorer = new IoTHubResourceExplorer(
      this.outputChannel,
    );
    await _IoTHubResourceExplorer.selectIoTHub();
  }

  public async getInputDeviceList(): Promise<DeviceItem[]> {
    this.iotHubConnectionString = await Utility.getConnectionString(
      Constants.IotHubConnectionStringKey,
      Constants.IotHubConnectionStringTitle,
      false,
    );
    return await Utility.getFilteredDeviceList(this.iotHubConnectionString, false);
  }

  public isProcessing(): boolean {
    return this.processing || this.closeDuration > 0;
  }

  public async cancel() {
    this.cancelToken = true;
  }

  public async telemetry(eventName: string, result: boolean, properties?: { [key: string]: string; }) {
    if (eventName === Constants.SimulatorLaunchEvent) {
      TelemetryClient.sendEvent(eventName, {
        Result: result ? "Success" : "Fail",
        [Constants.errorProperties.Message]: result ? undefined : properties.error,
        QuitWhenProcessing: this.isProcessing() ? "True" : "False",
      }, this.iotHubConnectionString);
    } else if (eventName === Constants.SimulatorSendEvent) {
      if (result) {
        TelemetryClient.sendEvent(eventName, {
          Result: "Success",
          DeviceNumber: "" + properties.deviceConnectionStrings.length,
          IterationsPerDevice: "" + properties.numbers,
          Interval: "" + properties.interval,
          MessageBodyType: "" + properties.messageBodyType,
        }, this.iotHubConnectionString);
      } else {
        TelemetryClient.sendEvent(eventName, {
          Result: "Fail",
          [Constants.errorProperties.Message]: "" + properties.reason,
        }, this.iotHubConnectionString);
      }
    } else if (eventName === Constants.SimulatorCloseEvent) {
        TelemetryClient.sendEvent(eventName, {
          Result: result ? "Success" : "Fail",
          IsReload: properties.reload,
          QuitWhenProcessing: this.isProcessing() ? "True" : "False",
        }, this.iotHubConnectionString);
    }
  }

  public async launch(deviceItem: DeviceItem): Promise<void> {
    const deviceConnectionStrings = [];
    if (this.isProcessing()) {
      this.closeDuration = 3500;
      await this.showWebview(false);
      this.telemetry(Constants.SimulatorLaunchEvent, true);
      await this.delay(this.closeDuration);
      this.closeDuration = 0;
    } else {
      this.iotHubConnectionString = await Utility.getConnectionString(
        Constants.IotHubConnectionStringKey,
        Constants.IotHubConnectionStringTitle,
        true,
      );
      if (deviceItem) {
        const hostName = ConnectionString.parse(this.iotHubConnectionString)
          .HostName;
        const hostNamePersisted = this.persistedInputs.hostName;
        deviceConnectionStrings.push(deviceItem.connectionString);
        const deviceConnectionStringsPersisted = this.persistedInputs
          .deviceConnectionStrings;
        await this.showWebview(
          hostName !== hostNamePersisted ||
            deviceConnectionStrings !== deviceConnectionStringsPersisted,
          hostName,
          deviceConnectionStrings,
        );
        this.telemetry(Constants.SimulatorLaunchEvent, true);
      } else {
        // Exit when no connection string found or the connection string is invalid.
        if (!this.iotHubConnectionString) {
          const errorMessage = "Failed to launch Send D2C Messages webview: No IoT Hub Connection String Found.";
          vscode.window.showErrorMessage(errorMessage);
          this.telemetry(Constants.SimulatorLaunchEvent, false, {
            error: errorMessage,
          });
          return;
        }
        try {
          const deviceList: vscode.TreeItem[] = await Utility.getDeviceList(this.iotHubConnectionString, Constants.ExtensionContext);
          deviceList.map((item) => new DeviceNode(item as DeviceItem));
        } catch (err) {
          vscode.window.showErrorMessage("Failed to launch Send D2C Messages webview: " + err.message);
          this.telemetry(Constants.SimulatorLaunchEvent, false, {
            error: "Failed to launch Send D2C Messages webview: " + err.message,
          });
          return;
        }
        const hostName = ConnectionString.parse(this.iotHubConnectionString)
          .HostName;
        const hostNamePersisted = this.persistedInputs.hostName;
        const deviceConnectionStringsPersisted = this.persistedInputs
          .deviceConnectionStrings;
        await this.showWebview(
          hostName !== hostNamePersisted ||
            deviceConnectionStringsPersisted.length !== 0,
          hostName,
          deviceConnectionStrings,
        );
        this.telemetry(Constants.SimulatorLaunchEvent, true);
      }
      vscode.commands.executeCommand("azure-iot-toolkit.refresh");
    }
  }

  public async sendD2CMessage(
    deviceConnectionStrings: string[],
    template: string,
    isTemplate: boolean,
    numbers: number,
    interval: number,
  ) {
    if (!this.processing) {
      this.processing = true;
      await this.sendD2CMessageFromMultipleDevicesRepeatedly(
        deviceConnectionStrings,
        template,
        isTemplate,
        numbers,
        interval,
      );
      this.processing = false;
      // The cancel token can only be re-initialized out of any send() or delay() functions.
      this.cancelToken = false;
    } else {
      vscode.window.showErrorMessage(
        "A previous sending D2C messages operation is in progress, please wait or cancel it.",
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
    deviceConnectionStrings: string[],
  ) {
    this.persistedInputs.deviceConnectionStrings = deviceConnectionStrings;
  }

  private async showWebview(
    forceReload: boolean,
    hostName?: string,
    deviceConnectionStrings?: string[],
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
      `[${new Date().toLocaleTimeString("en-US")}] ${message}`,
    );
  }

  private sendEventDoneCallback(
    client,
    aiEventName: string,
    status: SendStatus,
    totalStatus: SendStatus,
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
    message: any,
    status: SendStatus,
    totalStatus: SendStatus,
  ) {
    const stringify = Utility.getConfig<boolean>(
      Constants.IoTHubD2CMessageStringifyKey,
    );
    const msg = new Message(stringify ? JSON.stringify(message) : message);
    // default to utf-8 encoding
    msg.contentEncoding = "utf-8";
    // msg.contentType must either be `undefined` or `application/json`
    msg.contentType = "application/json";

    await client.sendEvent(
      msg,
      this.sendEventDoneCallback(
        client,
        Constants.IoTHubAIMessageDoneEvent,
        status,
        totalStatus,
      ),
    );
  }

  private async delay(milliSecond: number) {
    return new Promise((resolve) => setTimeout(resolve, milliSecond));
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
    interval: number,
  ) {
    const deviceCount = deviceConnectionStrings.length;
    const total = deviceCount * numbers;
    if (total <= 0) {
      this.output(`Invalid Operation.`);
      return;
    }
    const startTime = new Date();
    this.output(
      `Start sending messages from ${deviceCount} device(s) to IoT Hub.`,
    );
    const clients = [];
    const statuses = [];
    const ids = [];
    this.totalStatus = new SendStatus("Total", total);
    for (let i = 0; i < deviceCount; i++) {
      clients.push(
        await clientFromConnectionString(deviceConnectionStrings[i]),
      );
      statuses.push(
        new SendStatus(
          ConnectionString.parse(deviceConnectionStrings[i]).DeviceId,
          numbers,
        ),
      );
      ids.push(i);
    }
    for (let i = 0; i < numbers; i++) {
      // No await here, beacause the interval should begin as soon as it called send(), not after it sent.
      ids.map((j) => {
        // We use a template so that each time the message can be randomly generated.
        const generatedMessage = isTemplate
        ? dummyjson.parse(template)
        : template;
        this.sendD2CMessageCore(
          clients[j],
          generatedMessage,
          statuses[j],
          this.totalStatus,
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
      1000} second(s).`,
    );
    while (
      !this.cancelToken &&
      await this.totalStatus.sum() !== await this.totalStatus.getTotal()
    ) {
      await this.delay(500);
    }
    this.output(
      `${await this.totalStatus.getSucceed()} succeeded, and ${await this.totalStatus.getFailed()} failed.`,
    );
  }
}
