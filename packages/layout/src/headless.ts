import { createCanvas } from 'canvas';
import * as d3 from 'd3';
import { JSDOM } from 'jsdom';

interface TextSegment {
    text: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
}

export function calculate_box_dimensions(
    html: string,
    maxWidth: number,
    defaultFontFamily: string = 'sans-serif',
    defaultFontSize: number = 12
): { width: number; height: number } {
    // Parse HTML with jsdom
    const dom = new JSDOM(`<body><div>${html}</div></body>`);
    const document = dom.window.document;

    // Use d3 to select the div for easier manipulation (optional, but as per query)
    const div = d3.select(document.querySelector('div') as Element);

    const segments: TextSegment[] = [];

    // Traverse DOM to collect styled text segments
    function traverse(node: Node) {
        if (node.nodeType === 3) { // Text node
            const parent = node.parentElement;
            if (parent) {
                const style = dom.window.getComputedStyle(parent);
                segments.push({
                    text: node.textContent?.trim() || '',
                    fontFamily: style.fontFamily || defaultFontFamily,
                    fontSize: parseFloat(style.fontSize) || defaultFontSize,
                    fontWeight: style.fontWeight || 'normal',
                    fontStyle: style.fontStyle || 'normal',
                });
            }
        } else if (node.nodeType === 1) {
            node.childNodes.forEach(traverse);
        }
    }

    traverse(div.node()!); // Start traversal using d3 node

    // Create canvas context for measurement
    const canvas = createCanvas(100, 100); // Size irrelevant for measurement
    const ctx = canvas.getContext('2d')!;

    // Layout: wrap into lines
    const lines: TextSegment[][] = [];
    let currentLine: TextSegment[] = [];
    let currentWidth = 0;

    for (const seg of segments) {
        if (!seg.text) continue;
        ctx.font = `${seg.fontStyle} ${seg.fontWeight} ${seg.fontSize}px ${seg.fontFamily}`;
        const words = seg.text.split(/\s+/);
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const wordText = (i < words.length - 1) ? word + ' ' : word;
            const metrics = ctx.measureText(wordText);
            if (currentWidth + metrics.width > maxWidth && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = [];
                currentWidth = 0;
            }
            currentLine.push({ ...seg, text: wordText });
            currentWidth += metrics.width;
        }
    }
    if (currentLine.length > 0) lines.push(currentLine);

    // Calculate dimensions
    let height = 0;
    let boxWidth = 0;
    for (const line of lines) {
        let lineHeight = 0;
        let lineWidth = 0;
        for (const seg of line) {
            ctx.font = `${seg.fontStyle} ${seg.fontWeight} ${seg.fontSize}px ${seg.fontFamily}`;
            const metrics = ctx.measureText(seg.text);
            lineWidth += metrics.width;
            // Use modern metrics for accurate height (fall back to fontSize * 1.2 if not supported)
            const segHeight = ('actualBoundingBoxAscent' in metrics && 'actualBoundingBoxDescent' in metrics)
                ? metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
                : seg.fontSize * 1.2;
            lineHeight = Math.max(lineHeight, segHeight);
        }
        height += lineHeight + 2; // Add line spacing (adjust as needed)
        boxWidth = Math.max(boxWidth, lineWidth);
    }

    // Box width is the max line width, capped at maxWidth
    return { width: Math.min(boxWidth, maxWidth), height };
}
