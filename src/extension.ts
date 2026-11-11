import * as path from 'path';
import * as vscode from 'vscode';
import VSCodeTerraformGraph from './vscodeTerrafromGraph';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('terraform-live-graph.generateGraphView', async () => {
		let workspaceFolderPath: string | undefined;

		const activeDoc = vscode.window.activeTextEditor?.document;
		if (activeDoc && (activeDoc.uri.scheme === 'file' || activeDoc.fileName.endsWith('.tf'))) {
			const folder = vscode.workspace.getWorkspaceFolder(activeDoc.uri);
			workspaceFolderPath = folder ? folder.uri.fsPath : path.dirname(activeDoc.uri.fsPath);
		} else if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
			workspaceFolderPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
		}

		if (!workspaceFolderPath) {
			vscode.window.showWarningMessage('Please open a folder or Terraform (.tf) file to view the live graph.');
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			'tfGraphView',
			'Terraform Live Graph',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);

		await VSCodeTerraformGraph.graphExecutionWrapper(workspaceFolderPath, panel);
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
