import { create_dom_renderer } from 'event-modeling-layout';
import { createEventModelingServices, type EventModel } from 'event-modeling-language';
import { EmptyFileSystem, URI } from 'langium';

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

const services = createEventModelingServices(EmptyFileSystem);
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

let nextDocumentId = 0;

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
        const svgMarkup = renderToString(model);
        vscode.postMessage({
            type: 'exportResult',
            requestId,
            svg: svgMarkup
        });
    } catch (error: unknown) {
        vscode.postMessage({
            type: 'exportError',
            requestId,
            message: formatError(error)
        });
    }
}

async function parseEvml(source: string): Promise<EventModel> {
    const uri = URI.parse(`memory://evml-export/${nextDocumentId++}.evml`);
    const documents = services.shared.workspace.LangiumDocuments;
    const documentBuilder = services.shared.workspace.DocumentBuilder;
    const document = services.shared.workspace.LangiumDocumentFactory.fromString(source, uri);

    documents.addDocument(document);

    try {
        await documentBuilder.build([document], { validation: true });
        const diagnostics = document.diagnostics ?? [];
        const errors = diagnostics.filter(diagnostic => diagnostic.severity === 1);
        if (errors.length > 0) {
            const message = errors.map(error => error.message).join('\n');
            throw new Error(message);
        }

        const model = document.parseResult?.value as EventModel | undefined;
        if (!model) {
            throw new Error('Invalid Event Model: empty parse result.');
        }
        return model;
    } finally {
        documents.deleteDocument(uri);
    }
}

function renderToString(model: EventModel): string {
    container.replaceChildren();
    const svg = renderer.render(model, container);
    const serialized = svg.outerHTML;
    container.replaceChildren();
    return `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`;
}

function formatError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return typeof error === 'string' ? error : 'Unknown error while exporting Event Model.';
}
