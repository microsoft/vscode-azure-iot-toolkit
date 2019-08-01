let vscode;
try {
    vscode = acquireVsCodeApi();
} catch (error) {
    
}

const app = new Vue({
    el: '#app',
    data: {
        inputDeviceList: [],
        inputDevice: [],
        msg: '',
        times: '',
        interval: '',
        messageType: '',
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
                inputDevice: this.inputDevice,
                msg: this.msg,
                times: this.times,
                interval: this.interval
            }
            if (this.messageType == 'Plain Text') {
                await axios.post(`${this.endpoint}/api/sendmessagerepeatedly`, data);
            } else {
                await axios.post(`${this.endpoint}/api/senddummyjsonrepeatedly`, data);
            }
        }
    }
});
  