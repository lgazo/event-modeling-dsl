declare module 'obsidian' {
  export type MarkdownPostProcessor = (source: string, el: HTMLElement, context: MarkdownPostProcessorContext) => void | Promise<void>;

  export interface MarkdownPostProcessorContext {
    docId?: string;
  }

  export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    minAppVersion: string;
    description: string;
    author: string;
    authorUrl: string;
    isDesktopOnly: boolean;
  }

  export interface App {}

  export class Plugin {
    app: App;
    manifest: PluginManifest;
    constructor(app: App, manifest: PluginManifest);
    onload(): Promise<void> | void;
    onunload(): Promise<void> | void;
    registerMarkdownCodeBlockProcessor(language: string, processor: MarkdownPostProcessor): void;
  }
}

declare global {
  interface HTMLElement {
    createDiv(options?: { cls?: string }): HTMLDivElement;
    createEl(tag: string, options?: { text?: string; cls?: string }): HTMLElement;
    empty(): void;
  }
}

export { };
