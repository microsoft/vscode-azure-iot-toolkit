## 0.6.3 (2018-06-12)
### Added 
* Add command for updating Module Twin

## 0.6.2 (2018-05-23)
### Changed
* Update dependent npm to fix security vulnerability
* Fix [#89](https://github.com/Microsoft/vscode-azure-iot-toolkit/issues/89): Could not create device when device id contains '#'
* URI-encoding for device id in HTTP requests: Could not list Moudles, get Module Twin and create deployment for IoT Edge device when device id contains '#'

## 0.6.1 (2018-05-02)
### Changed
* Add 'Azure' to command category
* Improve wording to align with Azure IoT Edge extension
* Upgrade 'ms-rest' and 'ms-rest-azure' npm to resolve security issue in moment.js
* Fix [#83](https://github.com/Microsoft/vscode-azure-iot-toolkit/issues/83): Add retry logic for listing IoT Hub to work around showQuickPick issue

## 0.6.0 (2018-03-09)
### Added 
* Expose APIs for dependent extensions to use
    * Return IoT Hub Connection String in create/select IoT Hub APIs
    * Use Output Channel for showing output
    * Add iotHubConnectionString parameter in create/select device APIs
    * Add outputChannel parameter in create/select IoT Hub and create/select device APIs
* Show default command items ("Set IoT Hub Connection String", "Select IoT Hub")  in device tree when IoT Hub Connection String is not set
* Create Edge deployment via file

### Changed
* Always refresh device tree after creating IoT Hub
* Improve SKU naming
* Only list filtered subscriptions
* Sort commands in View title menu
* Not show Connection String Input Box on startup
* Rename explorer to 'Azure IoT Hub Devices'
* Move Edge code snippets to [Azure IoT Edge](https://marketplace.visualstudio.com/items?itemName=vsciot-vscode.azure-iot-edge) extension
* The "Generate Edge deployment manifest" command is replaced by [Azure IoT Edge](https://marketplace.visualstudio.com/items?itemName=vsciot-vscode.azure-iot-edge) extension's "Generate IoT Edge deployment manifest file" command

## 0.5.0 (2017-12-25)
* [Added] Create IoT Hub
* [Added] Create Edge device
* [Added] Show different icons for Edge devices
* [Added] Command to log in to container registry for Edge
* [Added] Code snippet for Edge module and route authoring
* [Added] List Edge Modules
* [Added] View Module Twin

## 0.4.3 (2017-12-06)
* [Added] Add Command Palette integration for several commands

## 0.4.2 (2017-11-15)
* [Fixed] Stop monitoring D2C message and show friendly message when there is error

## 0.4.1 (2017-11-14)
* [Fixed] Handle terminal closed
* [Fixed] Set eventHubClient as null when there is error

## 0.4.0 (2017-11-13)
* [Added] Add support for IoT Edge
* [Added] Monitor D2C message per device
* [Changed] Show application properties when monitoring D2C message
* [Changed] Show device id when monitoring D2C message
* [Changed] Sort devices by device id in device tree

## 0.3.0 (2017-10-17)
* [Added] Select IoT Hub with Azure login
* [Added] Copy connection string
* [Changed] Refresh device list right after device is created or deleted
* [Changed] Show error message in device tree explorer instead of pop-up when failing to list devices

## 0.2.3 (2017-09-25)
* Add option to hide Connection String Input Box and IoT Hub info

## 0.2.2 (2017-09-13)
* Show IoT Hub info when user does not enter connection string
* Handle the case when user enters an invalid connection string
* Context menu to set IoT Hub Connection String
* Improve wording for 'Monitoring stopped'

## 0.2.1 (2017-08-24)
* Add 'Azure' category
* Handle devices with X.509 cert

## 0.2.0 (2017-08-21)
* Migrate as official extension

## 0.1.4 (2017-08-09)
* Invoke Direct Method
* Get/update Device Twin
* Remove IoT Hub commands from editor context menu

## 0.1.3 (2017-06-28)
* Make stringifying D2C messages optional

## 0.1.2 (2017-06-23)
* Show different icon for connected devices

## 0.1.1 (2017-06-15)
* Add 'Send/monitor C2D message' into context menu of Device Explorer

## 0.1.0 (2017-06-09)
* Device Explorer
* Code snippet for Direct Methods

## 0.0.11 (2017-03-10)
* Send/monitor C2D message
* Code snippet for C2D message

## 0.0.10 (2017-03-06)
* JavaScript code snippet to send/monitor D2C message

## 0.0.9 (2017-02-28)
* Show verbose info when monitoring messages
* Output refinement for JSON object

## 0.0.8 (2017-02-27)
* Send messages to Azure Event Hub
* Monitor Event Hub messages

## 0.0.7
* Show detailed info when listing devices

## 0.0.6
* Deploy and run in remote machine

## 0.0.5
* Include device-discovery-cli into extension

## 0.0.4
* Add instruction if device-discovery-cli is not installed 

## 0.0.3
* Discover Ethernet, USB serial, WiFi devices

## 0.0.2
* Device management (List, Create, Delete)

## 0.0.1
* Send messages to Azure IoT Hub
* Monitor device-to-cloud messages