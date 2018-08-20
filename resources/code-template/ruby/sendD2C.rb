require 'json'
require 'uri'
require 'net/http'
require 'openssl'

$stdout.sync = true
url = URI("https://{{iotHubHostName}}/devices/{{deviceId}}/messages/events?api-version=2018-06-30")
http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true
request = Net::HTTP::Post.new(url)
request["authorization"] = '{{deviceSasToken}}'

while true do
    temperature = 20 + (rand() * 15)
    humidity = 60 + (rand() * 20)
    message = {temperature: temperature, humidity: humidity}.to_json
    request.body = message

    puts "Sending message: " + message
    response = http.request(request)
    puts "IoT Hub responded to message with status: " + response.code
    
    sleep(1)
end
