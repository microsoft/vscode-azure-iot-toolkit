let vscode;
try {
    vscode = acquireVsCodeApi();
} catch (error) {
    
}

const dummyJsonTemplateA = `
{
    "users": [
      {{#repeat 2}}
      {
        "id": {{@index}},
        "name": "{{firstName}} {{lastName}}",
        "work": "{{company}}",
        "email": "{{email}}",
        "dob": "{{date '1900' '2000' 'YYYY'}}",
        "address": "{{int 1 100}} {{street}}",
        "city": "{{city}}",
        "optedin": {{boolean}}
      }
      {{/repeat}}
    ],
    "images": [
      {{#repeat 3}}
      "img{{@index}}.png"
      {{/repeat}}
    ],
    "coordinates": {
      "x": {{float -50 50 '0.00'}},
      "y": {{float -25 25 '0.00'}}
    },
    "price": "\${{int 0 99999 '0,0'}}"
  }
`;

const dummyJsonTemplateData = `
// Generate a random date between midnight 2010-01-01 and midnight 2015-01-01
{{date '2010' '2015'}} // Thu Jan 26 2012 03:04:15 GMT+0000 (GMT)
 
// Generate a random date between more specific values
{{date '2015-06-01' '2015-06-30'}} // Mon Jun 22 2015 01:02:36 GMT+0100 (BST)
 
// Generate a random date between even more specific values (inc. time)
{{date '2015-06-01T09:00' '2015-06-30T17:30'}} // Sun Jun 07 2015 23:55:16 GMT+0100 (BST)
 
// Format the date using fecha
{{date '2010' '2015' 'DD/MM/YYYY'}} // 16/06/2012
 
// Format the date using a unix timestamp
{{date '2010' '2015' 'unix'}} // 1340417344
`;

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
            hostName: '',
            inputDeviceList: [],
            formItem: {
                deviceConnectionStrings: [],
                message: 'Hello from Azure IoT Simulator!',
                times: '1',
                interval: '1',
            },
            intervalUnit: 'second',
            sendType: 'D2C',
            messageType: 'Text Content',
            messageBody: 'Plain Text',
            generatedMessage: 'Type anything in the left, and see preview here...',
            failedValidation: false,
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
                ]
            },
            dummyJsonTemplate: ''
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
            if (this.inputDeviceList.length > 0) {
              console.log(this.inputDeviceList[0].connectionString);
              this.formItem.deviceConnectionStrings.push(this.inputDeviceList[0].connectionString);
            }
        },
        async send () {
            this.$refs['formItem'].validate(async (valid) => {
                if (valid && this.formItem.deviceConnectionStrings.length > 0) {
                    let intervalInMilliSecond = Number(this.formItem.interval);
                    switch (this.intervalUnit) {
                        // No break in this switch-case.
                        case 'minute':
                            intervalInMilliSecond *= 60;
                        case 'second':
                            intervalInMilliSecond *= 1000;
                        case 'millisecond':
                            intervalInMilliSecond *= 1;
                    }
                    const data = {
                        deviceConnectionStrings: this.formItem.deviceConnectionStrings,
                        message: this.formItem.message,
                        times: this.formItem.times,
                        interval: intervalInMilliSecond,
                        messageType: this.messageType,
                        sendType: this.sendType,
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
                } else {
                    this.failedValidation = true;
                }
              });
        },
        handleClick (name) {
            // TODO: name should be changed, in order for a clean code.
            switch (name) {
                case 'a':
                    this.formItem.message = dummyJsonTemplateA;
                    break;
                case 'b':
                    this.formItem.message = dummyJsonTemplateData;
                    break;
            }
            if (name != 'c') {
              // 'c' indicates the website hyper link towards dummy-json wiki/github
              this.generateDummyJson();
            }
        },
        async generateDummyJson () {
          const template = {
            template: this.formItem.message
          };
          this.generatedMessage = (await axios.post(`${this.endpoint}/api/generaterandomjson`, template)).data;
        }
    }
});
  