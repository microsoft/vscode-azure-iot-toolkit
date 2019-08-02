let vscode;
try {
    vscode = acquireVsCodeApi();
} catch (error) {
    
}

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
            inputDeviceList: [],
            formItem: {
                deviceConnectionStrings: [],
                message: '',
                times: '',
                interval: '',
            },
            intervalUnit: 'millisecond',
            messageType: 'Plain Text',
            sendType: 'D2C',
            failedValidation: false,
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
    created: async function () {
        try {
            await this.getInputDeviceList();
        } catch (error) {
            this.errorMessageInitialization = error.toString();
        }
    },
    methods: {
        async getInputDeviceList () {
            const list = (await axios.get(`${this.endpoint}/api/getinputdevicelist`)).data;
            this.inputDeviceList = []
            for (const device of list) {
                device.key = device.connectionString;
                this.inputDeviceList.push(device)
            }
        },
        async send () {
            this.$refs['formItem'].validate(async (valid) => {
                if (valid) {
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
                    data = {
                        deviceConnectionStrings: this.formItem.deviceConnectionStrings,
                        message: this.formItem.message,
                        times: this.formItem.times,
                        interval: intervalInMilliSecond,
                        messageType: this.messageType,
                        sendType: this.sendType
                    }
                    await axios.post(`${this.endpoint}/api/send`, data);
                } else {
                    this.failedValidation = true;
                }
              });
        },
        handleClick (name) {
            this.formItem.message = name;
        }
    }
});
  