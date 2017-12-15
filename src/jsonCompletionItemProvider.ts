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

            const completionItem: vscode.CompletionItem = new vscode.CompletionItem("edgeRoute");
            completionItem.filterText = "\"edgeRoute\"";
            completionItem.kind = vscode.CompletionItemKind.Snippet;
            completionItem.detail = "Route for the Edge Hub. Route name is used as the key for the route. To delete a route, set the route name as null";
            completionItem.range = range;
            completionItem.insertText = new vscode.SnippetString(this.getSnippetString(moduleIds));
            return [completionItem];
        }
    }

    private getSnippetString(moduleIds: string[]): string {
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
            sinks.push(`BrokeredEndpoint(/modules/{moduleId}/inputs/{input})`);
        } else {
            for (const moduleId of moduleIds) {
                sinks.push(`BrokeredEndpoint(/modules/${moduleId}/inputs/{input})`);
            }
        }

        snippet.push(sinks.join(",") + "|}\"");

        return snippet.join(" ");
    }

}
