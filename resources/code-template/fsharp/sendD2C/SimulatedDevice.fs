// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// This application uses the Azure IoT Hub device SDK for .NET
// For samples see: https://github.com/Microsoft/iot-samples/tree/master/DeviceManagement/fsharp

// Learn more about F# at http://fsharp.org

open System
open System.Text
open System.Threading.Tasks
open Newtonsoft.Json
open Microsoft.Azure.Devices.Client

// The device connection string to authenticate the device with your IoT hub.
let connectionString = "{{deviceConnectionString}}"

type message = {
    Temperature: double;
    Humidity: double
}

let serialize obj =
    JsonConvert.SerializeObject obj

let sendDeviceToCloudMessagesAsync = async {

    let minTemperature = 20.0
    let minHumidity = 60.0
    let rand = new Random()

    // Connect to the IoT hub using the MQTT protocol
    let deviceClient = DeviceClient.CreateFromConnectionString(connectionString, TransportType.Mqtt)

    while true do
        let currentTemperature: double = minTemperature + rand.NextDouble() * 15.0
        let currentHumidity: double = minHumidity + rand.NextDouble() * 20.0

        let messageString: string =
            { Temperature = currentTemperature; Humidity = currentHumidity }
            |> serialize

        let message = new Message(Encoding.ASCII.GetBytes(messageString));

        // Add a custom application property to the message.
        // An IoT hub can filter on these properties without access to the message body.
        message.Properties.Add("temperatureAlert", if currentTemperature > 30.0 then "true" else "false");

        // Send the telemetry message
        do! deviceClient.SendEventAsync(message).ContinueWith (fun t -> ()) |> Async.AwaitTask
        printfn "%s > Sending message: %s" (DateTime.UtcNow.ToString "yyyy/MM/dd HH:mm:ss") messageString
        do! Async.Sleep 1000
}

[<EntryPoint>]
let main argv =
    printfn "IoT Hub Quickstarts - Simulated device. Ctrl-C to exit."

    sendDeviceToCloudMessagesAsync
    |> Async.RunSynchronously
    |> ignore

    0
