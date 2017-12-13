import { SubscriptionModels } from "azure-arm-resource";
import { QuickPickItem } from "vscode";
import { IotHubDescription } from "../../node_modules/azure-arm-iothub/lib/models";

export class LocationItem implements QuickPickItem {
    public readonly label: string;
    public readonly description: string;
    constructor(public readonly location: SubscriptionModels.Location) {
        this.label = location.displayName;
        this.description = location.name;
    }
}
