# Azure IoT Toolkit

Toolkit makes Azure IoT Development easier. For more awesome Azure IoT projects and resources, please visit https://aka.ms/azure.iot

## Features

[x] Device Explorer

[x] Send messages to Azure IoT Hub (device-to-cloud message)

[x] Monitor device-to-cloud messages

[x] Code snippet for IoT Hub

[x] Send/monitor messages from Azure IoT Hub to device (cloud-to-device message)

[x] Device management (List, Create, Delete)

[x] Invoke Direct Method

[x] Get/update Device Twin


## Device Explorer

* Device management
    * List devices
    * Get device info
    * Create device
    * Delete device
* Interact with Azure IoT Hub
    * Send D2C message to IoT Hub
    * Monitor IoT Hub D2C message
    * Send C2D message to device
    * Monitor C2D message from IoT Hub
    * Invoke Direct Method
    * Get/update Device Twin

### Prerequisites

1. In Explorer of VS Code, click "IoT Hub Devices" in the bottom left corner.

![Click Device Explorer](images/device-explorer-click.png)

2. If you have not set Iot Hub Connection String before, an input box will pop up, then enter your Iot Hub Connection String (It is one-time configuration).

![Enter Connection String](images/enter-connection-string.png)

3. The device list will be shown.

![Device Explorer](images/device-explorer.png)

## Commands

| Command | Keyboard Shortcuts | Menu Contexts |
| --- | --- | --- |
| IoT: Send message to IoT Hub | Ctrl+Alt+F9 | view/item/context |
| IoT: Start monitoring IoT Hub message | Ctrl+Alt+F10 | view/title |
| IoT: Stop monitoring IoT Hub message | Ctrl+Alt+F11 | editor/context (in output panel) |
| IoT: Send C2D message to device | None | view/item/context |
| IoT: Start monitoring C2D message | None | view/item/context |
| IoT: Stop monitoring C2D message | None | editor/context (in output panel) |
| IoT: List device | Ctrl+Alt+F1 | None |
| IoT: Create device | Ctrl+Alt+F2 | view/title |
| IoT: Delete device | Ctrl+Alt+F3 | view/item/context |

## Usages

* Code Snippets

| Trigger | Content |
| ---- | ---- |
| iotSendD2CMessage | Send D2C message to IoT Hub |
| iotMonitorD2CMessage | Monitor D2C message for IoT Hub |
| iotSendC2DMessage | Send C2D message to device |
| iotMonitorC2DMessage | Monitor C2D message from IoT Hub |
| iotCallDirectMethods | Send direct methods to device |
| iotReceiveDirectMethods | Receive direct methods from IoT Hub |

![Snippet](images/snippet.gif)

> After code snippet is created, you need to install corresponding npm package (e.g. [azure-iot-device-mqtt](https://www.npmjs.com/package/azure-iot-device-mqtt)) to run the code snippet.
> If you want to 'Run Code' directly, you need to install [Code Runner](https://marketplace.visualstudio.com/items?itemName=formulahendry.code-runner).

## Configuration

To set the Device Connection String which is used to send device-to-cloud message or other functions as a device simulator:
```json
{
    "azure-iot-toolkit.deviceConnectionString": "HostName=<my-hub>.azure-devices.net;DeviceId=<known-device-id>;SharedAccessKey=<known-device-key>"
}
```

To set the IoT Hub Connection String to monitor device-to-cloud message or other functions as a service simulator:
```json
{
    "azure-iot-toolkit.iotHubConnectionString": "HostName=<my-hub>.azure-devices.net;SharedAccessKeyName=<my-policy>;SharedAccessKey=<my-policy-key>"
}
```

To set the IoT Hub Consumer Group (default is "$Default"):
```json
{
    "azure-iot-toolkit.iotHubConsumerGroup": "$Default"
}
```

To set whether to show verbose info when monitoring messages (default is `true`):
```json
{
    "azure-iot-toolkit.showVerboseMessage": true
}
```

To set whether to stringify device-to-cloud messages (default is `true`):
```json
{ 
    "azure-iot-toolkit.iotHubD2CMessageStringify": true
}
```

## Telemetry data
By default, anonymous telemetry data collection is turned on to understand user behavior to improve this extension. To disable it, update the settings.json as below:
```json
{
    "azure-iot-toolkit.enableAppInsights": false
}
```

## Change Log
See Change Log [here](CHANGELOG.md)

## Issues
Submit the [issues](https://github.com/Microsoft/vscode-azure-iot-toolkit/issues) if you find any bug or have any suggestion.

## Contribution
Fork the [repo](https://github.com/Microsoft/vscode-azure-iot-toolkit) and submit pull requests.