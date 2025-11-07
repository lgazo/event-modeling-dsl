import { select } from 'd3';
import type { EventModel } from 'event-modeling-language';
import { create_db, ContentElementStyles } from './db.js';
import { draw_diagram, type D3Diagram } from './renderer.js';
import type { DiagramProps, Context } from './types.js';
import type { LoggerDep } from './types_services.js';
import { measureContentElements } from './text_measure.js';

export const SVG_STYLE_BLOCK = `:where(.evml-svg){font-family:${ContentElementStyles.span.fontFamily};font-size:${ContentElementStyles.span.fontSize}px;fill:#333;}:where(.evml-svg) .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}:where(.evml-svg) .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}:where(.evml-svg) .error-icon{fill:#552222;}:where(.evml-svg) .error-text{fill:#552222;stroke:#552222;}:where(.evml-svg) .edge-thickness-normal{stroke-width:1px;}:where(.evml-svg) .edge-thickness-thick{stroke-width:3.5px;}:where(.evml-svg) .edge-pattern-solid{stroke-dasharray:0;}:where(.evml-svg) .edge-thickness-invisible{stroke-width:0;fill:none;}:where(.evml-svg) .edge-pattern-dashed{stroke-dasharray:3;}:where(.evml-svg) .edge-pattern-dotted{stroke-dasharray:2;}:where(.evml-svg) .marker{fill:#333333;stroke:#333333;}:where(.evml-svg) .marker.cross{stroke:#333333;}:where(.evml-svg) svg{font-family:${ContentElementStyles.span.fontFamily};font-size:${ContentElementStyles.span.fontSize}px;}:where(.evml-svg) p{margin:0;}:where(.evml-svg){--mermaid-font-family:${ContentElementStyles.span.fontFamily};}`;

export interface DomRendererDeps extends LoggerDep {
  document: Document;
}

export interface DomRenderer {
  render(model: EventModel, container: HTMLElement): SVGSVGElement;
}

export function create_dom_renderer(deps: DomRendererDeps): DomRenderer {
  const measurementCtx = createMeasurementContext(deps.document);
  const db = create_db({
    ...deps,
    calculateBoxDimensions: (html, props) => measureContentElements(html, measurementCtx, props.maxWidth)
  });

  const ensureStyle = createStyleInjector(deps.document);

  return {
    render(model: EventModel, container: HTMLElement): SVGSVGElement {
      container.replaceChildren();

      db.setAst(model);
      const state = db.getState();
      const diagramProps = db.getDiagramProps();

      const svg = deps.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('evml-svg');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Event Modeling diagram');
      container.appendChild(svg);

      ensureStyle(svg);

      const diagram = select(svg) as unknown as D3Diagram;
      draw_diagram(diagramProps, state, diagram);

      const { width, height } = computeDiagramSize(diagramProps, state);
      svg.setAttribute('width', `${width}`);
      svg.setAttribute('height', `${height}`);
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

      return svg;
    }
  };
}

function createMeasurementContext(document: Document): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to access 2D canvas context for measurement.');
  }
  return ctx;
}

function createStyleInjector(document: Document) {
  return (svg: SVGSVGElement) => {
    if (svg.querySelector('style[data-evml-style]')) {
      return;
    }
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-evml-style', 'true');
    style.textContent = SVG_STYLE_BLOCK;
    svg.insertBefore(style, svg.firstChild);
  };
}

function computeDiagramSize(diagramProps: DiagramProps, state: Context): { width: number; height: number } {
  const minWidth = diagramProps.contentStartX + diagramProps.boxMinWidth + 3 * diagramProps.boxPadding;
  const width = Math.max(state.maxR, minWidth);
  const swimlanes = state.sortedSwimlanesArray;
  const height = swimlanes.length > 0
    ? swimlanes[swimlanes.length - 1].y + swimlanes[swimlanes.length - 1].height
    : diagramProps.swimlaneMinHeight + 2 * diagramProps.swimlanePadding;

  return { width, height };
}
