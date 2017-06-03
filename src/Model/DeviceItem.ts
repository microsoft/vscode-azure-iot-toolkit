import { TreeItem } from "vscode";

export class DeviceItem extends TreeItem {
    public connectionString: string;

    constructor(deviceId: string, connectionString: string, iconPath: string) {
        super(deviceId);
        this.connectionString = connectionString;
        this.iconPath = iconPath;
    }
}
