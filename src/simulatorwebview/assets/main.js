let vscode;
try {
    vscode = acquireVsCodeApi();
} catch (error) {
    
}

// index, city, boolean, random number, date and time, coordinates...
// These are common elements in IoT senario, so we generate a related template contains all of them.
const dummyJsonTemplate = `{
  "temperatureSensor": [
    {{#repeat 2}}
    {
      "sensorId": {{@index}},
      "location": "{{city}}",
      "healthy": {{boolean}},
      "data": [
		{{#repeat 3}}
		{
			"date": "{{date '2019-01-01' '2019-12-31' 'YYYY-MM-DD'}}",
			"time": "{{time '00:00' '23:59' 'hh:mm'}}",
			"temperature": "{{float 1 100 round=0.01}} °C",
		}
		{{/repeat}}
	  ]
    }
    {{/repeat}}
  ],
  "speedSensor": [
	{{#repeat 2}}
    {
      "sensorId": {{@index}},
	  "coordinates": {
		"x": {{float -50 50 '0.00'}},
		"y": {{float -25 25 '0.00'}}
	  },
	  "speed": "{{int 0 10000 '0,0.00'}} m/s"
	}
    {{/repeat}}
  ]
}
`;

const plainTextTemplate = `Hello from Azure IoT Simulator!`;

const introductionTemplate = `This page is intended to help you quickly send D2C messages.
You only need to specify the device, the number of times, the delivery interval, and the data template.
We will randomly generate data in your specified format for you and send it out.`

const app = new Vue({
    el: '#app',
    data () { 
        const numberValidator = (rule, value, callback) => {
            if (value === '') {
              callback(new Error('Required'));
            } else {
              const s = value.toString();
              for (let i = 0; i < s.length; i++) {
                if (s.charAt(i) < '0' || s.charAt(i) > '9') {
                  callback(new Error('You cannot enter any character other than 0-9.'));
                }
              }
              const v = parseFloat(s);
              if (v > 0) {
                callback();
              } else {
                callback(new Error('Don\'t you think this should be a positive integer?'));
              }
            }
          }; 
        return {
            introduction: introductionTemplate,
            hostName: '',
            inputDeviceList: [],
            formItem: {
                deviceConnectionStrings: [],
                message: plainTextTemplate,
                times: '10',
                interval: '1',
            },
            intervalUnit: 'second',
            messageType: 'Text Content',
            messageBody: 'Plain Text',
            generatedMessage: '',
            isProcessing: false,
            endpoint: document.getElementById('app').getAttribute('data-endpoint'),
            ruleValidation: {
                times: [
                  {required: true, trigger: 'blur'},
                  {validator: numberValidator, trigger: 'blur'}
                ],
                interval: [
                  {required: true, trigger: 'blur'},
                  {validator: numberValidator, trigger: 'blur'}
                ],
                message: [
                  {required: true, trigger: 'blur'},
                ],
                deviceConnectionStrings: [
                  { required: true, type: 'array', min: 1, message: 'Choose at least one device', trigger: 'change' }
                ]
            },
            messageInputAreaTab: 'Write'
        }
    },
    async mounted () {
        try {
          await this.tryLatestProcessingStatus();
          await this.getIoTHubHostName();
          await this.getInputDeviceList();
        } catch (error) {
            this.errorMessageInitialization = error.toString();
        }
    },
    methods: {
        async getProcessingStatus() {
          this.isProcessing = (await axios.get(`${this.endpoint}/api/isprocessing`)).data;
        },
        // if the simulation is in processing, and user close the webview
        // next time he/she opens it again, the sending status will remain 'processing', but cannot refresh itself
        // this function aims at trying to get status every second, if isProcessing=true when the page is loaded
        async tryLatestProcessingStatus() {
          await this.getProcessingStatus();
          if (this.isProcessing) {
            setTimeout(this.tryLatestProcessingStatus, 1000);
          }
        },
        async getIoTHubHostName () {
          this.hostName = (await axios.get(`${this.endpoint}/api/getiothubhostname`)).data;
        },
        async getInputDeviceList () {
            const list = (await axios.get(`${this.endpoint}/api/getinputdevicelist`)).data;
            this.inputDeviceList = []
            for (const device of list) {
                device.key = device.connectionString;
                this.inputDeviceList.push(device)
            }
            const preSelected = (await axios.get(`${this.endpoint}/api/getpreselected`)).data;
            if (preSelected !== '') {
              this.formItem.deviceConnectionStrings.push(preSelected.connectionString);
            }
        },
        async send () {
            this.$refs['formItem'].validate(async (valid) => {
                if (valid) {
                    let intervalInMilliSecond = Number(this.formItem.interval);
                    switch (this.intervalUnit) {
                        case 'minute':
                            intervalInMilliSecond *= 60000;
                            break;
                        case 'second':
                            intervalInMilliSecond *= 1000;
                            break;
                        case 'millisecond':
                            intervalInMilliSecond *= 1;
                            break;
                    }
                    const data = {
                        deviceConnectionStrings: this.formItem.deviceConnectionStrings,
                        message: this.formItem.message,
                        times: this.formItem.times,
                        interval: intervalInMilliSecond,
                        messageType: this.messageType,
                        messageBody: this.messageBody
                    }
                    const toProcess = {
                      processing: true
                    }
                    const doneProcess = {
                      processing: false
                    }
                    await axios.post(`${this.endpoint}/api/setprocessing`, toProcess)
                      .then((res) => {
                        this.isProcessing = res.data;
                      })
                    await axios.post(`${this.endpoint}/api/send`, data);
                    await axios.post(`${this.endpoint}/api/setprocessing`, doneProcess)
                      .then((res) => {
                        this.isProcessing = res.data;
                      })
                }
              });
        },
        messageBodyChange (name) {
          // The input area will be replaced with template only when the content is empty or default.
          // If user makes any change, we will keep the change.
          if (name === 'Dummy Json') {
            if (this.formItem.message === '' || this.formItem.message === plainTextTemplate) {
              this.formItem.message = dummyJsonTemplate;
            }
          } else if (name === 'Plain Text') {
            if (this.formItem.message === '' || this.formItem.message === dummyJsonTemplate) {
              this.formItem.message = plainTextTemplate;
            }
            this.messageInputAreaTab = 'Write';
          }
        },
        async generateDummyJson () {
          const template = {
            template: this.formItem.message
          };
          await axios.post(`${this.endpoint}/api/generaterandomjson`, template)
          .then((res) => {
              this.generatedMessage = res.data;
          })
          .catch((err) => {
            this.generatedMessage = 'Malformed dummy json syntax.';
          })
        }
    }
});
  