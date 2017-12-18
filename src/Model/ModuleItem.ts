import { Command, TreeItem } from "vscode";

export class ModuleItem extends TreeItem {
    constructor(
        public readonly deviceId: string,
        public readonly moduleId: string,
        public readonly runtimeStatus: string,
        public readonly iconPath: string) {
        super(runtimeStatus ? `${moduleId} (${runtimeStatus})` : moduleId);
        this.contextValue = "module";
    }
}
