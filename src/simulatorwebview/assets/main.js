let vscode;
try {
    vscode = acquireVsCodeApi();
} catch (error) {
    
}

const app = new Vue({
    el: '#app',
    data: {
        value: 0,
        modal: false,
        step: 1,
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
            const list = await this.getInputDeviceList();
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
        nextStep () {
            this.step = this.step + 1;
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
        },
        deviceListTransferRender (item) {
            return item.label;
        },
        deviceListTransferChangeHandler (newTargetKeys) {
            this.inputDevice = newTargetKeys;
        },
        add (name) {
            if (name === 'Number') {
                this.modal = true;
            } else {
                
            }
        },
        ok () {
            this.$Message.info('Clicked ok');
        },
        cancel () {
            this.$Message.info('Clicked cancel');
        }
    }
});
  