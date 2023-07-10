/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from "@microsoft/vscode-azext-utils";
import { localize } from "../../../localize";
import { ParsedInput } from "../../../templates/script/parseScriptTemplatesV2";
import { FunctionWizardV2Context } from "../FunctionV2WizardContext";

export abstract class PromptSchemaBaseStep<T extends FunctionWizardV2Context> extends AzureWizardPromptStep<T> {

    public constructor(readonly input: ParsedInput) {
        super();
    }

    public async prompt(context: T): Promise<void> {
        context[this.input.assignTo] = await this.promptAction(context);
    }

    protected abstract promptAction(context: T): Promise<unknown>;

    protected validateInput(input: string | undefined): string | undefined {
        if (!input && this.input.required) {
            return localize('promptV2StepEmpty', 'The input cannot be empty.');
        }

        const validators = this.input.validators || [];
        for (const validator of validators) {
            if (input) {
                if (new RegExp(validator.expression).test(input)) {
                    return validator.errorText;
                }
            }
        }

        // special case for existingfile/new file

        return undefined;
    }

    public shouldPrompt(context: T): boolean {
        return !context[this.input.assignTo];
    }

    // value used to determine the prompt (string = input, boolean/enum = quickpick)
    // if required is false, then add a skip for now (for quickpick only)

    // resource types
    // Existingfile needs to open a file dialog


}
