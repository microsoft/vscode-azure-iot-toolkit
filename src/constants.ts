// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"user strict";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

enum TemplateLanguage {
    CSharp = "C#",
    Go = "Go",
    HTTP = "HTTP",
    Java = "Java",
    Node = "Node.js",
    PHP = "PHP",
    Python = "Python",
    Ruby = "Ruby",
}

enum TemplateType {
    SendD2C = "Send device-to-cloud message",
    MonitorD2C = "Monitor device-to-cloud message",
}

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
    public static IoTHubAIGetModuleTwinStartEvent = "AZ.ModuleTwin.Get.Start";
    public static IoTHubAIGetModuleTwinDoneEvent = "AZ.ModuleTwin.Get.Done";
    public static IoTHubAIUpdateModuleTwinStartEvent = "AZ.ModuleTwin.Update.Start";
    public static IoTHubAIUpdateModuleTwinDoneEvent = "AZ.ModuleTwin.Update.Done";
    public static ModuleTwinJosnFileName = "azure-iot-module-twin.json";
    public static ModuleTwinJosnFilePath: string;
    public static IoTHubAILoadModuleTreeStartEvent = "AZ.LoadModuleTree.Start";
    public static IoTHubAILoadModuleTreeDoneEvent = "AZ.LoadModuleTree.Done";
    public static IoTHubAILoadEdgeModuleTreeStartEvent = "AZ.Edge.LoadModuleTree.Start";
    public static IoTHubAILoadEdgeModuleTreeDoneEvent = "AZ.Edge.LoadModuleTree.Done";
    public static IoTHubAICreateModuleStartEvent = "AZ.Module.Create.Start";
    public static IoTHubAICreateModuleDoneEvent = "AZ.Module.Create.Done";
    public static IoTHubAIDeleteModuleStartEvent = "AZ.Module.Delete.Start";
    public static IoTHubAIDeleteModuleDoneEvent = "AZ.Module.Delete.Done";

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
    public static IoTHubApiVersion = "2018-06-30";

    public static CodeTemplates = {
        [TemplateLanguage.CSharp]: {
            [TemplateType.SendD2C]: "csharp/sendD2C",
        },
        [TemplateLanguage.Go]: {
            [TemplateType.SendD2C]: "go/sendD2C.go",
        },
        [TemplateLanguage.HTTP]: {
            [TemplateType.SendD2C]: "http/sendD2C.http",
        },
        [TemplateLanguage.Java]: {
            [TemplateType.SendD2C]: "java/sendD2C",
        },
        [TemplateLanguage.Node]: {
            [TemplateType.SendD2C]: "node/sendD2C.js",
            [TemplateType.MonitorD2C]: "node/monitorD2C.js",
        },
        [TemplateLanguage.PHP]: {
            [TemplateType.SendD2C]: "php/sendD2C.php",
        },
        [TemplateLanguage.Python]: {
            [TemplateType.SendD2C]: "python/sendD2C.py",
        },
        [TemplateLanguage.Ruby]: {
            [TemplateType.SendD2C]: "ruby/sendD2C.rb",
        },
    };

    public static LanguageIds = {
        [TemplateLanguage.Go]: "go",
        [TemplateLanguage.HTTP]: "http",
        [TemplateLanguage.Node]: "javascript",
        [TemplateLanguage.PHP]: "php",
        [TemplateLanguage.Python]: "python",
        [TemplateLanguage.Ruby]: "ruby",
    };

    public static initialize(context: vscode.ExtensionContext) {
        const directory = context.storagePath ? context.storagePath : os.tmpdir();
        Constants.ModuleTwinJosnFilePath = path.join(directory, Constants.ModuleTwinJosnFileName);
        Constants.DeviceTwinJosnFilePath = path.join(directory, Constants.DeviceTwinJosnFileName);
    }
}
