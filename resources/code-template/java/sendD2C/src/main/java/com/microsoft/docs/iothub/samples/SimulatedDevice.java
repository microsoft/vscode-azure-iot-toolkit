// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// This application uses the Azure IoT Hub device SDK for Java
// For samples see: https://github.com/Azure/azure-iot-sdk-java/tree/master/device/iot-device-samples

package com.microsoft.docs.iothub.samples;

import com.microsoft.azure.sdk.iot.device.*;
import com.microsoft.azure.sdk.iot.device.exceptions.IotHubClientException;
import com.google.gson.Gson;

import java.io.*;
import java.net.URISyntaxException;
import java.util.Random;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;

public class SimulatedDevice {
  // The device connection string to authenticate the device with your IoT hub.
  private static String connString = "{{deviceConnectionString}}";

  // Using the MQTT protocol to connect to IoT Hub
  private static IotHubClientProtocol protocol = IotHubClientProtocol.MQTT;
  private static DeviceClient client;

  // Specify the telemetry to send to your IoT hub.
  private static class TelemetryDataPoint {
    public double temperature;
    public double humidity;

    // Serialize object to JSON format.
    public String serialize() {
      Gson gson = new Gson();
      return gson.toJson(this);
    }
  }

  // Print the acknowledgement received from IoT Hub for the telemetry message sent.
  private static class EventCallback implements MessageSentCallback {
    @Override
    public void onMessageSent(Message sentMessage, IotHubClientException exception, Object callbackContext) {
      System.out.println("IoT Hub responded to message with status: " + (exception == null ? IotHubStatusCode.OK.toString()
          : exception.getStatusCode()));
        if (callbackContext != null) {
          synchronized (callbackContext) {
            callbackContext.notify();
          }
        }
    }
  }

  private static class MessageSender implements Runnable {
    public void run() {
      try {
        // Initialize the simulated telemetry.
        double minTemperature = 20;
        double minHumidity = 60;
        Random rand = new Random();

        while (true) {
          // Simulate telemetry.
          double currentTemperature = minTemperature + rand.nextDouble() * 15;
          double currentHumidity = minHumidity + rand.nextDouble() * 20;
          TelemetryDataPoint telemetryDataPoint = new TelemetryDataPoint();
          telemetryDataPoint.temperature = currentTemperature;
          telemetryDataPoint.humidity = currentHumidity;

          // Add the telemetry to the message body as JSON.
          String msgStr = telemetryDataPoint.serialize();
          Message msg = new Message(msgStr);

          // Add a custom application property to the message.
          // An IoT hub can filter on these properties without access to the message body.
          msg.setProperty("temperatureAlert", (currentTemperature > 30) ? "true" : "false");

          System.out.println("Sending message: " + msgStr);

          Object lockobj = new Object();

          // Send the message.
          EventCallback callback = new EventCallback();
          client.sendEventAsync(msg, callback, lockobj);

          synchronized (lockobj) {
            lockobj.wait();
          }
          Thread.sleep(1000);
        }
      } catch (InterruptedException e) {
        System.out.println("Finished.");
      }
    }
  }

  public static void main(String[] args) throws IOException, URISyntaxException, IotHubClientException {

    // Connect to the IoT hub.
    client = new DeviceClient(connString, protocol);
    
    // Open a connection from the device client.
    // Boolean parameter configures retry behavior (false => no retry).
    client.open(false);

    // Create new thread and start sending messages 
    MessageSender sender = new MessageSender();
    ExecutorService executor = Executors.newFixedThreadPool(1);
    executor.execute(sender);

    // Stop the application.
    System.out.println("Press ENTER to exit.");
    System.in.read();
    executor.shutdownNow();
    client.close();
  }
}
