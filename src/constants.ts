"user strict";

export class Constants {
    public static IoTHub = "IoT Hub";
    public static EventHub = "Event Hub";

    public static DeviceConnectionStringKey = "deviceConnectionString";
    public static DeviceConnectionStringTitle = "Device Connection String";
    public static IotHubConnectionStringKey = "iotHubConnectionString";
    public static IotHubConnectionStringTitle = "Iot Hub Connection String";
    public static IoTHubConsumerGroup = "iotHubConsumerGroup";

    public static EventHubConnectionstringKey = "eventHubConnectionString";
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

    public static IoTHubAIStartMonitorEvent = "D2C.startMonitoring";
    public static IoTHubAIStopMonitorEvent = "D2C.stopMonitoring";
    public static IoTHubAIMessageEvent = "D2C.Send";
    public static IoTHubAIStartMonitorC2DEvent = "C2D.startMonitoring";
    public static IoTHubAIStopMonitorC2DEvent = "C2D.stopMonitoring";
    public static IoTHubAIC2DMessageEvent = "C2D.Send";

    public static EventHubAIStartMonitorEvent = "EventHub.startMonitoring";
    public static EventHubAIStopMonitorEvent = "EventHub.stopMonitoring";
    public static EventHubAIMessageEvent = "EventHub.Send";
}
