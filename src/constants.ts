"user strict";

export class Constants {
    public static ExtensionId = "vsciot-vscode.azure-iot-toolkit";
    public static AIKey = "d8505d40-fc60-45f8-98b3-3bcd5c23843d";
    public static CampaignID = "vsciottoolkit";

    public static IoTHub = "IoT Hub";

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
    public static IoTHubAIEdgeDeployStartEvent = "Edge.Deploy.Start";
    public static IoTHubAIEdgeDeployDoneEvent = "AZ.Edge.Deploy.Done";
    public static IoTHubAICreateStartEvent = "General.IoTHub.Create.Start";
    public static IoTHubAICreateDoneEvent = "AZ.IoTHub.Create.Done";

    public static IoTHubAIStartLoadDeviceTreeEvent = "General.StartLoadDeviceTree";

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
}
