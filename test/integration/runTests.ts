// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";

import { ExTester, logging, ReleaseQuality } from "vscode-extension-tester";

function getRequiredEnvironmentVariable(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required.`);
    }
    return value;
}

async function main() {
    const storageRoot = process.env.VSCODE_UI_TEST_STORAGE ?? join(tmpdir(), "vscode-iot-toolkit-ui");
    const extensionsDir = join(storageRoot, "extensions");
    const manifest = JSON.parse(
        await readFile(resolve(__dirname, "../../../package.json"), "utf8"),
    ) as { engines: { vscode: string } };
    const version = process.env.VSCODE_TEST_VERSION ?? manifest.engines.vscode.replace(/^[^\d]*/, "");
    const vsixPath = resolve(getRequiredEnvironmentVariable("VSIX_PATH"));
    const testFile = resolve(__dirname, "extension.test.js");
    const tester = new ExTester(storageRoot, ReleaseQuality.Stable, extensionsDir);

    delete process.env.EXTENSION_DEV_PATH;
    process.env.DONT_PROMPT_WSL_INSTALL = "1";
    process.env.VSCODE_UI_TEST_STORAGE = storageRoot;

    await rm(extensionsDir, { recursive: true, force: true });
    await tester.downloadCode(version);
    await tester.downloadChromeDriver(version);
    await tester.installVsix({ vsixFile: vsixPath });

    const exitCode = await tester.runTests(testFile, {
        vscodeVersion: version,
        resources: [],
        cleanup: true,
        logLevel: logging.Level.WARNING,
    });

    if (exitCode !== 0) {
        throw new Error(`Packaged VSIX UI integration test failed with exit code ${exitCode}.`);
    }
}

main().catch((err) => {
    console.error("Failed to run packaged VSIX UI integration test.", err);
    process.exit(1);
});
