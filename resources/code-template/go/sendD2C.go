package main

import (
	"bytes"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"time"
)

func main() {
	url := "https://{{iotHubHostName}}/devices/{{deviceId}}/messages/events?api-version=2018-06-30"

	for {
		temperature := 20 + (rand.Float64() * 15)
		humidity := 60 + (rand.Float64() * 20)
		message := fmt.Sprintf(`{"temperature":%f, "humidity":%f}`, temperature, humidity)
		payload := []byte(message)
		req, _ := http.NewRequest("POST", url, bytes.NewBuffer(payload))
		req.Header.Add("authorization", "{{deviceSasToken}}")

		fmt.Printf("Sending message: %s\n", message)
		res, err := http.DefaultClient.Do(req)

		if err != nil {
			fmt.Println(err)
			os.Exit(1)
		} else {
			fmt.Printf("IoT Hub responded to message with status: %d\n", res.StatusCode)
			res.Body.Close()
		}

		time.Sleep(time.Second)
	}
}
