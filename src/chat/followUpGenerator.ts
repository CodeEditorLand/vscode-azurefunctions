/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { getResponseAsStringCopilotInteraction, getStringFieldFromCopilotResponseMaybeWithStrJson } from "./copilotInteractions";
import { WellKnownFunctionProjectLanguage, WellKnownTemplate, getWellKnownCSharpTemplate, getWellKnownTypeScriptTemplate, isWellKnownFunctionProjectLanguage, wellKnownCSharpTemplateDisplayNames, wellKnownTypeScriptTemplateDisplayNames } from "./wellKnownThings";

/**
 * Generates all types of follow ups for the given copilot response. This currently includes:
 * - Creating a function project
 *
 * Todo:
 * - Deploying a function project
 * - Creating a function app
 */
export async function generateGeneralFollowUps(userContent: string, copilotContent: string, ctx: vscode.ChatAgentContext, progress: vscode.Progress<vscode.InteractiveProgress>, token: vscode.CancellationToken): Promise<vscode.InteractiveSessionReplyFollowup[]> {
    try {
        const createFunctionProjectFollowUpsPromise = (async () => {
            const createFunctionProjectFollowUps: vscode.InteractiveSessionReplyFollowup[] = [];
            const functionProjectionSuggestion = await wasCreatingFunctionProjectSuggestedSeparateInference(userContent, copilotContent, ctx, progress, token);
            if (functionProjectionSuggestion !== false) {
                if (functionProjectionSuggestion.language !== undefined && functionProjectionSuggestion.template !== undefined) {
                    createFunctionProjectFollowUps.push({ message: `@azure-functions create a project using the ${functionProjectionSuggestion.language} ${functionProjectionSuggestion.template} template` });
                } else if (functionProjectionSuggestion.language !== undefined) {
                    createFunctionProjectFollowUps.push({ message: `@azure-functions create a ${functionProjectionSuggestion.language} project` });
                } else if (functionProjectionSuggestion.template !== undefined) {
                    if (getWellKnownCSharpTemplate(functionProjectionSuggestion.template)) {
                        createFunctionProjectFollowUps.push({ message: `@azure-functions create a project using the C# ${functionProjectionSuggestion.template} template` });
                    }
                    if (getWellKnownTypeScriptTemplate(functionProjectionSuggestion.template)) {
                        createFunctionProjectFollowUps.push({ message: `@azure-functions create a project using the TypeScript ${functionProjectionSuggestion.template} template` });
                    }
                }
            }
            return createFunctionProjectFollowUps;
        })();

        const createFunctionAppFollowUpsPromise = (async () => {
            const createFunctionAppFollowUps: vscode.InteractiveSessionReplyFollowup[] = [];
            // const functionAppSuggestion = await wasCreatingFunctionAppSuggested(copilotContent, ctx, progress, token);
            return createFunctionAppFollowUps;
        })();

        return [
            ...await createFunctionProjectFollowUpsPromise,
            ...await createFunctionAppFollowUpsPromise
        ];
    } catch (e) {
        console.log(e);
        return [];
    }
}

/**
 * Given a function project language and a template for that language, attempts to generate follow ups that use similar templates for other languages.
 */
export async function generateAlternativeCreateFunctionProjectFollowUps(language?: WellKnownFunctionProjectLanguage, template?: WellKnownTemplate): Promise<vscode.InteractiveSessionReplyFollowup[]> {
    const result: vscode.InteractiveSessionReplyFollowup[] = [];
    if (language !== undefined && template !== undefined) {
        if (language === "C#" && getWellKnownTypeScriptTemplate(template)) {
            result.push({ message: `@azure-functions create a project using the TypeScript ${template} template` });
        }
        if (language === "TypeScript" && getWellKnownCSharpTemplate(template)) {
            result.push({ message: `@azure-functions create a project using the C# ${template} template` });
        }
    }
    return result;
}

/**
 * Given a copilot response, determines if the response suggests creating a function project. If so, returns the language and template suggested for the project. If not, returns false.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function wasCreatingFunctionProjectSuggestedCombinedInference(copilotContent: string, _ctx: vscode.ChatAgentContext, progress: vscode.Progress<vscode.InteractiveProgress>, token: vscode.CancellationToken): Promise<false | { language: WellKnownFunctionProjectLanguage | undefined, template: WellKnownTemplate | undefined }> {
    const maybeJsonCopilotResponse = await getResponseAsStringCopilotInteraction(wasCreatingFunctionProjectSuggestedCombinedInferenceSystemPrompt1, copilotContent, progress, token);

    const copilotDeterminedLanguage = getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, "language");
    const copilotDeterminedTemplate = getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, "template");

    if (copilotDeterminedLanguage === undefined && copilotDeterminedTemplate === undefined) {
        return false;
    }

    const wellKnownCSharpTemplate = getWellKnownCSharpTemplate(copilotDeterminedTemplate);
    const wellKnownTypeScriptTemplate = getWellKnownTypeScriptTemplate(copilotDeterminedTemplate);
    if (isWellKnownFunctionProjectLanguage(copilotDeterminedLanguage)) {
        if (copilotDeterminedLanguage === "C#" && wellKnownCSharpTemplate !== undefined) {
            return { language: copilotDeterminedLanguage, template: wellKnownCSharpTemplate };
        } else if (copilotDeterminedLanguage === "TypeScript" && wellKnownTypeScriptTemplate !== undefined) {
            return { language: copilotDeterminedLanguage, template: wellKnownTypeScriptTemplate };
        } else {
            return { language: copilotDeterminedLanguage, template: undefined };
        }
    } else if (wellKnownCSharpTemplate !== undefined || wellKnownTypeScriptTemplate !== undefined) {
        return { language: undefined, template: wellKnownCSharpTemplate ?? wellKnownTypeScriptTemplate };
    }
    return false;
}

/**
 * Given a copilot response, determines if the response suggests creating a function project. If so, returns the language and template suggested for the project. If not, returns false.
 */
async function wasCreatingFunctionProjectSuggestedSeparateInference(userContent: string, copilotContent: string, _ctx: vscode.ChatAgentContext, progress: vscode.Progress<vscode.InteractiveProgress>, token: vscode.CancellationToken): Promise<false | { language: WellKnownFunctionProjectLanguage | undefined, template: WellKnownTemplate | undefined }> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/no-explicit-any, no-async-promise-executor
    const copilotDeterminedLanguageFromUserContent = await new Promise<string | undefined>(async (resolve) => {
        const maybeJsonCopilotResponseLanguage = await getResponseAsStringCopilotInteraction(determineBestLanguageForUserSystemPrompt1, userContent, progress, token);
        resolve(getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponseLanguage, "language"));
    });
    // eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/no-explicit-any, no-async-promise-executor
    const copilotDeterminedLanguageFromCopilotContent = await new Promise<string | undefined>(async (resolve) => {
        const maybeJsonCopilotResponseLanguage = await getResponseAsStringCopilotInteraction(wasCreatingFunctionProjectSuggestedInferLanguageSystemPrompt1, copilotContent, progress, token);
        resolve(getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponseLanguage, "language"));
    });
    const copilotDeterminedTemplate =
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/no-explicit-any, no-async-promise-executor
        (await new Promise<string | undefined>(async (resolve) => {
            const maybeJsonCopilotResponseLanguage = await getResponseAsStringCopilotInteraction(wasCreatingFunctionProjectSuggestedInferTemplateSystemPrompt2(wellKnownTypeScriptTemplateDisplayNames), copilotContent, progress, token);
            resolve(getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponseLanguage, "template"));
        }))
        ??
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/no-explicit-any, no-async-promise-executor
        (await new Promise<string | undefined>(async (resolve) => {
            const maybeJsonCopilotResponseLanguage = await getResponseAsStringCopilotInteraction(wasCreatingFunctionProjectSuggestedInferTemplateSystemPrompt2(wellKnownCSharpTemplateDisplayNames), copilotContent, progress, token);
            resolve(getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponseLanguage, "template"));
        }));


    if (copilotDeterminedLanguageFromUserContent === undefined && copilotDeterminedLanguageFromCopilotContent === undefined && copilotDeterminedTemplate === undefined) {
        return false;
    }

    let languageToUse: WellKnownFunctionProjectLanguage | undefined = undefined;
    if (isWellKnownFunctionProjectLanguage(copilotDeterminedLanguageFromUserContent)) {
        languageToUse = copilotDeterminedLanguageFromUserContent;
    } else if (isWellKnownFunctionProjectLanguage(copilotDeterminedLanguageFromCopilotContent)) {
        languageToUse = copilotDeterminedLanguageFromCopilotContent;
    }

    const wellKnownCSharpTemplate = getWellKnownCSharpTemplate(copilotDeterminedTemplate);
    const wellKnownTypeScriptTemplate = getWellKnownTypeScriptTemplate(copilotDeterminedTemplate);
    if (languageToUse) {
        if (languageToUse === "C#" && wellKnownCSharpTemplate !== undefined) {
            return { language: languageToUse, template: wellKnownCSharpTemplate };
        } else if (languageToUse === "TypeScript" && wellKnownTypeScriptTemplate !== undefined) {
            return { language: languageToUse, template: wellKnownTypeScriptTemplate };
        }
    }

    if (wellKnownCSharpTemplate !== undefined || wellKnownTypeScriptTemplate !== undefined) {
        return { language: undefined, template: wellKnownCSharpTemplate ?? wellKnownTypeScriptTemplate };
    }

    if (languageToUse !== undefined) {
        return { language: languageToUse, template: undefined };
    }

    return false;
}

const wasCreatingFunctionProjectSuggestedCombinedInferenceSystemPrompt1 = `You are an expert in Azure Functions development. Your job is to determine if the given text suggests creating a functions project, what language (TypeScript or C#) was suggested for or would be best for the project (if any), and what template was suggested or would be best for the project (if any). Only repsond with a JSON summary of information. Do not respond in a coverstaional tone, only JSON. If the text did not suggest creating a functions project, respond with an empty JSON object. If the text did suggest creating a function project, but a piece of information is unknown, than use the value "unknown" for its JSON field.

# Example 1

Text: For the problem you're asking about, you could create an Azure Functions project.
Result: { "language": "unknown", "template": "unknown" }

# Example 2

Text: You could base your project off of the Azure Functions extension TypeScript Blob Storage Trigger template.
Result: { "language": "TypeScript", "template": "BlobStorageTrigger" }

# Example 3

Text: For the problem you're asking about, you could create a C# Azure Functions project.
Result: { "language": "C#", "template": "unknown" }

# Example 4

Text: You will then want to deploy your project to an Azure Function App resource.
Result: { }

# Example 5

Text: You could base your project off of the Azure Functions extension C# queue trigger template.
Result: { "language": "C#", "template": "QueueTrigger" }
`;

const determineBestLanguageForUserSystemPrompt1 = `You are an expert in all things programming. Your job is to determine what language the user might be most familiar with given the user's query. The available languages are: 'TypeScript' and 'C#'. Choose one of these languages as the best language. If you cannot determine a language, you can reply with 'unknown'. Only repsond with a JSON summary of the language you choose. Do not respond in a coverstaional tone, only JSON.

# Example 1

User: I want to create a new function project. I have experience in web development using React.JS.
Assistant: { "language": "TypeScript" }

# Example 2

User: My company is a enterprise .NET shop, but we've been wanting to try out Azure functions. Can you help me create a new function project?
Assistant: { "language": "C#" }

# Example 3

User: I want to create a new function project.
Assistant: { "language": "unknown" }
`;

const wasCreatingFunctionProjectSuggestedInferLanguageSystemPrompt1 = `You are an expert in Azure Functions development. Your job is to determine if the given text suggests doing something which could be accomplished by creating a functions project, and if so what language would be best for the such a project or the user. The available languages are TypeScript or C#. Only repsond with a JSON summary of the chosen language. Do not respond in a coverstaional tone, only JSON. If the text did not suggest doing something which could be accomplished by creating a functions project, respond with an empty JSON object. If the text did suggest doing something which could be accomplished by creating a functions project, but you could not determine a language, than use the value "unknown" for its JSON field.

# Example 1

Text: For the problem you're asking about, you could create an Azure Functions project.
Result: { "language": "unknown" }

# Example 2

Text: You could base your project off of the Azure Functions extension TypeScript Blob Storage Trigger template.
Result: { "language": "TypeScript" }

# Example 3

Text: For the problem you're asking about, you could create a C# Azure Functions project.
Result: { "language": "C#" }

# Example 4

Text: You will then want to deploy your project to an Azure Function App resource.
Result: { }

# Example 5

Text: You could base your project off of the Azure Functions extension C# queue trigger template.
Result: { "language": "C#" }
`;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const wasCreatingFunctionProjectSuggestedInferTemplateSystemPrompt1 = (availableTemplates: string[]) => `You are an expert in Azure Functions development. Your job is to determine if the given text suggests doing something which could be accomplished by creating a functions project, and if so what template would be best for the such a project. The available templates are: ${availableTemplates.map((t) => `'${t}'`).join(",")}. Choose one of these templates as the best template. Only repsond with a JSON summary of the chosen template. Do not respond in a coverstaional tone, only JSON. If the text did not suggest doing something which could be accomplished by creating a functions project, respond with an empty JSON object. If the text did suggest doing something which could be accomplished by creating a functions project, but you could not determine a template, than use the value "unknown" for its JSON field.

# Example 1

Text: For the problem you're asking about, you could create an Azure Functions project.
Result: { "template": "unknown" }

# Example 2

Text: You could base your project off of the Azure Functions extension TypeScript Blob Storage Trigger template.
Result: { "template": "AzureBlobStorageTrigger" }

# Example 3

Text: For the problem you're asking about, you could create a C# Azure Functions project.
Result: { "template": "unknown" }

# Example 4

Text: You will then want to deploy your project to an Azure Function App resource.
Result: { }

# Example 5

Text: You could base your project off of the Azure Functions extension C# queue trigger template.
Result: { "template": "AzureQueueStorageTrigger" }
`;

const wasCreatingFunctionProjectSuggestedInferTemplateSystemPrompt2 = (availableTemplates: string[]) => `You are an expert in Azure Functions development. Your job is to choose which of the available templates is most related to the given text. The available templates are: ${availableTemplates.map((t) => `'${t}'`).join(",")}. Only repsond with a JSON summary of the chosen template. Do not respond in a coverstaional tone, only JSON. If none of the templates are related to the given text, respond with an empty JSON object.

# Example 1

Text: For the problem you're asking about, you could create an Azure Functions project.
Result: { "template": "unknown" }

# Example 2

Text: You could base your project off of the Azure Functions extension TypeScript Blob Storage Trigger template.
Result: { "template": "AzureBlobStorageTrigger" }

# Example 3

Text: For the problem you're asking about, you could create a C# Azure Functions project.
Result: { "template": "unknown" }

# Example 4

Text: You will then want to deploy your project to an Azure Function App resource.
Result: { }

# Example 5

Text: You could base your project off of the Azure Functions extension C# queue trigger template.
Result: { "template": "AzureQueueStorageTrigger" }
`;


