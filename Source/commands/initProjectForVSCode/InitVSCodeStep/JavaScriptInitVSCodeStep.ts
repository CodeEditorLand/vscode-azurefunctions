/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import { AzExtFsExtra } from "@microsoft/vscode-azext-utils";
import { type DebugConfiguration, type TaskDefinition } from "vscode";

import {
	extInstallTaskName,
	func,
	hostStartCommand,
	hostStartTaskName,
	packageJsonFileName,
	type ProjectLanguage,
} from "../../../constants";
import { nodeDebugConfig } from "../../../debug/NodeDebugProvider";
import { getFuncWatchProblemMatcher } from "../../../vsCodeConfig/settings";
import { convertToFunctionsTaskLabel } from "../../../vsCodeConfig/tasks";
import { type IProjectWizardContext } from "../../createNewProject/IProjectWizardContext";
import { ScriptInitVSCodeStep } from "./ScriptInitVSCodeStep";

const npmInstallTaskLabel: string = convertToFunctionsTaskLabel("npm install");

const npmPruneTaskLabel: string = convertToFunctionsTaskLabel("npm prune");

export class JavaScriptInitVSCodeStep extends ScriptInitVSCodeStep {
	private hasPackageJson: boolean;

	protected async executeCore(context: IProjectWizardContext): Promise<void> {
		await super.executeCore(context);

		this.hasPackageJson = await AzExtFsExtra.pathExists(
			path.join(context.projectPath, packageJsonFileName),
		);

		if (this.hasPackageJson) {
			this.preDeployTask = npmPruneTaskLabel;

			this.settings.push({
				key: "postDeployTask",
				value: npmInstallTaskLabel,
			});
		}
	}

	protected getDebugConfiguration(): DebugConfiguration {
		return nodeDebugConfig;
	}

	protected getTasks(language: ProjectLanguage): TaskDefinition[] {
		if (!this.hasPackageJson) {
			return super.getTasks(language);
		} else {
			return [
				{
					type: func,
					label: hostStartTaskName,
					command: hostStartCommand,
					problemMatcher: getFuncWatchProblemMatcher(language),
					isBackground: true,
					dependsOn: this.useFuncExtensionsInstall
						? [extInstallTaskName, npmInstallTaskLabel]
						: npmInstallTaskLabel,
				},
				{
					type: "shell",
					label: npmInstallTaskLabel,
					command: "npm install",
				},
				{
					type: "shell",
					label: npmPruneTaskLabel,
					command: "npm prune --production", // This removes dev dependencies, but importantly also installs prod dependencies
					dependsOn: this.useFuncExtensionsInstall
						? extInstallTaskName
						: undefined,
					problemMatcher: [],
				},
			];
		}
	}
}
