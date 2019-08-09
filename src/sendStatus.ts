export class SendStatus {
    private readonly deviceId: string;
    private succeed: number;
    private failed: number;
    private readonly total: number;

    constructor(deviceId: string, total: number) {
        this.deviceId = deviceId;
        this.succeed = 0;
        this.failed = 0;
        this.total = total;
    }

    public getDeviceId(): string {
        return this.deviceId;
    }
    public getSucceed(): number {
        return this.succeed;
    }
    public getFailed(): number {
        return this.failed;
    }
    public getTotal(): number {
        return this.total;
    }

    public AddSucceed(): void {
        this.succeed++;
    }
    public AddFailed(): void {
        this.failed++;
    }

    public sum(): number {
        return this.succeed + this.failed;
    }
}
