// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as path from "path";
import { TreeItemIconPath } from "vscode-azureextensionui";
import { Constants } from "../constants";

export class TreeUtils {

    public static getIconPath(iconName: string): string {
        return path.join(Constants.ResourcesFolderPath, `${iconName}.svg`);
    }

    public static getThemedIconPath(iconName: string): TreeItemIconPath {
        return {
            light: path.join(Constants.ResourcesFolderPath, "light", `${iconName}.svg`),
            dark: path.join(Constants.ResourcesFolderPath, "dark", `${iconName}.svg`),
        };
    }
}
