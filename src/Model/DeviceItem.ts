import { Command, QuickPickItem, TreeItem } from "vscode";

export class DeviceItem extends TreeItem implements QuickPickItem {
    constructor(
        public readonly deviceId: string,
        public readonly connectionString: string,
        public readonly iconPath: string,
        public readonly command: Command,
        public readonly description: string) {
        super(deviceId);
        this.contextValue = "device";
    }
}
