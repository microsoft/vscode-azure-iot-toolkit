import * as bodyParser from "body-parser";
import * as express from "express";
import * as http from "http";
import * as vscode from "vscode";
import { AddressInfo } from 'net';
import { Simulator } from "../simulator";
import { Utility } from "../utility";
import { Constants } from "../constants";
import { ConnectionString } from 'azure-iot-common';
const dummyjson = require('dummy-json');

export class LocalServer {
    private app: express.Express;
    private server: http.Server;
    private serverPort = 0;
    private router: express.Router;
    private context: vscode.ExtensionContext;
    private _modules: string[];
    private _simulator: Simulator;

    constructor(context: vscode.ExtensionContext) {
        this.initRouter();
        this.initApp();
        this.server = http.createServer(this.app);
        this.context = context;
        this._simulator = new Simulator(this.context);
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
        this.router.get("/api/getiothubhostname", async(req, res, next) => await this.getIoTHubHostName(req, res, next));
        this.router.post("/api/send", async(req, res, next) => await this.send(req, res, next));
        this.router.post("/api/generaterandomjson", async(req, res, next) => await this.generateRandomJson(req, res, next));
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

    private async getIoTHubHostName(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle, false);
            const result = ConnectionString.parse(iotHubConnectionString).HostName;
            return res.status(200).json(result);
        } catch (err) {
            next(err);
        }   
    }

    private async getInputDeviceList(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const result = await Simulator.getInputDeviceList();
            return res.status(200).json(result);
        } catch (err) {
            next(err);
        }   
    }

    private async send(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {      
            const data = req.body;
            const sendType = data.sendType;
            switch (sendType) {
                case 'D2C':
                    await this.sendD2C(req, res, next);
                    break;
                case 'C2D':
                    await this.sendC2D(req, res, next);
                    break;
            }
            res.sendStatus(200);
        } catch (err) {
            next(err);
        }   
    }

    private async sendD2C(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const data = req.body;
            const messageType = data.messageType;
            const messageBody = data.messageBody;
            const deviceConnectionStrings: string[] = data.deviceConnectionStrings;
            let message: string = data.message;
            const times: number = Number(data.times);
            const interval: number = Number(data.interval);
            switch (messageType) {
                case 'File Upload':
                    // TODO: File Upload
                    break;
                case 'Text Content':
                    switch (messageBody) {
                        case 'Dummy Json':
                            message = dummyjson.parse(data.message);
                            break;
                        // case 'Plain Text':
                        //     // Nothing to do
                    }
                    break;
            }
            await this._simulator.sendD2CMessage(deviceConnectionStrings, message, times, interval);
        } catch (err) {
            next(err);
        }   
    }

    private async sendC2D(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const iotHubConnectionString = await Utility.getConnectionString(Constants.IotHubConnectionStringKey, Constants.IotHubConnectionStringTitle);
            const data = req.body;
            const messageType = data.messageType;
            const deviceConnectionStrings: string[] = data.deviceConnectionStrings;
            const deviceIds: string[] = [];
            for (const deviceConnectionString of deviceConnectionStrings) {
                const deviceId = ConnectionString.parse(deviceConnectionString).DeviceId;
                deviceIds.push(deviceId);
            }
            const message: string = data.message;
            const times: number = Number(data.times);
            const interval: number = Number(data.interval);
            switch (messageType) {
                case 'Dummy Json':
                    const message = dummyjson.parse(data.message);
                    break;
                // case 'Plain Text':
                //     // Nothing to do
            }
            await this._simulator.sendC2DMessage(iotHubConnectionString, deviceIds, message, times, interval);
        } catch (err) {
            next(err);
        }   
    }

    private async generateRandomJson(req: express.Request, res: express.Response, next: express.NextFunction) {
        const data = req.body;
        const template = data.template;
        const message = dummyjson.parse(template);
        return res.status(200).json(message);
    }



}
