import { create_dom_renderer, type DomRenderer, parseEvml } from 'event-modeling-layout';
import { formatError } from '../utils.js';

declare function acquireVsCodeApi<State = unknown>(): {
    postMessage(message: unknown): void;
    setState(state: State): void;
    getState(): State | undefined;
};

interface RenderMessage {
    text: string;
    uri: string;
    version: number;
    fileName: string;
}

const vscode = acquireVsCodeApi();

const renderer: DomRenderer = create_dom_renderer({
    document,
    log: {
        debug: (message: string, context?: unknown) => console.debug(`[evml] ${message}`, context)
    }
});

const fileNameLabel = document.getElementById('file-name') as HTMLSpanElement;
const statusLabel = document.getElementById('status') as HTMLSpanElement;
const placeholder = document.getElementById('placeholder') as HTMLDivElement;
const errorContainer = document.getElementById('error') as HTMLDivElement;
const diagramContainer = document.getElementById('diagram') as HTMLDivElement;

let activeVersion = -1;
let renderToken = 0;

window.addEventListener('message', event => {
    const message = event.data as { type?: string; payload?: RenderMessage } | undefined;
    if (message?.type !== 'render' || !message.payload) {
        return;
    }

    const payload = message.payload;
    if (payload.version < activeVersion) {
        return;
    }

    activeVersion = payload.version;
    void render(payload);
});

vscode.postMessage({ type: 'ready' });

async function render(payload: RenderMessage): Promise<void> {
    const currentToken = ++renderToken;

    fileNameLabel.textContent = payload.fileName || 'Event Model';
    statusLabel.textContent = 'Rendering…';

    const source = payload.text ?? '';
    if (source.trim().length === 0) {
        showPlaceholder('The document is empty. Add Event Modeling content to see the preview.');
        statusLabel.textContent = 'Empty document';
        clearDiagram();
        return;
    }

    try {
        const model = await parseEvml(source);
        if (currentToken !== renderToken) {
            return;
        }
        clearError();
        hidePlaceholder();
        clearDiagram();
        renderer.render(model, diagramContainer);
        statusLabel.textContent = `Updated at ${new Date().toLocaleTimeString()}`;
    } catch (error: unknown) {
        if (currentToken !== renderToken) {
            return;
        }
        clearDiagram();
        showError(error);
        statusLabel.textContent = 'Render failed';
    }
}

function showPlaceholder(message: string): void {
    placeholder.textContent = message;
    placeholder.hidden = false;
    errorContainer.hidden = true;
}

function hidePlaceholder(): void {
    placeholder.hidden = true;
}

function showError(error: unknown): void {
    errorContainer.textContent = formatError(error);
    errorContainer.hidden = false;
    placeholder.hidden = true;
}

function clearError(): void {
    errorContainer.textContent = '';
    errorContainer.hidden = true;
}

function clearDiagram(): void {
    diagramContainer.replaceChildren();
}
