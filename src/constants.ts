// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"user strict";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

export class Constants {
    public static ExtensionId = "vsciot-vscode.azure-iot-toolkit";
    public static CampaignID = "vsciottoolkit";

    public static IoTHub = "IoT Hub";
    public static IsWelcomePageShown = "IsWelcomePageShown";

    public static DeviceConnectionStringKey = "deviceConnectionString";
    public static IotHubConnectionStringKey = "iotHubConnectionString";
    public static IotHubConnectionStringTitle = "IoT Hub Connection String";
    public static IoTHubConsumerGroup = "iotHubConsumerGroup";
    public static IoTHubD2CMessageStringifyKey = "iotHubD2CMessageStringify";
    public static IoTHubMonitorLabel = "IoTHubMonitor";
    public static IoTHubMessageLabel = "D2CMessage";
    public static IoTHubC2DMessageLabel = "C2DMessage";
    public static IoTHubC2DMessageMonitorLabel = "C2DMessageMonitor";

    public static IoTHubDirectMethodLabel = "DirectMethod";
    public static IoTHubDeviceTwinLabel = "DeviceTwin";
    public static IoTHubModuleTwinLabel = "ModuleTwin";

    public static IoTHubAILoadDeviceTreeEvent = "AZ.LoadDeviceTree";
    public static IoTHubAIStartMonitorEvent = "AZ.D2C.startMonitoring";
    public static IoTHubAIStopMonitorEvent = "AZ.D2C.stopMonitoring";
    public static IoTHubAIMessageStartEvent = "AZ.D2C.Send.Start";
    public static IoTHubAIMessageDoneEvent = "AZ.D2C.Send.Done";
    public static IoTHubAIStartMonitorC2DEvent = "AZ.C2D.startMonitoring";
    public static IoTHubAIStopMonitorC2DEvent = "AZ.C2D.stopMonitoring";
    public static IoTHubAIC2DMessageStartEvent = "AZ.C2D.Send.Start";
    public static IoTHubAIC2DMessageDoneEvent = "AZ.C2D.Send.Done";
    public static IoTHubAIInvokeDeviceMethodEvent = "AZ.DeviceMethod.Invoke";
    public static IoTHubAIGetDeviceTwinStartEvent = "AZ.DeviceTwin.Get.Start";
    public static IoTHubAIGetDeviceTwinDoneEvent = "AZ.DeviceTwin.Get.Done";
    public static IoTHubAIUpdateDeviceTwinEvent = "AZ.DeviceTwin.Update";
    public static DeviceTwinJosnFileName = "azure-iot-device-twin.json";
    public static DeviceTwinJosnFilePath: string;
    public static IoTHubAIEdgeDeployStartEvent = "Edge.Deploy.Start";
    public static IoTHubAIEdgeDeployDoneEvent = "AZ.Edge.Deploy.Done";
    public static IoTHubAIEdgeDeployAtScaleStartEvent = "Edge.DeployAtScale.Start";
    public static IoTHubAIEdgeDeployAtScaleDoneEvent = "AZ.Edge.DeployAtScale.Done";
    public static IoTHubAICreateStartEvent = "General.IoTHub.Create.Start";
    public static IoTHubAICreateDoneEvent = "AZ.IoTHub.Create.Done";
    public static IoTHubAIGetModuleTwinStartEvent = "AZ.Edge.ModuleTwin.Get.Start";
    public static IoTHubAIGetModuleTwinDoneEvent = "AZ.Edge.ModuleTwin.Get.Done";
    public static IoTHubAIUpdateModuleTwinStartEvent = "AZ.Edge.ModuleTwin.Update.Start";
    public static IoTHubAIUpdateModuleTwinDoneEvent = "AZ.Edge.ModuleTwin.Update.Done";
    public static ModuleTwinJosnFileName = "azure-iot-module-twin.json";
    public static ModuleTwinJosnFilePath: string;
    public static IoTHubAILoadModuleTreeStartEvent = "AZ.Edge.LoadModuleTree.Start";
    public static IoTHubAILoadModuleTreeDoneEvent = "AZ.Edge.LoadModuleTree.Done";

    public static IoTHubAIStartLoadDeviceTreeEvent = "General.StartLoadDeviceTree";
    public static IoTHubAIShowWelcomePagetEvent = "General.WelcomePage.Show";

    public static ConnectionStringFormat = {
        [Constants.IotHubConnectionStringKey]: "HostName=<my-hostname>;SharedAccessKeyName=<my-policy>;SharedAccessKey=<my-policy-key>",
        [Constants.DeviceConnectionStringKey]: "HostName=<my-hostname>;DeviceId=<known-device-id>;SharedAccessKey=<known-device-key>",
    };

    public static ConnectionStringRegex = {
        [Constants.IotHubConnectionStringKey]: /^HostName=.+;SharedAccessKeyName=.+;SharedAccessKey=.+$/,
        [Constants.DeviceConnectionStringKey]: /^HostName=.+;DeviceId=.+;SharedAccessKey=.+$/,
    };

    public static ShowIoTHubInfoKey = "showIoTHubInfo";
    public static ShowConnectionStringInputBoxKey = "showConnectionStringInputBox";
    public static IoTHubApiVersion = "2017-11-08-preview";

    public static initialize(context: vscode.ExtensionContext) {
        const directory = context.storagePath ? context.storagePath : os.tmpdir();
        Constants.ModuleTwinJosnFilePath = path.join(directory, Constants.ModuleTwinJosnFileName);
        Constants.DeviceTwinJosnFilePath = path.join(directory, Constants.DeviceTwinJosnFileName);
    }

    private static a;
}
