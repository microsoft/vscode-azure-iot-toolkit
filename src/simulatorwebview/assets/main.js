let vscode;
try {
    vscode = acquireVsCodeApi();
} catch (error) {
    
}

const app = new Vue({
    el: '#app',
    data: {
        inputDevice: [],
        msg: '',
        times: '',
        interval: '',
        result: '',
        inputDeviceList: [],
        endpoint: document.getElementById('app').getAttribute('data-endpoint'),
    },
    created: async function () {
        try {
            this.inputDeviceList = await this.getInputDeviceList();
        } catch (error) {
            this.errorMessageInitialization = error.toString();
        }
    },
    methods: {
        getInputDeviceList: async function () {
            return (await axios.get(`${this.endpoint}/api/getinputdevicelist`)).data;
        },
        async send () {
            // TODO: Add validator here
            data = {
                inputDevice: this.inputDevice,
                msg: this.msg,
                times: this.times,
                interval: this.interval
            }
            await axios.post(`${this.endpoint}/api/sendmessagerepeatedly`, data);
        }
    }
});
  