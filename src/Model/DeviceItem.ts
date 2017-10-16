import { Command, TreeItem } from "vscode";

export class DeviceItem extends TreeItem {
    constructor(
        public readonly deviceId: string,
        public readonly connectionString: string,
        public readonly iconPath: string,
        public readonly command: Command) {
        super(deviceId);
        this.contextValue = "device";
    }
}
