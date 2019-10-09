// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ExtensionContext } from "vscode";
import { AzExtTreeDataProvider } from "vscode-azureextensionui";

/**
 * Common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */

export class ExtensionVariables {
   public static dpsExtTreeDataProvider: AzExtTreeDataProvider;
   public static vscodeContext: ExtensionContext;
};
