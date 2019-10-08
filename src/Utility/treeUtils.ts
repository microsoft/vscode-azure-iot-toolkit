// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as path from 'path';
import { TreeItemIconPath } from "vscode-azureextensionui";
import { ExtensionVariables } from "./extensionVariables";

export namespace TreeUtils {

    export function getIconPath(iconName: string): string {
        return path.join(getResourcesPath(), `${iconName}.svg`);
    }

    export function getThemedIconPath(iconName: string): TreeItemIconPath {
        return {
            light: path.join(getResourcesPath(), 'light', `${iconName}.svg`),
            dark: path.join(getResourcesPath(), 'dark', `${iconName}.svg`)
        }
    }

    function getResourcesPath(): string {
        return ExtensionVariables.vscodeContext.asAbsolutePath('resources');
    }
}