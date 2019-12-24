// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";

import { commands, env, ExtensionContext, extensions, Uri, window } from "vscode";
import { Constants } from "./constants";
import { TelemetryClient } from "./telemetryClient";

const NSAT_SURVEY_URL = "https://www.surveymonkey.com/r/C9Y5M25";
const PROBABILITY = 1;
const SESSION_COUNT_THRESHOLD = 2;
const SESSION_COUNT_KEY = "nsat/sessionCount";
const LAST_SESSION_DATE_KEY = "nsat/lastSessionDate";
const TAKE_SURVEY_DATE_KEY = "nsat/takeSurveyDate";
const DONT_SHOW_DATE_KEY = "nsat/dontShowDate";
const SKIP_VERSION_KEY = "nsat/skipVersion";
const IS_CANDIDATE_KEY = "nsat/isCandidate";

export class NSAT {
    public static async takeSurvey({ globalState }: ExtensionContext) {
        const skipVersion = globalState.get(SKIP_VERSION_KEY, "");
        if (skipVersion) {
            return;
        }

        const date = new Date().toDateString();
        const lastSessionDate = globalState.get(LAST_SESSION_DATE_KEY, new Date(0).toDateString());

        if (date === lastSessionDate) {
            return;
        }

        const sessionCount = globalState.get(SESSION_COUNT_KEY, 0) + 1;
        await globalState.update(LAST_SESSION_DATE_KEY, date);
        await globalState.update(SESSION_COUNT_KEY, sessionCount);

        if (sessionCount < SESSION_COUNT_THRESHOLD) {
            return;
        }

        const isCandidate = globalState.get(IS_CANDIDATE_KEY, false)
            || Math.random() < PROBABILITY;

        await globalState.update(IS_CANDIDATE_KEY, isCandidate);

        const extensionVersion = extensions.getExtension(Constants.ExtensionId).packageJSON.version || "unknown";
        if (!isCandidate) {
            await globalState.update(SKIP_VERSION_KEY, extensionVersion);
            return;
        }

        const take = {
            title: "Take Survey",
            run: async () => {
                TelemetryClient.sendEvent("nsat.survey/takeShortSurvey");
                commands.executeCommand("vscode.open",
                    Uri.parse(
                        `${NSAT_SURVEY_URL}?o=${encodeURIComponent(process.platform)}&v=${encodeURIComponent(extensionVersion)}`));
                await globalState.update(IS_CANDIDATE_KEY, false);
                await globalState.update(SKIP_VERSION_KEY, extensionVersion);
                await globalState.update(TAKE_SURVEY_DATE_KEY, date);
            },
        };
        const remind = {
            title: "Remind Me Later",
            run: async () => {
                TelemetryClient.sendEvent("nsat.survey/remindMeLater");
                await globalState.update(SESSION_COUNT_KEY, 0);
            },
        };
        const never = {
            title: "Don't Show Again",
            run: async () => {
                TelemetryClient.sendEvent("nsat.survey/dontShowAgain");
                await globalState.update(IS_CANDIDATE_KEY, false);
                await globalState.update(SKIP_VERSION_KEY, extensionVersion);
                await globalState.update(DONT_SHOW_DATE_KEY, date);
            },
        };
        TelemetryClient.sendEvent("nsat.survey/userAsked");
        const button = await window.showInformationMessage("Do you mind taking a quick feedback survey about the Azure IoT Hub Extension for VS Code?", take, remind, never);
        await (button || remind).run();
    }
}
