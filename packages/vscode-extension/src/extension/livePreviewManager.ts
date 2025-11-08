import * as vscode from 'vscode';
import * as path from 'node:path';

interface RenderPayload {
    text: string;
    uri: string;
    version: number;
    fileName: string;
}

export class EventModelLivePreviewManager implements vscode.Disposable {
    private readonly previews = new Map<string, EventModelLivePreview>();
    private readonly disposables: vscode.Disposable[] = [];

    constructor(private readonly context: vscode.ExtensionContext) {
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument(event => {
                this.updatePreview(event.document);
            }),
            vscode.workspace.onDidCloseTextDocument(document => {
                this.disposePreview(document.uri.toString());
            })
        );
    }

    public registerCommand(): vscode.Disposable {
        return vscode.commands.registerCommand('event-modeling.livePreview', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                void vscode.window.showInformationMessage('Open an EVML document to preview it.');
                return;
            }
            const document = editor.document;
            if (document.languageId !== 'event-modeling' && !document.fileName.endsWith('.evml')) {
                void vscode.window.showInformationMessage('The live preview is only available for Event Modeling (.evml) files.');
                return;
            }
            this.showPreview(document);
        });
    }

    public showPreview(document: vscode.TextDocument): void {
        const key = document.uri.toString();
        let preview = this.previews.get(key);

        if (!preview) {
            preview = new EventModelLivePreview(this.context, document, () => this.previews.delete(key));
            this.previews.set(key, preview);
        }

        preview.update(document);
        preview.reveal();
    }

    private updatePreview(document: vscode.TextDocument): void {
        const preview = this.previews.get(document.uri.toString());
        if (!preview) {
            return;
        }
        preview.update(document);
    }

    private disposePreview(key: string): void {
        const preview = this.previews.get(key);
        if (!preview) {
            return;
        }
        preview.dispose();
        this.previews.delete(key);
    }

    public dispose(): void {
        for (const disposable of this.disposables.splice(0)) {
            disposable.dispose();
        }
        for (const preview of this.previews.values()) {
            preview.dispose();
        }
        this.previews.clear();
    }
}

class EventModelLivePreview implements vscode.Disposable {
    private readonly panel: vscode.WebviewPanel;
    private readonly webview: vscode.Webview;
    private disposed = false;
    private ready = false;
    private pendingPayload: RenderPayload | undefined;

    constructor(
        private readonly context: vscode.ExtensionContext,
        document: vscode.TextDocument,
        private readonly onDispose: () => void
    ) {
        this.panel = vscode.window.createWebviewPanel(
            'eventModelLivePreview',
            this.createTitle(document),
            {
                viewColumn: vscode.ViewColumn.Beside,
                preserveFocus: true
            },
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'out', 'webview'),
                    vscode.Uri.joinPath(context.extensionUri, 'static')
                ]
            }
        );

        this.webview = this.panel.webview;
        this.panel.onDidDispose(() => this.handlePanelDisposed());
        this.webview.onDidReceiveMessage(message => this.handleMessage(message));
        this.webview.html = this.renderHtml();
    }

    public update(document: vscode.TextDocument): void {
        if (this.disposed) {
            return;
        }
        const payload: RenderPayload = {
            text: document.getText(),
            uri: document.uri.toString(),
            version: document.version,
            fileName: path.basename(document.fileName)
        };
        this.pendingPayload = payload;
        this.panel.title = this.createTitle(document);

        if (this.ready) {
            this.postRender(payload);
        }
    }

    public reveal(): void {
        if (this.disposed) {
            return;
        }
        this.panel.reveal(vscode.ViewColumn.Beside, true);
    }

    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        try {
            this.panel.dispose();
        } finally {
            this.onDispose();
        }
    }

    private handlePanelDisposed(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.onDispose();
    }

    private handleMessage(message: unknown): void {
        if (!message || typeof message !== 'object') {
            return;
        }

        const { type } = message as { type?: string };
        if (type === 'ready') {
            this.ready = true;
            if (this.pendingPayload) {
                this.postRender(this.pendingPayload);
            }
        }
    }

    private postRender(payload: RenderPayload): void {
        void this.webview.postMessage({
            type: 'render',
            payload
        });
    }

    private renderHtml(): string {
        const nonce = getNonce();
        const scriptUri = this.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', 'livePreview.js')
        );

        const csp = [
            "default-src 'none'",
            "img-src 'self' data:",
            "font-src 'self' data:",
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
    <title>Event Model Preview</title>
    <style>
        :root {
            color-scheme: light dark;
        }
        body {
            margin: 0;
            padding: 0;
            font-family: var(--vscode-editor-font-family, system-ui);
            background-color: var(--vscode-editor-background, #1e1e1e);
            color: var(--vscode-foreground, #cccccc);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        header {
            padding: 0.5rem 1rem;
            border-bottom: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.5));
            font-size: 0.85rem;
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }
        main {
            flex: 1;
            overflow: auto;
        }
        .status {
            margin-left: auto;
            font-style: italic;
            opacity: 0.7;
        }
        .error {
            color: var(--vscode-errorForeground, #f14c4c);
            white-space: pre-wrap;
            padding: 1rem;
        }
        .placeholder {
            padding: 1rem;
            color: var(--vscode-descriptionForeground, rgba(204, 204, 204, 0.7));
        }
        .diagram {
            padding: 0.5rem;
            display: flex;
            justify-content: center;
            align-items: flex-start;
        }
    </style>
</head>
<body>
    <header>
        <span id="file-name">Event Model</span>
        <span class="status" id="status">Waiting for content…</span>
    </header>
    <main>
        <div class="placeholder" id="placeholder">Make changes to the source document to update the preview.</div>
        <div class="error" id="error" hidden></div>
        <div class="diagram" id="diagram"></div>
    </main>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>
        `.trim();
    }

    private createTitle(document: vscode.TextDocument): string {
        const fileName = path.basename(document.fileName);
        return `Event Model Preview · ${fileName}`;
    }
}

function getNonce(): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    for (let i = 0; i < 32; i++) {
        nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return nonce;
}
