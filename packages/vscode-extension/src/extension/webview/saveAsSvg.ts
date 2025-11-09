import { create_dom_renderer, parseEvml, serializeSvg } from 'event-modeling-layout';
import { formatError } from '../utils.js';

declare function acquireVsCodeApi<State = unknown>(): {
    postMessage(message: unknown): void;
    setState(state: State): void;
    getState(): State | undefined;
};

interface ExportPayload {
    text: string;
    fileName: string;
}

interface ExportRequestMessage {
    type: 'export';
    requestId: number;
    payload: ExportPayload;
}

const vscode = acquireVsCodeApi();

const renderer = create_dom_renderer({
    document,
    log: {
        debug: (message: string, context?: unknown) => console.debug(`[evml-export] ${message}`, context)
    }
});

const container = (() => {
    const element = document.getElementById('root');
    if (!element) {
        throw new Error('Export container not found.');
    }
    if (!(element instanceof HTMLDivElement)) {
        throw new Error('Export container must be a div element.');
    }
    return element;
})();

window.addEventListener('message', event => {
    const message = event.data as ExportRequestMessage | undefined;
    if (!message || message.type !== 'export') {
        return;
    }
    void handleExport(message.requestId, message.payload);
});

vscode.postMessage({ type: 'ready' });

async function handleExport(requestId: number, payload: ExportPayload): Promise<void> {
    try {
        const model = await parseEvml(payload.text);
        container.replaceChildren();
        const svg = renderer.render(model, container);
        const serialized = serializeSvg(svg);
        vscode.postMessage({
            type: 'exportResult',
            requestId,
            svg: serialized
        });
    } catch (error: unknown) {
        vscode.postMessage({
            type: 'exportError',
            requestId,
            message: formatError(error)
        });
    }
}

