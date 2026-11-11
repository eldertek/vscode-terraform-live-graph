import * as vscode from 'vscode';
import CommandExecutor from './commandExecutor';

export default class VSCodeTerraformGraph {
    public static async graphExecutionWrapper(workspaceFolder: string | undefined, graphWebviewPanel: vscode.WebviewPanel): Promise<void> {
        if (!workspaceFolder) {
          vscode.window.showErrorMessage('No workspace folder found.');
          return;
        }
        await this.updateWebviewContent(workspaceFolder, graphWebviewPanel);

        this.registerFileWatcher(workspaceFolder, graphWebviewPanel);
    }

    private static registerFileWatcher(workspaceFolder: string | undefined, graphWebviewPanel: vscode.WebviewPanel): void {
        const fileWatcher = vscode.workspace.createFileSystemWatcher("**/*.tf");
        const update = async () => {
          await this.updateWebviewContent(workspaceFolder, graphWebviewPanel);
        };

        const sub1 = fileWatcher.onDidChange(update);
        const sub2 = fileWatcher.onDidCreate(update);
        const sub3 = fileWatcher.onDidDelete(update);

        graphWebviewPanel.onDidDispose(() => {
          sub1.dispose();
          sub2.dispose();
          sub3.dispose();
          fileWatcher.dispose();
        });
    }
    
    private static async updateWebviewContent(workspaceFolder: string | undefined, graphWebviewPanel: vscode.WebviewPanel): Promise<void> {
      try {
        graphWebviewPanel.webview.html = await this.getWebviewContent(workspaceFolder);
      } catch (err: any) {
        graphWebviewPanel.webview.html = this.buildErrorHTML(err?.message || String(err));
      }
    }

    private static async getWebviewContent(workspaceFolder: string | undefined): Promise<string> {
      const graphData = await CommandExecutor.executeTerraformGraphCommand(workspaceFolder);
      const dotSvg = await CommandExecutor.executeDotGraphCommand(graphData);
      return this.buildWebViewHTML(dotSvg);
    }

    private static buildWebViewHTML(svgGraph: string) : string {
      svgGraph = svgGraph.replace(/width=\"[0-9]+pt\"/, "width=\"100%\"");
      const webpage = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Terraform Live Graph</title>
            <style>
              body {
                margin: 0;
                padding: 16px;
                display: flex;
                justify-content: center;
                align-items: flex-start;
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
                overflow: auto;
              }
              svg {
                max-width: 100%;
                height: auto;
              }
            </style>
        </head>
        <body>
          ${svgGraph}
        </body>
        </html>`;

      return webpage;
    }

    private static buildErrorHTML(errorMessage: string): string {
      return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Terraform Live Graph Error</title>
            <style>
              body {
                font-family: var(--vscode-font-family);
                padding: 24px;
                color: var(--vscode-errorForeground, #f48771);
                background-color: var(--vscode-editor-background);
              }
              h3 { margin-top: 0; }
              pre {
                background-color: var(--vscode-textBlockQuote-background, rgba(127,127,127,0.1));
                padding: 12px;
                border-radius: 4px;
                overflow: auto;
                white-space: pre-wrap;
              }
            </style>
        </head>
        <body>
          <h3>Failed to generate Terraform Graph</h3>
          <pre>${errorMessage}</pre>
        </body>
        </html>`;
    }
}

