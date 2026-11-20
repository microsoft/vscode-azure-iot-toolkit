// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { readdir, readFile } from "fs/promises";
import { join } from "path";
import {
    ActivityBar,
    BottomBarPanel,
    By,
    Key,
    TreeItem,
    VSBrowser,
    WebElement,
} from "vscode-extension-tester";

function getRequiredEnvironmentVariable(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required.`);
    }
    return value;
}

async function waitForValue<T>(
    description: string,
    action: () => Promise<T | undefined>,
    timeout: number = 60 * 1000,
): Promise<T> {
    const deadline = Date.now() + timeout;
    let lastError: unknown;

    while (Date.now() < deadline) {
        try {
            const value = await action();
            if (value !== undefined) {
                return value;
            }
        } catch (err) {
            lastError = err;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const errorDetail = lastError instanceof Error ? ` Last error: ${lastError.message}` : "";
    throw new Error(`Timed out waiting for ${description}.${errorDetail}`);
}

async function waitForConnectionStringInput(): Promise<WebElement> {
    return await waitForValue(
        "IoT Hub connection string input",
        async () => {
            const widgets = await VSBrowser.instance.driver.findElements(By.css(".quick-input-widget"));
            for (const widget of widgets) {
                if (!await widget.isDisplayed()) {
                    continue;
                }
                for (const input of await widget.findElements(By.css(".monaco-inputbox input"))) {
                    if (await input.isDisplayed() &&
                        (await input.getAttribute("placeholder")).startsWith("HostName=")) {
                        return input;
                    }
                }
            }
            return undefined;
        },
    );
}

async function hasSuccessfulDeviceOutput(deviceId: string): Promise<boolean> {
    const logsRoot = join(getRequiredEnvironmentVariable("VSCODE_UI_TEST_STORAGE"), "settings", "logs");
    let files: string[];
    try {
        files = await readdir(logsRoot, { recursive: true, encoding: "utf8" });
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
            return false;
        }
        throw err;
    }
    for (const file of files.filter((path) => path.endsWith("Azure IoT Hub.log"))) {
        const output = await readFile(join(logsRoot, file), "utf8");
        if (output.includes("[Device] [Get][Success]") &&
            output.includes(`"deviceId": "${deviceId}"`)) {
            return true;
        }
    }
    return false;
}

describe("Packaged VSIX UI Integration Test", () => {
    it("should get a fresh IoT Hub device through the Explorer UI", async function () {
        this.timeout(3 * 60 * 1000);
        const deviceId = getRequiredEnvironmentVariable("IOT_DEVICE_ID");
        const iotHubConnectionString = getRequiredEnvironmentVariable("IOT_HUB_CONNECTION_STRING");

        const explorerControl = await waitForValue(
            "Explorer view control",
            async () => await new ActivityBar().getViewControl("Explorer"),
        );
        const explorerView = await explorerControl.openView();
        const deviceSection = await waitForValue(
            "Azure IoT Hub Explorer section",
            async () => await explorerView.getContent().getSection("Azure IoT Hub"),
        );
        await deviceSection.expand();
        const setConnectionString = await waitForValue(
            "Set IoT Hub Connection String tree item",
            async () => await deviceSection.findItem("-> Set IoT Hub Connection String", 1),
        );
        await setConnectionString.click();

        const input = await waitForConnectionStringInput();
        await VSBrowser.instance.driver.executeScript(
            "arguments[0].type = 'password'; arguments[0].focus();",
            input,
        );
        await input.sendKeys(Key.chord(Key.CONTROL, "a"), iotHubConnectionString);
        await input.sendKeys(Key.ENTER);

        const connectedSection = await waitForValue(
            "connected Azure IoT Hub Explorer section",
            async () => await explorerView.getContent().getSection("Azure IoT Hub"),
        );
        await connectedSection.expand();

        const devicesItem = await waitForValue(
            "Devices tree item",
            async () => await connectedSection.findItem("Devices", 1) as TreeItem | undefined,
        );
        await devicesItem.expand();

        const deviceItem = await waitForValue(
            `device ${deviceId}`,
            async () => await devicesItem.findChildItem(deviceId),
        );

        const contextMenu = await deviceItem.openContextMenu();
        const getDeviceInfo = await waitForValue(
            "Get Device Info context menu item",
            async () => await contextMenu.getItem("Get Device Info"),
        );
        await getDeviceInfo.select();

        const bottomBar = new BottomBarPanel();
        try {
            const outputView = await bottomBar.openOutputView();
            await outputView.selectChannel("Azure IoT Hub");
            await waitForValue(
                "successful Get Device output",
                async () => await hasSuccessfulDeviceOutput(deviceId) ? true : undefined,
            );
        } finally {
            await bottomBar.closePanel();
        }
    });
});
