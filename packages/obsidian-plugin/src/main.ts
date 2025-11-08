import { Menu, Plugin, type MarkdownPostProcessorContext, type WorkspaceLeaf } from 'obsidian';
import { createEventModelingServices, type EventModel } from 'event-modeling-language';
import { EmptyFileSystem, URI } from 'langium';
import { create_dom_renderer } from 'event-modeling-layout';
import type { Logger, DomRenderer } from 'event-modeling-layout';
import { EventModelExplorerView, VIEW_TYPE_EVENT_MODEL_EXPLORER } from './event-model-explorer-view.js';

export default class EventModelingLayoutPlugin extends Plugin {
  private readonly services = createEventModelingServices(EmptyFileSystem);
  private readonly log: Logger = {
    debug: (message: string, ctx?: unknown) => console.debug(`[evml] ${message}`, ctx)
  };
  private readonly renderer: DomRenderer;
  private nextDocumentId = 0;

  constructor(app: any, manifest: any) {
    super(app, manifest);
    this.renderer = create_dom_renderer({
      log: this.log,
      document
    });
  }

  override async onload(): Promise<void> {
    this.registerView(VIEW_TYPE_EVENT_MODEL_EXPLORER, (leaf: WorkspaceLeaf) => new EventModelExplorerView(leaf, this.renderer));

    this.registerMarkdownCodeBlockProcessor('evml', async (source: string, el: HTMLElement, context: MarkdownPostProcessorContext) => {
      await this.renderDiagram(source, el, context);
    });
  }

  override onunload(): void {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_EVENT_MODEL_EXPLORER);
    for (const leaf of leaves) {
      leaf.detach();
    }

    this.services.shared.workspace.LangiumDocuments.deleteDocuments(URI.parse('memory://evml/'));
  }

  private async renderDiagram(source: string, el: HTMLElement, _context: MarkdownPostProcessorContext): Promise<void> {
    el.empty();
    const container = el.createDiv({ cls: 'evml-diagram' });

    try {
      const model = await this.parseEvml(source);
      this.renderer.render(model, container);
      this.attachContextMenu(container, model);
    } catch (error: unknown) {
      console.error('[evml] Failed to render EVML block', error);
      container.createEl('pre', {
        text: `Event Modeling render error: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  private async parseEvml(source: string): Promise<EventModel> {
    const uri = URI.parse(`memory://evml/${this.nextDocumentId++}.evml`);
    const documents = this.services.shared.workspace.LangiumDocuments;
    const documentBuilder = this.services.shared.workspace.DocumentBuilder;
    const document = this.services.shared.workspace.LangiumDocumentFactory.fromString(source, uri);
    documents.addDocument(document);

    try {
      await documentBuilder.build([document], { validation: true });

      const diagnostics = document.diagnostics ?? [];
      const errors = diagnostics.filter((diag: { severity?: number }) => diag.severity === 1);
      if (errors.length > 0) {
        const message = errors.map((error: { message: string }) => error.message).join('\n');
        throw new Error(message);
      }

      const model = document.parseResult?.value as EventModel | undefined;
      if (!model) {
        throw new Error('Invalid EVML document: empty parse result.');
      }

      return model;
    } finally {
      documents.deleteDocument(uri);
    }
  }

  private attachContextMenu(container: HTMLElement, model: EventModel): void {
    container.addEventListener('contextmenu', event => {
      event.preventDefault();

      const menu = new Menu();
      menu.addItem(item =>
        item
          .setTitle('Explore event model')
          .setIcon('maximize')
          .onClick(() => {
            void this.openExplorer(model);
          })
      );
      menu.showAtMouseEvent(event);
    });
  }

  private async openExplorer(model: EventModel): Promise<void> {
    const workspace = this.app.workspace;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_EVENT_MODEL_EXPLORER)[0];

    if (!leaf) {
      leaf = workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE_EVENT_MODEL_EXPLORER, active: true });
    } else {
      workspace.setActiveLeaf(leaf, { focus: true });
    }

    const view = leaf.view;
    if (view instanceof EventModelExplorerView) {
      view.setModel(model);
    }
  }
}
