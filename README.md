# Code Runner

Toolkit makes Azure IoT Development easier

## Features

[*] Send messages to Azure IoT Hub (device-to-cloud message)

[*] Monitor device-to-cloud messages

[ ] Send messages from Azure IoT Hub to device (cloud-to-device message)

[ ] Device management (List, Create, Update, Delete)

[ ] And more...

## Commands

| Command | Keyboard Shortcuts | Menu Contexts |
| -- | -- | -- |
| Send message to IoT Hub | Ctrl+Alt+F9 | editor/context |
| Start monitoring | Ctrl+Alt+F10 | editor/context |
| Stop monitoring | Ctrl+Alt+F11 | editor/context |

## Usages

* Send messages to Azure IoT Hub

![Usage](images/send.gif)

* Monitor device-to-cloud messages

![Usage](images/monitor.gif)

## Configuration

To set the Device Connection String which is used to send device-to-cloud message:
```json
{
    "azure-iot-explorer.deviceConnectionString": "HostName=<my-hub>.azure-devices.net;DeviceId=<known-device-id>;SharedAccessKey=<known-device-key>"
}
```

To set the IoT Hub Connection String to monitor device-to-cloud message:
```json
{
    "azure-iot-explorer.iotHubConnectionString": "HostName=<my-hub>.azure-devices.net;SharedAccessKeyName=<my-policy>;SharedAccessKey=<my-policy-key>"
}
```

To set the IoT Hub Consumer Group (default is "$Default"):
```json
{
    "azure-iot-explorer.consumerGroup": "$Default"
}
```

## Telemetry data
By default, anonymous telemetry data collection is turned on to understand user behavior to improve this extension. To disable it, update the settings.json as below:
```json
{
    "azure-iot-explorer.enableAppInsights": false
}
```

## Change Log
### 0.0.1
* Send messages to Azure IoT Hub
* Monitor device-to-cloud messages

## Issues
Submit the [issues](https://github.com/formulahendry/vscode-azure-iot-toolkit/issues) if you find any bug or have any suggestion.

## Contribution
Fork the [repo](https://github.com/formulahendry/vscode-azure-iot-toolkit) and submit pull requests.