declare module 'event-modeling-language' {
  export type EventModel = unknown;
  export const createEventModelingServices: (...args: any[]) => any;
}

declare module 'langium' {
  export const EmptyFileSystem: any;
  export const URI: any;
}

declare module 'event-modeling-layout/browser' {
  import type { EventModel } from 'event-modeling-language';

  export type DomRenderer = {
    render(model: EventModel, container: HTMLElement): SVGSVGElement;
  };

  export function create_dom_renderer(deps: {
    log: { debug: (message: string, ctx?: unknown) => void };
    document: Document;
  }): DomRenderer;

  export const SVG_STYLE_BLOCK: string;
}

declare module 'event-modeling-layout' {
  export type Logger = {
    debug: (message: string, ctx?: unknown) => void;
  };
}
