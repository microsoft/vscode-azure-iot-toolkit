let vscode;
try {
  vscode = acquireVsCodeApi();
} catch (error) {}

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
We will randomly generate data in your specified format for you and send it out.`;

const defaultValue = {
  numbers: "10",
  interval: "1",
  intervalUnit: "second",
  messageType: "Text Content",
  messageBody: "Plain Text",
  plainTextArea: plainTextTemplate,
  dummyJsonArea: dummyJsonTemplate
};

const app = new Vue({
  el: "#app",
  data() {
    const numberValidator = (rule, value, callback) => {
      if (value === "") {
        callback(new Error("Required"));
      } else {
        const s = value.toString();
        for (let i = 0; i < s.length; i++) {
          if (s.charAt(i) < "0" || s.charAt(i) > "9") {
            callback(
              new Error("You cannot enter any character other than 0-9.")
            );
          }
        }
        const v = parseFloat(s);
        if (v > 0) {
          callback();
        } else {
          callback(
            new Error("Don't you think this should be a positive integer?")
          );
        }
      }
    };
    const messageParseValidator = async (rule, value, callback) => {
      if (value === "") {
        callback(new Error("Required"));
      } else {
        if (this.messageBody === "Plain Text") {
          callback();
        } else if (this.messageBody === "Dummy Json") {
          const validated = await this.generateDummyJson();
          if (validated) {
            callback();
          } else {
            callback(new Error("Malformed dummy json syntax."));
          }
        }
      }
    };
    return {
      introduction: introductionTemplate,
      hostName: "",
      inputDeviceList: [],
      formItem: {
        deviceConnectionStrings: [],
        message: "",
        numbers: "10",
        interval: "1"
      },
      intervalUnit: "second",
      messageType: "Text Content",
      messageBody: "Plain Text",
      textArea: {
        plainTextArea: "",
        dummyJsonArea: "",
        generatedMessage: ""
      },
      endpoint: document.getElementById("app").getAttribute("data-endpoint"),
      ruleValidation: {
        numbers: [
          { required: true, trigger: "blur" },
          { validator: numberValidator, trigger: "blur" },
          { validator: numberValidator, trigger: "change" }
        ],
        interval: [
          { required: true, trigger: "blur" },
          { validator: numberValidator, trigger: "blur" },
          { validator: numberValidator, trigger: "change" }
        ],
        message: [
          { required: true, trigger: "blur" },
          { validator: messageParseValidator, trigger: "blur" }
        ],
        deviceConnectionStrings: [
          {
            required: true,
            type: "array",
            min: 1,
            message: "Choose at least one device",
            trigger: "change"
          }
        ]
      },
      messageInputAreaTab: "Write",
      status: {
        numberOfSentMessage: 0,
        numberOfSuccessfulMessage: 0,
        numberOfFailedMessage: 0,
        numberOfTotalMessage: 0,
        isProcessing: false
      }
    };
  },
  async mounted() {
    try {
      await this.polling();
      await this.getInputDeviceList();
      await this.getPersistedInputs();
    } catch (error) {
      this.errorMessageInitialization = error.toString();
    }
  },
  methods: {
    async getPersistedInputs() {
      await axios
        .get(`${this.endpoint}/api/getpersistedinputs`)
        .then(async res => {
          const data = res.data;
          this.hostName = data.hostName;
          this.formItem.deviceConnectionStrings = data.deviceConnectionStrings;
          this.formItem.numbers =
            data.numbers && data.numbers !== ""
              ? data.numbers
              : defaultValue.numbers;
          this.formItem.interval =
            data.interval && data.interval !== ""
              ? data.interval
              : defaultValue.interval;
          this.intervalUnit =
            data.intervalUnit && data.intervalUnit !== ""
              ? data.intervalUnit
              : defaultValue.intervalUnit;
          this.messageBody =
            data.messageBody && data.messageBody !== ""
              ? data.messageBody
              : defaultValue.messageBody;
          this.textArea.plainTextArea =
            data.plainTextArea && data.plainTextArea !== ""
              ? data.plainTextArea
              : defaultValue.plainTextArea;
          this.textArea.dummyJsonArea =
            data.dummyJsonArea && DataTransfer.dummyJsonArea !== ""
              ? data.dummyJsonArea
              : defaultValue.dummyJsonArea;
          await this.textAreaOnChange();
        });
    },
    async polling() {
      await axios.get(`${this.endpoint}/api/polling`).then(res => {
        this.status = res.data;
      });
      setTimeout(this.polling, 500);
    },
    async getInputDeviceList() {
      const list = (await axios.get(`${this.endpoint}/api/getinputdevicelist`))
        .data;
      this.inputDeviceList = [];
      for (const device of list) {
        device.key = device.connectionString;
        this.inputDeviceList.push(device);
      }
    },
    async send() {
      this.$refs["formItem"].validate(async valid => {
        if (valid) {
          let intervalInMilliSecond = Number(this.formItem.interval);
          switch (this.intervalUnit) {
            case "minute":
              intervalInMilliSecond *= 60000;
              break;
            case "second":
              intervalInMilliSecond *= 1000;
              break;
            case "millisecond":
              intervalInMilliSecond *= 1;
              break;
          }
          const data = {
            deviceConnectionStrings: this.formItem.deviceConnectionStrings,
            message: this.formItem.message,
            numbers: this.formItem.numbers,
            interval: intervalInMilliSecond,
            messageType: this.messageType,
            messageBody: this.messageBody
          };
          await axios.post(`${this.endpoint}/api/send`, data);
        }
      });
    },
    async messageBodyChange(name) {
      this.messageBody = name;
      // If user clicks on 'Plain Text', the 'Preview' panel bacomes meaningless.
      // So we hide it, and (if user was on 'Preview', we) make the panel focus on 'Write' again.
      if (name === "Plain Text") {
        this.messageInputAreaTab = "Write";
      }
      await this.textAreaOnChange();
      // If user changes the type, a validation should be executed again.
      this.$refs["formItem"].validate();
    },
    async intervalUnitChange(name) {
      await this.persistInputs();
    },
    async generateDummyJson() {
      const template = {
        template: this.textArea.dummyJsonArea
      };
      const validated = await axios
        .post(`${this.endpoint}/api/generaterandomjson`, template)
        .then(res => {
          this.textArea.generatedMessage = res.data;
          return true;
        })
        .catch(err => {
          this.textArea.generatedMessage = "Malformed dummy json syntax.";
          return false;
        });
      return validated;
    },
    async textAreaOnChange() {
      if (this.messageBody === "Dummy Json") {
        this.formItem.message = this.textArea.dummyJsonArea;
        await this.generateDummyJson();
      } else if (this.messageBody === "Plain Text") {
        this.formItem.message = this.textArea.plainTextArea;
      }
      await this.persistInputs();
    },
    async progressCancel() {
      await axios.post(`${this.endpoint}/api/cancel`, {
        cancel: true
      });
    },
    async persistInputs() {
      const inputs = {
        hostName: this.hostName,
        deviceConnectionStrings: this.formItem.deviceConnectionStrings,
        numbers: this.formItem.numbers,
        interval: this.formItem.interval,
        intervalUnit: this.intervalUnit,
        messageBody: this.messageBody,
        plainTextArea: this.textArea.plainTextArea,
        dummyJsonArea: this.textArea.dummyJsonArea
      };
      await axios.post(`${this.endpoint}/api/presistinputs`, inputs);
    }
  }
});
