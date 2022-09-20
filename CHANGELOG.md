## 2.17.1 (2022-09-20)
### Changed
* Updated dependencies / package vulnerabilities.

## 2.17.0 (2022-05-24)
### Changed
* Version bump for non-preview release.

## 2.16.7 (2022-04-21)
### Changed
* Changed D2C messages to always declare message content-type as `application/json` and encoding as `utf-8`
* Updated package vulnerabilities

## 2.16.6 (2021-01-26)
### Changed
* Updated package vulnerabilities
* Migrated testing framework from `vscode` -> `vscode-test`

## 2.16.5 (2021-01-26)
### Changed
* Updated package vulnerabilities

## 2.16.4 (2020-09-04)
### Fixed
* Regression in handling of connecting to underlying Event Hub

## 2.16.3 (2020-08-31)
### Fixed
* Handling of JSON formatted D2C messages by adding contentType and contentEncoding (issue [440](https://github.com/microsoft/vscode-azure-iot-toolkit/issues/440))

### Changed
* Multiple NPM package updates for connecting to Azure resources.
* Multiple NPM package updates to resolve vulnerabilities

### Removed
* Plug and Play interfaces node from device tree view

## 2.16.2 (2020-06-03)
### Added
* Support monitoring Event Hub messages in different regions

### Changed
* Adopt VS Code's 'asWebviewUri' API

## 2.16.1 (2020-04-13)
### Changed
* Update third party notice

## 2.16.0 (2020-02-14)
### Changed
* Fix Handlebars vulnerability CVE-2019-19919 (npm [advisory](https://www.npmjs.com/advisories/1164))

## 2.15.0 (2019-12-30)
### Added
* Display Azure IoT Hub name in Azure IoT Hub tree view

### Changed
* Rename from 'Azure IoT Hub Toolkit' to 'Azure IoT Hub'

## 2.14.0 (2019-12-16)
### Added
* Add deployment ID in output channel when deploying at scale for Azure IoT Edge

## 2.13.0 (2019-11-12)
### Changed
* Rename 'Monitoring C2D' to 'Receiving C2D'

## 2.12.0 (2019-10-28)
### Added
* List IoT Hub Device Provisioning Service instances
* Add C# code generation for device twin (Thanks [@tomaszbartoszewski](https://github.com/tomaszbartoszewski)!)

### Fixed
* [#393](https://github.com/microsoft/vscode-azure-iot-toolkit/issues/393): Error during initialize

## 2.11.0 (2019-10-14)
### Added
* List PnP Interfaces in tree view

### Changed
* Brand new 'Send D2C Messages' experience
* Use tooltip to show connection state
* Show running status even when module is disconnected

## 2.10.0 (2019-08-06)
### Fixed
* Fix typo

## 2.9.0 (2019-07-19)
### Added
* Update infrastructure to support localization (Thanks [@matsujirushi](https://github.com/matsujirushi)!)
* Localization for Japanese language (Thanks [@matsujirushi](https://github.com/matsujirushi)!)
* Expose API to read IoT Hub connection string

### Changed
* Use OS credential store to store IoT Hub connection string (To be more secure, we will no longer use `azure-iot-toolkit.iotHubConnectionString` in settings.json to store IoT Hub connection string)

## 2.8.0 (2019-06-26)
### Changed
* Update json schema version to 2.0 for deployment validation

### Fixed
* [#332](https://github.com/microsoft/vscode-azure-iot-toolkit/pull/332): Bump axios from 0.18.0 to 0.18.1
* [#334](https://github.com/microsoft/vscode-azure-iot-toolkit/pull/334): The menu/icon of new Edge Device is sometimes not right

## 2.7.0 (2019-05-16)
### Added
* Endpoints tree view
* Monitor custom Event Hub endpoint

### Changed
* Rename 'Start Monitoring D2C Message' to 'Start Monitoring Built-in Event Endpoint'

## 2.6.0 (2019-04-23)
### Added
* Show properties when monitoring C2D message

### Changed
* Upgrade @azure/event-hubs npm to 2.0.0

### Fixed
* Fix context menu issue for deployment JSON file
* [#303](https://github.com/Microsoft/vscode-azure-iot-toolkit/issues/303): 'Create Module' should not show in context menu of device node

## 2.5.1 (2019-04-04)
### Fixed
* [#293](https://github.com/Microsoft/vscode-azure-iot-toolkit/issues/293): Fix deployment JSON validation issue when create options is larger than 512 bytes

## 2.5.0 (2019-04-03)
### Added
* Add JSON schema check when creating IoT Edge deployment

### Changed
* Sort and group menu for device explorer

## 2.4.0 (2019-03-11)
### Added
* [Accessibility] Indicate device/module status in description of tree item
* Indicate monitoring D2C message is for built-in endpoint

### Changed
* Switch to VS Code built-in clipboard API to reduce extension size

### Fixed
* [#278](https://github.com/Microsoft/vscode-azure-iot-toolkit/issues/278): Double select device ID when creating IoT Edge deployment via context menu in treeview

## 2.3.0 (2019-02-19)
### Added
* Add support for [Azure IoT distributed tracing (preview)](https://aka.ms/iottracing)

### Changed
* Move 'Create Module' context menu into 'Modules' node

## 2.2.0 (2019-01-23)
### Added
* Add 'Stop' button for monitoring C2D message in Status Bar

## 2.1.0 (2019-01-03)
### Added
* Reorder and group context menu
* Add confirmation prompt when deleting resource
* Add 'Stop' button for monitoring D2C message in Status Bar
* Add Direct Method template for Node.js code generation

### Changed
* Use Webpack to improve extension performance ⚡

### Removed
* Remove 'Refresh' item from context menu

## 2.0.0 (2018-12-13)
### Added
* Resolve [#218](https://github.com/Microsoft/vscode-azure-iot-toolkit/issues/218): Add 'Stop Monitoring D2C Message' into context menu of explorer title

### Changed
* Brand new! Rename from 'Azure IoT Toolkit' to 'Azure IoT Hub Toolkit'

## 1.7.0 (2018-11-21)
### Added
* Support IoT Edge multiple platforms scenario
* Support Azure National Clouds
* Better hint user when they fail to set IoT Hub connection string
* Better hint user when loading device list failed
* Support passing JSON in payload for direct methods
* Add 'Refresh' into context menu of normal device
* Add 'Refresh' icon inline

### Changed
* Resolve [#189](https://github.com/Microsoft/vscode-azure-iot-toolkit/issues/189): Use Node SDK instead of REST API

## 1.6.0 (2018-11-02)
### Added
* Add device twin templates for Node.js code generation
* Add configuration to enable auto refresh and set refresh interval ([@tomaszbartoszewski](https://github.com/tomaszbartoszewski): [#184](https://github.com/Microsoft/vscode-azure-iot-toolkit/pull/184))
* Display friendly info when no subscriptions are available ([@tomaszbartoszewski](https://github.com/tomaszbartoszewski): [#174](https://github.com/Microsoft/vscode-azure-iot-toolkit/pull/174))
* Use sans-serif font for welcome page on Linux and macOS ([@tomaszbartoszewski](https://github.com/tomaszbartoszewski): [#176](https://github.com/Microsoft/vscode-azure-iot-toolkit/pull/176))

## 1.5.0 (2018-10-10)
### Added
* Get module info
* Copy module connection string
* Add F# code generation for device to cloud communication ([@tomaszbartoszewski](https://github.com/tomaszbartoszewski): [#172](https://github.com/Microsoft/vscode-azure-iot-toolkit/pull/172))

### Changed
* Valid that expiration time should be a number when generating SAS token ([@tomaszbartoszewski](https://github.com/tomaszbartoszewski): [#173](https://github.com/Microsoft/vscode-azure-iot-toolkit/pull/173))
* Keep input box open when entering D2C message ([@tomaszbartoszewski](https://github.com/tomaszbartoszewski): [#173](https://github.com/Microsoft/vscode-azure-iot-toolkit/pull/173))

## 1.4.0 (2018-09-19)
### Added
* Support Module direct method
* Show Module id when monitoring D2C message
* Let user input the priority for IoT Edge deployment
* Support passing subscriptionId and resourceGroupName to createIoTHub API
* Support passing subscriptionId to selectIoTHub API

## 1.3.0 (2018-08-28)
### Added
* Generate Code for C#, Go, Java, PHP or Ruby
* [Module Management](https://blogs.msdn.microsoft.com/iotdev/2018/09/19/azure-iot-toolkit-supports-iot-hub-module-management-module-twin-module-direct-method-module-crud/) (List, Create, Delete module)
* Add configuration to set start time for monitoring D2C message
* Support creating IoT Hub with basic tier

## 1.2.0 (2018-08-08)
### Added
* Generate Code for Node.js, Python or REST API
* Show Module Identities for IoT Edge device

### Fixed
* Allow `*` for target condition of IoT Edge device deployment

## 1.1.1 (2018-08-01)
### Changed
* Update vscode-extension-telemetry npm to latest version (0.0.18)

## 1.1.0 (2018-07-18)
### Added
* Generate SAS Token for IoT Hub
* Generate SAS Token for Device
* Create Deployment for IoT Edge Device at Scale
* Add welcome page
* Add [wiki page](https://github.com/Microsoft/vscode-azure-iot-toolkit/wiki)

### Fixed
* [#92](https://github.com/Microsoft/vscode-azure-iot-toolkit/issues/92): Invoke Direct Method will fail when device name contains’#’

## 1.0.0 (2018-06-27)
### Added
* Add CodeLens to update Device Twin and Module Twin
* Show warning message when user selects deployment.template.json to do deployment

### Removed
* Remove iotedgectl related commands which are retired in IoT Edge GA

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
