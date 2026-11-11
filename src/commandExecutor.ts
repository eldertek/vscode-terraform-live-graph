import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';

export default class CommandExecutor {
    private static async executeCommand(command: string, args: string, workingDirectory?: string, stdin?: string): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        const cwd = workingDirectory || process.cwd();
        const argList = args.split(' ').filter(Boolean);
        const childProcess: ChildProcess = spawn(command, argList, {
            cwd,
            shell: process.platform === 'win32'
        });

        let stdoutData = '';
        let stderrData = '';
        let hasError = false;

        if (childProcess.stdin) {
            childProcess.stdin.on('error', () => {
                // Ignore EPIPE errors if child process exited early
            });
            if (typeof stdin === 'string' && stdin.length > 0) {
                try {
                    childProcess.stdin.write(stdin);
                    childProcess.stdin.end();
                } catch {
                    // Handled by child process error listener
                }
            } else {
                childProcess.stdin.end();
            }
        }

        if (childProcess.stdout) {
            childProcess.stdout.on('data', (data) => {
                stdoutData += data.toString();
            });
        }
        
        if (childProcess.stderr) {
            childProcess.stderr.on('data', (data) => {
                stderrData += data.toString();
            });
        }

        childProcess.on('error', (error: any) => {
            hasError = true;
            let friendlyMessage = error?.message || String(error);
            if (error?.code === 'ENOENT' || error?.message?.includes('ENOENT')) {
                if (command === 'terraform') {
                    friendlyMessage = 'Terraform executable was not found. Please ensure Terraform is installed and in your PATH.';
                } else if (command === 'dot') {
                    friendlyMessage = 'Graphviz ("dot") executable was not found. Please ensure Graphviz is installed and in your PATH.';
                }
            }
            vscode.window.showErrorMessage(friendlyMessage);
            reject(new Error(friendlyMessage));
        });

        childProcess.on('close', (code) => {
            if (hasError) {
                return;
            }
            if (code === 0) {
                resolve(stdoutData.trim());
            } else {
                const message = stderrData.trim() || `Command "${command}" exited with code ${code}`;
                vscode.window.showErrorMessage(message);
                reject(new Error(message));
            }
        });
      });
    }

    public static async executeTerraformGraphCommand(workspaceFolder: string | undefined): Promise<string> {
        return await this.executeCommand('terraform', 'graph', workspaceFolder);
    }

    public static async executeDotGraphCommand(graphData: string): Promise<string> {
        if (!graphData || typeof graphData !== 'string') {
            throw new Error('No graph data received from Terraform.');
        }
        return await this.executeCommand('dot', '-Tsvg', undefined, graphData);
    }
}

