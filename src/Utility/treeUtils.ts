// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as path from "path";
import { TreeItemIconPath } from "vscode-azureextensionui";
import { ExtensionVariables } from "./extensionVariables";

export class TreeUtils {

    public static getIconPath(iconName: string): string {
        return path.join(this.getResourcesPath(), `${iconName}.svg`);
    }

    public static getThemedIconPath(iconName: string): TreeItemIconPath {
        return {
            light: path.join(this.getResourcesPath(), "light", `${iconName}.svg`),
            dark: path.join(this.getResourcesPath(), "dark", `${iconName}.svg`),
        };
    }

    private static getResourcesPath(): string {
        return ExtensionVariables.vscodeContext.asAbsolutePath("resources");
    }
}
