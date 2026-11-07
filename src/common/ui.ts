// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { UserCancelledError } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GUID_EXPECTED_MESSAGE = "Enter a GUID, for example 00000000-0000-0000-0000-000000000000.";

export interface IPromptOptions {
    prompt: string;
    placeHolder?: string;
    value?: string;
    requiredMessage?: string;
    validateInput?: (value: string) => string | undefined;
}

export function requireInput<T>(value: T | undefined): T {
    if (value === undefined) {
        throw new UserCancelledError();
    }
    return value;
}

export async function promptRequired(options: IPromptOptions): Promise<string> {
    const result = await vscode.window.showInputBox({
        prompt: options.prompt,
        placeHolder: options.placeHolder,
        value: options.value,
        ignoreFocusOut: true,
        validateInput: (input) => {
            const trimmed = input?.trim();
            if (!trimmed) {
                return options.requiredMessage ?? "A value is required.";
            }
            return options.validateInput ? options.validateInput(trimmed) : undefined;
        },
    });
    return requireInput(result).trim();
}

export async function promptOptional(options: IPromptOptions): Promise<string | undefined> {
    const result = await vscode.window.showInputBox({
        prompt: options.prompt,
        placeHolder: options.placeHolder,
        value: options.value,
        ignoreFocusOut: true,
        validateInput: (input) => {
            const trimmed = input?.trim();
            if (!trimmed || trimmed === options.value) {
                return undefined;
            }
            return options.validateInput ? options.validateInput(trimmed) : undefined;
        },
    });

    const trimmed = requireInput(result).trim();
    return !trimmed || trimmed === options.value ? undefined : trimmed;
}

export async function pickOne<T extends vscode.QuickPickItem>(
    items: T[],
    placeHolder: string,
    matchOnDescription = false,
): Promise<T> {
    const picked = await vscode.window.showQuickPick(items, { placeHolder, ignoreFocusOut: true, matchOnDescription });
    return requireInput(picked);
}

export async function confirmDestructiveAction(message: string, confirmLabel: string, detail?: string): Promise<void> {
    const choice = await vscode.window.showWarningMessage(message, { modal: true, detail }, confirmLabel);
    if (choice !== confirmLabel) {
        throw new UserCancelledError();
    }
}

export function validateGuid(value: string, label?: string): string | undefined {
    if (!value || value.trim() === "") {
        return label ? `${label} is required` : GUID_EXPECTED_MESSAGE;
    }
    if (!GUID_REGEX.test(value.trim())) {
        return label ? `${label} must be a GUID` : GUID_EXPECTED_MESSAGE;
    }
    return undefined;
}

export async function promptForGuid(prompt: string, label?: string, requiredMessage?: string): Promise<string> {
    return promptRequired({
        prompt,
        placeHolder: "00000000-0000-0000-0000-000000000000",
        requiredMessage,
        validateInput: (value) => validateGuid(value, label),
    });
}

export async function promptOptionalGuid(prompt: string, currentValue?: string): Promise<string | undefined> {
    return promptOptional({
        prompt,
        value: currentValue,
        validateInput: (value) => validateGuid(value),
    });
}

export async function withProgress<T>(title: string, task: () => Promise<T>): Promise<T> {
    return vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title, cancellable: false },
        async () => task(),
    );
}
