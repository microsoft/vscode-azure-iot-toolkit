import * as bodyParser from "body-parser";
import * as express from "express";
import * as http from "http";
import * as vscode from "vscode";
import { AddressInfo } from 'net';
import { Simulator } from "../simulator";
import { SimulatorMessageSender } from '../simulatorMessageSender'
import { IoTHubResourceExplorer } from "../iotHubResourceExplorer";
import { IoTHubMessageExplorer } from "../iotHubMessageExplorer";
import { AzureIoTExplorer } from "../azureIoTExplorer";
const dummyjson = require('dummy-json');

export class LocalServer {
    private app: express.Express;
    private server: http.Server;
    private serverPort = 0;
    private router: express.Router;
    private context: vscode.ExtensionContext;
    private _modules: string[];

    constructor(context: vscode.ExtensionContext) {
        this.initRouter();
        this.initApp();
        this.server = http.createServer(this.app);
        this.context = context;
    }

    set modules(modules: string[]) {
        this._modules = modules;
    }

    public startServer(): void {
        const { port } = this.server.listen(0).address() as AddressInfo;
        this.serverPort = port;
        // tslint:disable-next-line:no-console
        console.log("serverPort:" + this.serverPort);
    }

    public stopServer(): void {
        this.server.close(null);
    }

    public getServerUri(): string {
        return `http://localhost:${this.serverPort}`;
    }

    private initRouter() {
        this.router = express.Router();
        this.router.get("/api/getinputdevicelist", async(req, res, next) => await this.getInputDeviceList(req, res, next));
        this.router.post("/api/sendmessagerepeatedly", async(req, res, next) => await this.sendMessageRepeatedly(req, res, next));
        this.router.post("/api/dj", async(req, res, next) => await this.dj(req, res, next));
    
    }

    private initApp() {
        this.app = express();
        this.app.all("*", (req, res, next) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, PATCH, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
            res.setHeader("Access-Control-Allow-Credentials", "true");
            if (req.method === 'OPTIONS') {
                res.end()
            } else {
                next()
            }
        });
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: false}));
        this.app.use("/", this.router);
        this.app.set("trust proxy", 1);
        this.app.use("*", (req, res) => {
            res.status(404).json({ error: "I don\'t have that" });
        });
        this.app.use("*", (err, req, res, next) => {
            if (err) {
              res.status(500).json({error: err.toString()});
            } else {
              res.status(404).json({error: "I don\'t have that"});
            }
        });
    }

    private async getInputDeviceList(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const result = await Simulator.getInputDeviceList();
            return res.status(200).json(result);
        } catch (err) {
            next(err);
        }   
    }

    private async dj(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const template = '{ \
                "users": [\
                  {{#repeat 2}}\
                  {\
                    "id": {{@index}},\
                    "name": "{{firstName}} {{lastName}}",\
                    "work": "{{company}}",\
                    "email": "{{email}}",\
                    "dob": "{{date \'1900\' \'2000\' \'YYYY\'}}",\
                    "address": "{{int 1 100}} {{street}}",\
                    "city": "{{city}}",\
                    "optedin": {{boolean}}\
                  }\
                  {{/repeat}}\
                ],\
                "images": [\
                  {{#repeat 3}}\
                  "img{{@index}}.png"\
                  {{/repeat}}\
                ],\
                "coordinates": {\
                  "x": {{float -50 50 \'0.00\'}},\
                  "y": {{float -25 25 \'0.00\'}}\
                },\
                "price": "${{int 0 99999 \'0,0\'}}"\
              }';
              
              var result = dummyjson.parse(template); // Returns a string
              const data = req.body;
            const inputDeviceConnectionStrings: string[] = data.inputDevice;
            const message = result;
            const times: number = 3;
            const interval: number = 1;
              let outputChannel = vscode.window.createOutputChannel("Azure IoT Hub Toolkit Simulator");
             const simulatorMessageSender: SimulatorMessageSender = new SimulatorMessageSender(outputChannel);
                simulatorMessageSender.sendD2CMessageRepeatedly(inputDeviceConnectionStrings, message, times, interval);
              vscode.window.showInformationMessage(result);
            return res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    private async sendMessageRepeatedly(req: express.Request, res: express.Response, next: express.NextFunction) {
        const data = req.body;
        const inputDeviceConnectionStrings: string[] = data.inputDevice;
        const message: string = data.msg;
        const times: number = Number(data.times);
        const interval: number = Number(data.interval);
        const x = new AzureIoTExplorer(this.context);
        await x.send(inputDeviceConnectionStrings, message, times, interval);

    }
}
