import * as bodyParser from "body-parser";
import * as dummyjson from "dummy-json";
import * as express from "express";
import * as http from "http";
import { AddressInfo } from "net";
import * as vscode from "vscode";
import { DeviceItem } from "../Model/DeviceItem";
import { SendStatus } from "../sendStatus";
import { Simulator } from "../simulator";

export class LocalServer {
  private app: express.Express;
  private server: http.Server;
  private serverPort = 0;
  private router: express.Router;
  private readonly context: vscode.ExtensionContext;
  private _simulator: Simulator;
  private preSelectedDevice: DeviceItem;

  constructor(context: vscode.ExtensionContext) {
    this.initRouter();
    this.initApp();
    this.server = http.createServer(this.app);
    this.context = context;
    this._simulator = Simulator.getInstance(this.context);
    this.preSelectedDevice = undefined;
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

  public setPreSelectedDevice(deviceItem: DeviceItem) {
    this.preSelectedDevice = deviceItem;
  }

  private initRouter() {
    this.router = express.Router();
    this.router.get(
      "/api/getinputdevicelist",
      async (req, res, next) => await this.getInputDeviceList(req, res, next)
    );
    this.router.get(
      "/api/polling",
      async (req, res, next) => await this.polling(req, res, next)
    );
    this.router.get(
      "/api/getpersistedinputs",
      async (req, res, next) => await this.getPersistedInputs(req, res, next)
    );
    this.router.post(
      "/api/send",
      async (req, res, next) => await this.send(req, res, next)
    );
    this.router.post(
      "/api/generaterandomjson",
      async (req, res, next) => await this.generateRandomJson(req, res, next)
    );
    this.router.post(
      "/api/cancel",
      async (req, res, next) => await this.cancel(req, res, next)
    );
    this.router.post(
      "/api/presistinputs",
      async (req, res, next) => await this.persistInputs(req, res, next)
    );
  }

  private initApp() {
    this.app = express();
    this.app.all("*", (req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, PUT, POST, DELETE, PATCH, OPTIONS"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
      );
      res.setHeader("Access-Control-Allow-Credentials", "true");
      if (req.method === "OPTIONS") {
        res.end();
      } else {
        next();
      }
    });
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use("/", this.router);
    this.app.set("trust proxy", 1);
    this.app.use("*", (req, res) => {
      res.status(404).json({ error: "I don't have that" });
    });
    this.app.use("*", (err, req, res, next) => {
      if (err) {
        res.status(500).json({ error: err.toString() });
      } else {
        res.status(404).json({ error: "I don't have that" });
      }
    });
  }

  private async cancel(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    try {
      const data = req.body;
      const cancel = data.cancel;
      if (cancel) {
        this._simulator.cancel();
      }
      return res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  }

  private async persistInputs(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    try {
      const inputs = req.body;
      this._simulator.persistInputs(inputs);
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  }

  private async getPersistedInputs(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    try {
      const result = this._simulator.getPersistedInputs();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  private async polling(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    try {
      const status: SendStatus = this._simulator.getStatus();
      const result = {
        numberOfSentMessage: status ? await status.getSent() : 0,
        numberOfSuccessfulMessage: status ? await status.getSucceed() : 0,
        numberOfFailedMessage: status ? await status.getFailed() : 0,
        numberOfTotalMessage: status ? await status.getTotal() : 0,
        isProcessing: this._simulator.isProcessing()
      };
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  private async getInputDeviceList(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    try {
      const list = await this._simulator.getInputDeviceList();
      return res.status(200).json(list);
    } catch (err) {
      next(err);
    }
  }

  private async send(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    try {
      // Since we do not support C2D yet, here is just one call on sendD2C()
      await this.sendD2C(req, res, next);
      // Must return a status here. If no success or failure returned, the webview may retry and cause unexpected re-send behavior.
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  }

  private async sendD2C(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    try {
      const data = req.body;
      const messageType = data.messageType;
      const messageBody = data.messageBody;
      const deviceConnectionStrings: string[] = data.deviceConnectionStrings;
      let template: string = data.message;
      const numbers: number = Number(data.numbers);
      const interval: number = Number(data.interval);
      switch (messageType) {
        case "File Upload":
          // TODO: File Upload
          break;
        case "Text Content":
          switch (messageBody) {
            case "Dummy Json":
              await this._simulator.sendD2CMessage(
                deviceConnectionStrings,
                template,
                true,
                numbers,
                interval
              );
              break;
            case "Plain Text":
              await this._simulator.sendD2CMessage(
                deviceConnectionStrings,
                template,
                false,
                numbers,
                interval
              );
            default:
              break;
          }
          break;
        default:
          break;
      }
    } catch (err) {
      next(err);
    }
  }

  private async generateRandomJson(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    const data = req.body;
    const template = data.template;
    try {
      const message = dummyjson.parse(template);
      return res.status(200).json(message);
    } catch (err) {
      return res.sendStatus(400);
    }
  }
}
