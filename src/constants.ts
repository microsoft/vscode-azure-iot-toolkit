"user strict";

export class Constants {
    public static ExtensionId = "vsciot-vscode.azure-iot-toolkit";
    public static AIKey = "d8505d40-fc60-45f8-98b3-3bcd5c23843d";

    public static IoTHub = "IoT Hub";
    public static EventHub = "Event Hub";

    public static DeviceConnectionStringKey = "deviceConnectionString";
    public static DeviceConnectionStringTitle = "Device Connection String";
    public static IotHubConnectionStringKey = "iotHubConnectionString";
    public static IotHubConnectionStringTitle = "Iot Hub Connection String";
    public static IoTHubConsumerGroup = "iotHubConsumerGroup";
    public static IoTHubD2CMessageStringifyKey = "iotHubD2CMessageStringify";

    public static EventHubConnectionStringKey = "eventHubConnectionString";
    public static EventHubConnectionStringTitle = "Event Hub Connection String";
    public static EventHubPathKey = "eventHubPath";
    public static EventHubPathTitle = "Event Hub Path";
    public static EventHubConsumerGroup = "eventHubConsumerGroup";

    public static EventHubMonitorLabel = "EventHubMonitor";
    public static EventHubMessageLabel = "EventHubMessage";
    public static IoTHubMonitorLabel = "IoTHubMonitor";
    public static IoTHubMessageLabel = "D2CMessage";
    public static IoTHubC2DMessageLabel = "C2DMessage";
    public static IoTHubC2DMessageMonitorLabel = "C2DMessageMonitor";

    public static IoTHubDirectMethodLabel = "DirectMethod";
    public static IoTHubDeviceTwinLabel = "DeviceTwin";

    public static IoTHubAILoadDeviceTreeEvent = "AZ.LoadDeviceTree";
    public static IoTHubAIStartMonitorEvent = "AZ.D2C.startMonitoring";
    public static IoTHubAIStopMonitorEvent = "AZ.D2C.stopMonitoring";
    public static IoTHubAIMessageEvent = "AZ.D2C.Send";
    public static IoTHubAIStartMonitorC2DEvent = "AZ.C2D.startMonitoring";
    public static IoTHubAIStopMonitorC2DEvent = "AZ.C2D.stopMonitoring";
    public static IoTHubAIC2DMessageEvent = "AZ.C2D.Send";
    public static IoTHubAIInvokeDeviceMethodEvent = "AZ.DeviceMethod.Invoke";
    public static IoTHubAIGetDeviceTwinEvent = "AZ.DeviceTwin.Get";
    public static IoTHubAIUpdateDeviceTwinEvent = "AZ.DeviceTwin.Update";

    public static IoTHubAIStartLoadDeviceTreeEvent = "General.StartLoadDeviceTree";

    public static EventHubAIStartMonitorEvent = "EventHub.startMonitoring";
    public static EventHubAIStopMonitorEvent = "EventHub.stopMonitoring";
    public static EventHubAIMessageEvent = "EventHub.Send";

    public static MonitoringStoppedMessage = "Monitoring stopped.";
}
