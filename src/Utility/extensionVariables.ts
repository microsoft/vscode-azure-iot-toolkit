// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ExtensionContext } from "vscode";
import { AzExtTreeDataProvider } from 'vscode-azureextensionui';

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */

export namespace ExtensionVariables {
   export let dpsExtTreeDataProvider: AzExtTreeDataProvider;
   export let vscodeContext: ExtensionContext
}