import { SubscriptionModels } from "azure-arm-resource";
import { QuickPickItem } from "vscode";

export class LocationItem implements QuickPickItem {
    public readonly label: string;
    public readonly description: string;
    constructor(public readonly location: SubscriptionModels.Location) {
        this.label = location.displayName;
        this.description = location.name;
    }
}
