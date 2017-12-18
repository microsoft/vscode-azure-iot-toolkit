import { Command, QuickPickItem, TreeItem } from "vscode";

export class DeviceItem extends TreeItem implements QuickPickItem {
    constructor(
        public readonly deviceId: string,
        public readonly connectionString: string,
        public iconPath: string,
        public command: Command,
        public readonly connectionState: string,
        public readonly description: string) {
        super(deviceId);
        this.contextValue = "device";
    }
}
