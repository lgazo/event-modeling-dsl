import { createCanvas } from '@napi-rs/canvas';
import * as d3 from 'd3';
import { JSDOM } from 'jsdom';
import { ContentElement, ContentElementStyles, create_db } from 'event-modeling-layout';
import { EventModel } from 'event-modeling-language';
import { D3Diagram, draw_diagram } from 'event-modeling-layout';
import { LoggerDep } from 'event-modeling-layout';
import { measureContentElements } from 'event-modeling-layout';

export function calculateBoxDimensions(
    html: ContentElement[],
    props: { maxWidth: number }
): { width: number; height: number } {
    const canvas = createCanvas(100, 100); // Size irrelevant for measurement
    const ctx = canvas.getContext('2d')!;
    return measureContentElements(html, ctx as unknown as CanvasRenderingContext2D, props.maxWidth);
}

export const write_svg = (deps: LoggerDep) => (
    model: EventModel,
): string => {

    const db = create_db({
        ...deps,
        calculateBoxDimensions
    });
    db.setAst(model);

    const state = db.getState();
    const diagramProps = db.getDiagramProps();

    const dom = new JSDOM(`<svg xmlns="http://www.w3.org/2000/svg" id="dynamic">
        <style>#dynamic{font-family:${ContentElementStyles.span.fontFamily};font-size:${ContentElementStyles.span.fontSize}px;fill:#333;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#dynamic .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#dynamic .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#dynamic .error-icon{fill:#552222;}#dynamic .error-text{fill:#552222;stroke:#552222;}#dynamic .edge-thickness-normal{stroke-width:1px;}#dynamic .edge-thickness-thick{stroke-width:3.5px;}#dynamic .edge-pattern-solid{stroke-dasharray:0;}#dynamic .edge-thickness-invisible{stroke-width:0;fill:none;}#dynamic .edge-pattern-dashed{stroke-dasharray:3;}#dynamic .edge-pattern-dotted{stroke-dasharray:2;}#dynamic .marker{fill:#333333;stroke:#333333;}#dynamic .marker.cross{stroke:#333333;}#dynamic svg{font-family:${ContentElementStyles.span.fontFamily};font-size:${ContentElementStyles.span.fontSize}px;}#dynamic p{margin:0;}#dynamic :root{--mermaid-font-family:${ContentElementStyles.span.fontFamily};}</style>
        </svg>`, { contentType: 'image/svg+xml' });
    const document = dom.window.document;
    const svgElement = d3.select(document.querySelector('svg') as Element);

    const diagram = svgElement as unknown as D3Diagram;
    draw_diagram(diagramProps, state, diagram);

    const minWidth = diagramProps.contentStartX + diagramProps.boxMinWidth + 3 * diagramProps.boxPadding;
    const width = Math.max(state.maxR, minWidth);
    const swimlanes = state.sortedSwimlanesArray;
    const height = swimlanes.length > 0
        ? swimlanes[swimlanes.length - 1].y + swimlanes[swimlanes.length - 1].height
        : diagramProps.swimlaneMinHeight + 2 * diagramProps.swimlanePadding;

    diagram
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

    const svg_string = dom.serialize();
    return svg_string;
}
