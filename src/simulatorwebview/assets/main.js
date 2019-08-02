let vscode;
try {
    vscode = acquireVsCodeApi();
} catch (error) {
    
}

const app = new Vue({
    el: '#app',
    data: {
        inputDeviceList: [],
        deviceConnectionStrings: [],
        message: '',
        times: '',
        interval: '',
        messageType: '',
        sendType: 'D2C',
        endpoint: document.getElementById('app').getAttribute('data-endpoint'),
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
            // TODO: Add validator here
            data = {
                deviceConnectionStrings: this.deviceConnectionStrings,
                message: this.message,
                times: this.times,
                interval: this.interval,
                messageType: this.messageType,
                sendType: this.sendType
            }
            await axios.post(`${this.endpoint}/api/send`, data);
        }
    }
});
  