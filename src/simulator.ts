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

const DEVICE_IDENTITY_LOOKUP_BATCH_SIZE = 10;

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
    deviceIds: string[];
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
      deviceIds: [],
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

  public async getInputDeviceList(): Promise<{ deviceId: string; label: string }[]> {
    this.iotHubConnectionString = await Utility.getConnectionString(
      Constants.IotHubConnectionStringKey,
      Constants.IotHubConnectionStringTitle,
      false,
    );
    const devices = await Utility.getFilteredDeviceList(
      this.iotHubConnectionString,
      false,
    );
    return devices.map((device) => ({
      deviceId: device.deviceId,
      label: device.label,
    }));
  }

  public isProcessing(): boolean {
    return this.processing || this.closeDuration > 0;
  }

  public async cancel() {
    if (this.processing) {
      this.cancelToken = true;
    }
  }

  public async telemetry(eventName: string, result: boolean, properties?: { [key: string]: string | number; }) {
    if (eventName === Constants.SimulatorLaunchEvent) {
      await TelemetryClient.sendEvent(eventName, {
        Result: result ? "Success" : "Fail",
        [Constants.errorProperties.Message]: result ? undefined : String(properties.error),
        QuitWhenProcessing: this.isProcessing() ? "True" : "False",
      }, this.iotHubConnectionString);
    } else if (eventName === Constants.SimulatorSendEvent) {
      if (result) {
        await TelemetryClient.sendEvent(eventName, {
          Result: "Success",
          DeviceNumber: String(properties.devices),
          IterationsPerDevice: "" + properties.numbers,
          Interval: "" + properties.interval,
          MessageBodyType: "" + properties.messageBodyType,
        }, this.iotHubConnectionString);
      } else {
        await TelemetryClient.sendEvent(eventName, {
          Result: "Fail",
          [Constants.errorProperties.Message]: "" + properties.reason,
        }, this.iotHubConnectionString);
      }
    } else if (eventName === Constants.SimulatorCloseEvent) {
        await TelemetryClient.sendEvent(eventName, {
          Result: result ? "Success" : "Fail",
          IsReload: String(properties.reload),
          QuitWhenProcessing: this.isProcessing() ? "True" : "False",
        }, this.iotHubConnectionString);
    }
  }

  public async launch(deviceItem: DeviceItem): Promise<void> {
    const deviceIds = [];
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
        deviceIds.push(deviceItem.deviceId);
        const deviceIdsPersisted = this.persistedInputs.deviceIds;
        await this.showWebview(
          hostName !== hostNamePersisted ||
            deviceIds !== deviceIdsPersisted,
          hostName,
          deviceIds,
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
        const deviceIdsPersisted = this.persistedInputs.deviceIds;
        await this.showWebview(
          hostName !== hostNamePersisted ||
            deviceIdsPersisted.length !== 0,
          hostName,
          deviceIds,
        );
        this.telemetry(Constants.SimulatorLaunchEvent, true);
      }
      vscode.commands.executeCommand("azure-iot-toolkit.refresh");
    }
  }

  public async sendD2CMessage(
    deviceIds: string[],
    template: string,
    isTemplate: boolean,
    numbers: number,
    interval: number,
  ) {
    if (!this.processing) {
      this.processing = true;
      try {
        if (!Array.isArray(deviceIds) ||
          deviceIds.length === 0 ||
          !Number.isInteger(numbers) ||
          numbers <= 0 ||
          !Number.isFinite(interval) ||
          interval < 0) {
          this.output("Invalid Operation.");
          return;
        }
        const total = deviceIds.length * numbers;
        this.totalStatus = new SendStatus("Total", total);
        const deviceConnectionStrings: string[] = [];
        for (let i = 0; i < deviceIds.length; i += DEVICE_IDENTITY_LOOKUP_BATCH_SIZE) {
          const batch = await Promise.all(
            deviceIds.slice(i, i + DEVICE_IDENTITY_LOOKUP_BATCH_SIZE).map((deviceId) =>
              Utility.getDeviceConnectionString(
                this.iotHubConnectionString,
                deviceId,
              ),
            ),
          );
          deviceConnectionStrings.push(...batch);
          if (this.cancelToken) {
            break;
          }
        }
        if (this.cancelToken) {
          this.output("User aborted.");
          return;
        }
        await this.sendD2CMessageFromMultipleDevicesRepeatedly(
          deviceConnectionStrings,
          template,
          isTemplate,
          numbers,
          interval,
        );
      } catch (error) {
        this.output(`Failed to send messages: ${error.message}`);
        vscode.window.showErrorMessage(
          `Failed to send D2C messages: ${error.message}`,
        );
        throw error;
      } finally {
        this.processing = false;
        this.cancelToken = false;
      }
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

  private setPreSelectedDeviceIds(deviceIds: string[]) {
    this.persistedInputs.deviceIds = deviceIds;
  }

  private async showWebview(
    forceReload: boolean,
    hostName?: string,
    deviceIds?: string[],
  ): Promise<void> {
    const simulatorwebview = SimulatorWebview.getInstance(this.context);
    if (hostName) {
      await this.setPreSelectedHostName(hostName);
    }
    if (deviceIds) {
      await this.setPreSelectedDeviceIds(deviceIds);
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
    status: SendStatus,
    totalStatus: SendStatus,
  ) {
    return async (err) => {
      if (err) {
        await status.addFailed();
        await totalStatus.addFailed();
      } else {
        await status.addSucceed();
        await totalStatus.addSucceed();
      }
    };
  }

  private sendD2CMessageCore(
    client: Client,
    message: any,
    status: SendStatus,
    totalStatus: SendStatus,
  ) {
    const stringify = Utility.getConfig<boolean>(
      Constants.IoTHubD2CMessageStringifyKey,
    );
    const payload = stringify ? JSON.stringify(message) : message;
    const msg = new Message(payload);
    // default to utf-8 encoding
    msg.contentEncoding = "utf-8";
    // Routing endpoints parse the body according to this content type.
    if (Utility.isJsonString(payload)) {
      msg.contentType = "application/json";
    }

    client.sendEvent(
      msg,
      this.sendEventDoneCallback(
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
    if (deviceConnectionStrings.some((connectionString) =>
      !connectionString || !Utility.hasDeviceSharedAccessKey(connectionString))) {
      throw new Error(
        "D2C simulation requires a device with a symmetric key.",
      );
    }
    const startTime = new Date();
    this.output(
      `Start sending messages from ${deviceCount} device(s) to IoT Hub.`,
    );
    const clients: Client[] = [];
    const statuses: SendStatus[] = [];
    const ids: number[] = [];
    try {
      for (let i = 0; i < deviceCount; i++) {
        if (this.cancelToken) {
          break;
        }
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
        if (this.cancelToken) {
          break;
        }
        for (const j of ids) {
          const generatedMessage = isTemplate
            ? dummyjson.parse(template)
            : template;
          this.sendD2CMessageCore(
            clients[j],
            generatedMessage,
            statuses[j],
            this.totalStatus,
          );
        }
        await this.totalStatus.addSent(deviceCount);
        if (i < numbers - 1) {
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
    } finally {
      await Promise.all(clients.map((client) => client.close()));
    }
    this.output(
      `${await this.totalStatus.getSucceed()} succeeded, and ${await this.totalStatus.getFailed()} failed.`,
    );
  }
}
