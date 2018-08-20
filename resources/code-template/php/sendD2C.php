<?php

$curl = curl_init();

while (1) {
    $message = new stdClass();
    $message->temperature = rand(20, 35);
    $message->humidity = rand(60, 80);
    $payload = json_encode($message);
    curl_setopt_array($curl, array(
        CURLOPT_URL => "https://{{iotHubHostName}}/devices/{{deviceId}}/messages/events?api-version=2018-06-30",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => "",
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => "POST",
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => array(
            "authorization: {{deviceSasToken}}",
        ),
    ));
    echo "Sending message: " . $payload . "\n";
    $response = curl_exec($curl);
    $err = curl_error($curl);
    $httpcode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    if ($err) {
        echo $err;
        exit(1);
    } else {
        echo "IoT Hub responded to message with status: " . $httpcode . "\n";
    }
    sleep(1);
}

curl_close($curl);
