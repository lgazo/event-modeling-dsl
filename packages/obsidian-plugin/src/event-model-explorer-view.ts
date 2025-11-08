import { ItemView, type WorkspaceLeaf, setIcon } from 'obsidian';
import type { DomRenderer } from 'event-modeling-layout';
import type { EventModel } from 'event-modeling-language';

export const VIEW_TYPE_EVENT_MODEL_EXPLORER = 'evml-explorer';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export class EventModelExplorerView extends ItemView {
  private readonly renderer: DomRenderer;
  private model: EventModel | undefined;
  private viewportEl: HTMLDivElement | undefined;
  private diagramEl: HTMLElement | undefined;
  private zoom = 1;
  private panX = 0;
  private panY = 0;
  private isPanning = false;
  private activePointerId: number | undefined;
  private panStartX = 0;
  private panStartY = 0;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private fullscreenButton: HTMLButtonElement | undefined;

  constructor(leaf: WorkspaceLeaf, renderer: DomRenderer) {
    super(leaf);
    this.renderer = renderer;
  }

  override getViewType(): string {
    return VIEW_TYPE_EVENT_MODEL_EXPLORER;
  }

  override getDisplayText(): string {
    return 'Event Model Explorer';
  }

  override getIcon(): string {
    return 'maximize';
  }

  setModel(model: EventModel): void {
    this.model = model;
    this.resetViewport();
    this.renderDiagram();
  }

  override async onOpen(): Promise<void> {
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    this.renderView();
  }

  override async onClose(): Promise<void> {
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
  }

  private renderView(): void {
    this.contentEl.empty();
    this.contentEl.addClass('evml-explorer');

    const toolbar = this.contentEl.createDiv({ cls: 'evml-explorer-toolbar' });

    const zoomOutButton = this.createToolbarButton(toolbar, 'zoom-out', 'Zoom out');
    zoomOutButton.addEventListener('click', () => this.adjustZoom(-ZOOM_STEP));

    const zoomInButton = this.createToolbarButton(toolbar, 'zoom-in', 'Zoom in');
    zoomInButton.addEventListener('click', () => this.adjustZoom(ZOOM_STEP));

    const resetButton = this.createToolbarButton(toolbar, 'rotate-ccw', 'Reset view');
    resetButton.addEventListener('click', () => this.resetViewport());

    this.fullscreenButton = this.createToolbarButton(toolbar, 'maximize', 'Toggle fullscreen');
    this.fullscreenButton.addEventListener('click', () => this.toggleFullscreen());

    this.viewportEl = this.contentEl.createDiv({ cls: 'evml-explorer-viewport' });
    this.attachViewportEvents(this.viewportEl);

    this.renderDiagram();
  }

  private createToolbarButton(toolbar: HTMLElement, icon: string, label: string): HTMLButtonElement {
    const button = toolbar.createEl('button', {
      cls: 'evml-explorer-button',
      attr: { type: 'button', 'aria-label': label }
    });

    setIcon(button, icon);
    return button;
  }

  private renderDiagram(): void {
    const viewport = this.viewportEl;
    if (!viewport) {
      return;
    }

    viewport.empty();

    if (!this.model) {
      viewport.createEl('div', { cls: 'evml-explorer-placeholder', text: 'Select an Event Model to explore.' });
      return;
    }

    this.renderer.render(this.model, viewport);

    const renderedRoot = viewport.firstElementChild as HTMLElement | null;
    if (!renderedRoot) {
      return;
    }

    renderedRoot.classList.add('evml-explorer-diagram');
    renderedRoot.style.transformOrigin = '0 0';
    this.diagramEl = renderedRoot;
    this.applyTransform();
  }

  private attachViewportEvents(viewport: HTMLDivElement): void {
    viewport.addEventListener('pointerdown', event => {
      if (this.isPanning || !this.diagramEl) {
        return;
      }

      this.isPanning = true;
      this.activePointerId = event.pointerId;
      this.panStartX = this.panX;
      this.panStartY = this.panY;
      this.pointerStartX = event.clientX;
      this.pointerStartY = event.clientY;
      viewport.classList.add('evml-explorer-viewport--panning');
      viewport.setPointerCapture(event.pointerId);
    });

    viewport.addEventListener('pointermove', event => {
      if (!this.isPanning || event.pointerId !== this.activePointerId) {
        return;
      }

      const deltaX = event.clientX - this.pointerStartX;
      const deltaY = event.clientY - this.pointerStartY;
      this.panX = this.panStartX + deltaX;
      this.panY = this.panStartY + deltaY;
      this.applyTransform();
    });

    const stopPanning = (event: PointerEvent): void => {
      if (!this.isPanning || event.pointerId !== this.activePointerId) {
        return;
      }

      this.isPanning = false;
      this.activePointerId = undefined;
      viewport.classList.remove('evml-explorer-viewport--panning');
      viewport.releasePointerCapture(event.pointerId);
    };

    viewport.addEventListener('pointerup', stopPanning);
    viewport.addEventListener('pointercancel', stopPanning);

    viewport.addEventListener(
      'wheel',
      event => {
        if (!this.diagramEl) {
          return;
        }

        event.preventDefault();
        const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        this.adjustZoom(delta);
      },
      { passive: false }
    );
  }

  private adjustZoom(delta: number): void {
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom + delta));
    if (nextZoom === this.zoom) {
      return;
    }

    this.zoom = nextZoom;
    this.applyTransform();
  }

  private resetViewport(): void {
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
  }

  private applyTransform(): void {
    if (!this.diagramEl) {
      return;
    }

    this.diagramEl.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  private async toggleFullscreen(): Promise<void> {
    const root = this.contentEl;

    if (document.fullscreenElement === root) {
      await document.exitFullscreen();
    } else {
      await root.requestFullscreen();
    }
  }

  private handleFullscreenChange = (): void => {
    if (!this.fullscreenButton) {
      return;
    }

    const isFullscreen = document.fullscreenElement === this.contentEl;
    setIcon(this.fullscreenButton, isFullscreen ? 'minimize' : 'maximize');
    this.fullscreenButton.setAttribute('aria-pressed', isFullscreen ? 'true' : 'false');
  };
}
