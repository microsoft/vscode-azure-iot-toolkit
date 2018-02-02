"use strict";
import { getLocation, Location, parse } from "jsonc-parser";
import * as vscode from "vscode";

export class JsonCompletionItemProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.CompletionItem[]> {
        const location: Location = getLocation(document.getText(), document.offsetAt(position));
        const range: vscode.Range = document.getWordRangeAtPosition(position) || new vscode.Range(position, position);
        if (location.path[0] === "moduleContent" && location.path[1] === "$edgeHub" && location.path[2] === "properties.desired" && location.path[3] === "routes") {
            const json = parse(document.getText());
            const modules: any = ((json.moduleContent.$edgeAgent || {})["properties.desired"] || {}).modules || {};
            const moduleIds: string[] = Object.keys(modules);

            const routeCompletionItem: vscode.CompletionItem = new vscode.CompletionItem("edgeRoute");
            routeCompletionItem.filterText = "\"edgeRoute\"";
            routeCompletionItem.kind = vscode.CompletionItemKind.Snippet;
            routeCompletionItem.detail = "Route for the Edge Hub. Route name is used as the key for the route. To delete a route, set the route name as null";
            routeCompletionItem.range = range;
            routeCompletionItem.insertText = new vscode.SnippetString(this.getRouteSnippetString(moduleIds));
            return [routeCompletionItem];
        }

        if (location.path[0] === "moduleContent" && location.path[1] === "$edgeAgent" && location.path[2] === "properties.desired" && location.path[3] === "modules") {
            const moduleCompletionItem = new vscode.CompletionItem("edgeModule");
            moduleCompletionItem.filterText = "\"edgeModule\"";
            moduleCompletionItem.kind = vscode.CompletionItemKind.Snippet;
            moduleCompletionItem.detail = "Module for edgeAgent to start";
            moduleCompletionItem.range = range;
            moduleCompletionItem.insertText = new vscode.SnippetString([
                "\"${1:SampleModule}\": {",
                "\t\"version\": \"${2:1.0}\",",
                "\t\"type\": \"docker\",",
                "\t\"status\": \"${3|running,stopped|}\",",
                "\t\"restartPolicy\": \"${4|always,never,on-failed,on-unhealthy|}\",",
                "\t\"settings\": {",
                "\t\t\"image\": \"${5:<registry>}/${6:<image>}:${7:<tag>}\",",
                "\t\t\"createOptions\": \"${8:{}}\"",
                "\t}",
                "}",
            ].join("\n"));
            return [moduleCompletionItem];
        }
    }

    private getRouteSnippetString(moduleIds: string[]): string {
        const snippet: string[] = ["\"${1:route}\":", "\"FROM"];

        const sources: string[] = ["${2|/*", "/messages/*", "/messages/modules/*"];
        if (moduleIds.length === 0) {
            sources.push(`/messages/modules/{moduleId}/*`);
            sources.push(`/messages/modules/{moduleId}/outputs/*`);
            sources.push(`/messages/modules/{moduleId}/outputs/{output}`);
        } else {
            for (const moduleId of moduleIds) {
                sources.push(`/messages/modules/${moduleId}/*`);
            }
            for (const moduleId of moduleIds) {
                sources.push(`/messages/modules/${moduleId}/outputs/*`);
            }
            for (const moduleId of moduleIds) {
                sources.push(`/messages/modules/${moduleId}/outputs/{output}`);
            }
        }

        snippet.push(sources.join(",") + "|}");
        snippet.push("WHERE ${3:<condition>} INTO");

        const sinks: string[] = ["${4|$upstream"];
        if (moduleIds.length === 0) {
            sinks.push(`BrokeredEndpoint(\\"/modules/{moduleId}/inputs/{input}\\")`);
        } else {
            for (const moduleId of moduleIds) {
                sinks.push(`BrokeredEndpoint(\\"/modules/${moduleId}/inputs/{input}\\")`);
            }
        }

        snippet.push(sinks.join(",") + "|}\"");

        return snippet.join(" ");
    }

}
