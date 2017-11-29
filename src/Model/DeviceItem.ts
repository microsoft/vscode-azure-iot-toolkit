import { Command, QuickPickItem, TreeItem } from "vscode";

export class DeviceItem extends TreeItem implements QuickPickItem {
    public readonly label: string;
    public readonly description: string;
    constructor(
        public readonly deviceId: string,
        public readonly connectionString: string,
        public readonly iconPath: string,
        public readonly command: Command) {
        super(deviceId);
        this.contextValue = "device";
        this.label = deviceId;
    }
}
