// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// This application uses the Azure IoT Hub device SDK for .NET
// For samples see: https://github.com/Azure/azure-iot-sdk-csharp/tree/master/iothub/device/samples

using System;
using Microsoft.Azure.Devices.Client;
using Microsoft.Azure.Devices.Shared;
using System.Threading.Tasks;

namespace simulatedDevice
{
    class SimulatedDevice
    {
        static string DeviceConnectionString = "{{deviceConnectionString}}";

        static async Task Main(string[] args)
        {
            try
            {
                Console.WriteLine("Connecting to hub");
                DeviceClient Client = DeviceClient.CreateFromConnectionString(DeviceConnectionString, 
                    TransportType.Mqtt);
                Console.WriteLine("Retrieving twin");
                var twin = await Client.GetTwinAsync();
                await Client.SetDesiredPropertyUpdateCallbackAsync(OnDesiredPropertyChanged, null);
                
                var reportedProperties = new TwinCollection();
                var weather = new TwinCollection();
                weather["temperature"] = 72;
                weather["humidity"] = 17;
                reportedProperties["firmwareVersion"] = "1.2.2";
                reportedProperties["weather"] = weather;

                await Client.UpdateReportedPropertiesAsync(reportedProperties);
            }
            catch (Exception ex)
            {
                Console.WriteLine();
                Console.WriteLine("Error in sample: {0}", ex.Message);
            }
            Console.WriteLine("Press Enter to exit.");
            Console.ReadLine();
        }

        private static async Task OnDesiredPropertyChanged(TwinCollection desiredProperties, object userContext)
        {
            await Task.Run(() => {
                Console.WriteLine("New desired properties received:");
                Console.WriteLine(desiredProperties.ToJson());
            });
        }
    }
}