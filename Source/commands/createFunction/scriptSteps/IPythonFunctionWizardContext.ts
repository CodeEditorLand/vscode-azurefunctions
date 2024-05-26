/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { IScriptFunctionWizardContext } from "./IScriptFunctionWizardContext";

export enum FunctionLocation {
	MainScript = 0,
	SelectedScript = 1,
	Document = 2,
}

export interface IPythonFunctionWizardContext
	extends IScriptFunctionWizardContext {
	functionLocation?: FunctionLocation;
	functionScript?: string;
}
