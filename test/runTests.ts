/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { resolve } from "path";

import { runTests } from "@vscode/test-electron";

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = resolve(__dirname, "../../");

        // The path to the extension test script
        // Passed to --extensionTestsPath
        const extensionTestsPath = resolve(__dirname, ".");

        // Download VS Code, unzip it and run the integration test
        // Pinned below 1.110 on macOS: @vscode/test-electron 2.x can't launch the renamed binary in newer builds.
        await runTests({
            version: process.platform === "darwin" ? "1.109.5" : undefined,
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: ["--disable-extensions"],
        });
    } catch (err) {
        // tslint:disable-next-line: no-console
        console.error("Failed to run tests");
        process.exit(1);
    }
}

main();