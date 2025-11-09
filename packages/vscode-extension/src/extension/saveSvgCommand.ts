import * as vscode from 'vscode';
import * as path from 'node:path';

interface ExportPayload {
    text: string;
    fileName: string;
}

type ExportResultMessage = {
    type: 'exportResult';
    requestId: number;
    svg: string;
};

type ExportErrorMessage = {
    type: 'exportError';
    requestId: number;
    message: string;
};

type ReadyMessage = {
    type: 'ready';
};

type IncomingMessage = ExportResultMessage | ExportErrorMessage | ReadyMessage;

interface Deferred<T> {
    resolve(value: T | PromiseLike<T>): void;
    reject(reason?: unknown): void;
}

export class EventModelSaveSvgCommand implements vscode.Disposable {
    private panel: vscode.WebviewPanel | undefined;
    private ready = false;
    private readyPromise: Promise<void> | undefined;
    private readyResolve: (() => void) | undefined;
    private readyReject: ((reason?: unknown) => void) | undefined;
    private requestId = 0;
    private readonly pendingRequests = new Map<number, Deferred<string>>();

    public constructor(private readonly context: vscode.ExtensionContext) {}

    public registerCommand(): vscode.Disposable {
        return vscode.commands.registerCommand('event-modeling.saveAsSvg', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                void vscode.window.showInformationMessage('Open an EVML document before exporting.');
                return;
            }

            const document = editor.document;
            if (document.languageId !== 'event-modeling' && !document.fileName.endsWith('.evml')) {
                void vscode.window.showInformationMessage('SVG export is only available for Event Modeling (.evml) files.');
                return;
            }

            const defaultUri = this.getDefaultExportUri(document);
            const source = document.getText();
            if (source.trim().length === 0) {
                void vscode.window.showInformationMessage('The document is empty. Add Event Modeling content before exporting.');
                return;
            }
            const targetUri = await vscode.window.showSaveDialog({
                defaultUri,
                filters: {
                    'Scalable Vector Graphics': ['svg']
                },
                saveLabel: 'Save SVG'
            });
            if (!targetUri) {
                return;
            }

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Exporting Event Model as SVG…'
                },
                async () => {
                    try {
                        const svg = await this.renderSvg({
                            text: source,
                            fileName: path.basename(document.fileName)
                        });
                        await vscode.workspace.fs.writeFile(targetUri, Buffer.from(svg, 'utf8'));
                        void vscode.window.showInformationMessage(`Saved SVG to ${targetUri.fsPath}.`);
                    } catch (error: unknown) {
                        const message = error instanceof Error ? error.message : 'Unknown error while exporting SVG.';
                        void vscode.window.showErrorMessage(`Failed to export Event Model as SVG: ${message}`);
                    }
                }
            );
        });
    }

    public dispose(): void {
        this.rejectPendingRequests(new Error('SVG export command disposed.'));
        this.rejectReadyPromise(new Error('SVG export command disposed.'));
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
        this.ready = false;
    }

    private rejectPendingRequests(error: Error): void {
        for (const deferred of this.pendingRequests.values()) {
            deferred.reject(error);
        }
        this.pendingRequests.clear();
    }

    private rejectReadyPromise(error: Error): void {
        if (this.readyReject) {
            this.readyReject(error);
        }
        this.readyPromise = undefined;
        this.readyResolve = undefined;
        this.readyReject = undefined;
    }

    private async renderSvg(payload: ExportPayload): Promise<string> {
        const panel = await this.ensurePanel();
        await this.waitForReady();

        return new Promise<string>((resolve, reject) => {
            const requestId = ++this.requestId;
            this.pendingRequests.set(requestId, { resolve, reject });

            panel.webview.postMessage({
                type: 'export',
                requestId,
                payload
            }).then(
                sent => {
                    if (!sent) {
                        this.pendingRequests.delete(requestId);
                        reject(new Error('Failed to deliver export request to renderer.'));
                    }
                },
                (reason: unknown) => {
                    this.pendingRequests.delete(requestId);
                    reject(reason instanceof Error ? reason : new Error(String(reason)));
                }
            );
        });
    }

    private async ensurePanel(): Promise<vscode.WebviewPanel> {
        if (this.panel) {
            return this.panel;
        }

        const panel = vscode.window.createWebviewPanel(
            'eventModelSvgExport',
            'Event Model SVG Export',
            { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview')
                ]
            }
        );

        panel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, 'static', 'logo.png');
        panel.onDidDispose(() => this.handlePanelDisposed());
        panel.webview.onDidReceiveMessage(message => this.handleMessage(message));
        panel.webview.html = this.renderHtml(panel.webview);

        this.panel = panel;
        this.ready = false;
        this.readyPromise = undefined;
        this.readyResolve = undefined;
        this.readyReject = undefined;
        return panel;
    }

    private handlePanelDisposed(): void {
        this.rejectPendingRequests(new Error('SVG export cancelled.'));
        this.rejectReadyPromise(new Error('SVG export cancelled.'));
        this.panel = undefined;
        this.ready = false;
    }

    private handleMessage(message: unknown): void {
        if (!message || typeof message !== 'object') {
            return;
        }

        const typedMessage = message as IncomingMessage & { requestId?: number; svg?: string; message?: string };

        switch (typedMessage.type) {
            case 'ready':
                this.handleReadyMessage();
                break;
            case 'exportResult':
                this.handleExportResult(typedMessage);
                break;
            case 'exportError':
                this.handleExportError(typedMessage);
                break;
        }
    }

    private handleReadyMessage(): void {
        this.ready = true;
        this.readyResolve?.();
        this.readyPromise = undefined;
        this.readyResolve = undefined;
        this.readyReject = undefined;
    }

    private handleExportResult(message: ExportResultMessage): void {
        const deferred = this.pendingRequests.get(message.requestId);
        if (!deferred) {
            return;
        }
        this.pendingRequests.delete(message.requestId);
        deferred.resolve(message.svg);
    }

    private handleExportError(message: ExportErrorMessage): void {
        const deferred = this.pendingRequests.get(message.requestId);
        if (!deferred) {
            return;
        }
        this.pendingRequests.delete(message.requestId);
        deferred.reject(new Error(message.message));
    }

    private waitForReady(): Promise<void> {
        if (this.ready) {
            return Promise.resolve();
        }
        if (!this.readyPromise) {
            this.readyPromise = new Promise<void>((resolve, reject) => {
                this.readyResolve = resolve;
                this.readyReject = reject;
            });
        }
        return this.readyPromise;
    }

    private getDefaultExportUri(document: vscode.TextDocument): vscode.Uri | undefined {
        if (document.uri.scheme !== 'file') {
            return undefined;
        }
        const parsed = path.parse(document.uri.fsPath);
        const fileName = `${parsed.name}.svg`;
        return vscode.Uri.file(path.join(parsed.dir, fileName));
    }

    private renderHtml(webview: vscode.Webview): string {
        const nonce = this.getNonce();
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', 'saveAsSvg.js')
        );

        const csp = [
            "default-src 'none'",
            `script-src 'nonce-${nonce}'`,
            "style-src 'unsafe-inline'"
        ].join('; ');

        return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event Model SVG Export</title>
</head>
<body>
    <div id="root" hidden></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>
        `.trim();
    }

    private getNonce(): string {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let nonce = '';
        for (let i = 0; i < 32; i++) {
            nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        }
        return nonce;
    }
}
