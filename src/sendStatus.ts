export class SendStatus {
    private readonly deviceId: string;
    private readonly total: number;
    private sent: number;
    private succeed: number;
    private failed: number;

    constructor(deviceId: string, total: number) {
        this.deviceId = deviceId;
        this.total = total;
        this.sent = 0;
        this.succeed = 0;
        this.failed = 0;
    }

    public getDeviceId(): string {
        return this.deviceId;
    }
    public getTotal(): number {
        return this.total;
    }
    public async getSent(): Promise<number> {
        return this.sent;
    }
    public async getSucceed(): Promise<number> {
        return this.succeed;
    }
    public async getFailed(): Promise<number> {
        return this.failed;
    }

    public async addSent(deviceCount: number): Promise<void> {
        this.sent += deviceCount;
    }
    public async addSucceed(): Promise<void> {
        this.succeed++;
    }
    public async addFailed(): Promise<void> {
        this.failed++;
    }

    public async sum(): Promise<number> {
        return this.succeed + this.failed;
    }
}
