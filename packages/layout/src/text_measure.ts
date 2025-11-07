import type { ContentElement } from './db.js';
import { ContentElementStyles } from './db.js';

export interface TextSegment {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
}

export const BULGARIAN_WIDTH_RATIO = 1.2;

export function contentElementToSegments(contentElement: ContentElement): TextSegment[] {
  switch (contentElement.kind) {
    case 'b':
      return contentElement.valueLines
        ? contentElement.valueLines.map((value) => ({
          text: value || '>b<',
          ...ContentElementStyles.b
        }))
        : [];
    case 'br':
      return [{
        text: '>br<',
        ...ContentElementStyles.br
      }];
    case 'code':
      return contentElement.valueLines
        ? contentElement.valueLines.map((value) => ({
          text: value || '>code<',
          ...ContentElementStyles.code
        }))
        : [];
    case 'span':
      return contentElement.valueLines
        ? contentElement.valueLines.map((value) => ({
          text: value || '>span<',
          ...ContentElementStyles.span
        }))
        : [];
  }
}

export function contentElementsToSegments(html: ContentElement[]): TextSegment[] {
  return html.flatMap(contentElementToSegments);
}

export function measureSegments(
  segments: TextSegment[],
  ctx: CanvasRenderingContext2D,
  maxWidth: number
): { width: number; height: number } {
  if (segments.length === 0) {
    return { width: 0, height: 0 };
  }

  const lines: TextSegment[][] = [];

  for (const seg of segments) {
    if (!seg.text) {
      continue;
    }
    ctx.font = `${seg.fontStyle} ${seg.fontWeight} ${seg.fontSize}px ${seg.fontFamily}`;
    lines.push([{ ...seg, text: seg.text }]);
  }

  let height = 0;
  let boxWidth = 0;
  for (const line of lines) {
    let lineHeight = 0;
    let lineWidth = 0;
    for (const seg of line) {
      ctx.font = `${seg.fontStyle} ${seg.fontWeight} ${seg.fontSize}px ${seg.fontFamily}`;
      const metrics = ctx.measureText(seg.text);
      lineWidth += metrics.width * BULGARIAN_WIDTH_RATIO;
      const segHeight = ('actualBoundingBoxAscent' in metrics && 'actualBoundingBoxDescent' in metrics)
        ? (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent)
        : seg.fontSize * 1.2;
      lineHeight = Math.max(lineHeight, segHeight);
    }
    height += lineHeight + 2;
    boxWidth = Math.max(boxWidth, lineWidth);
  }

  return {
    width: Math.min(boxWidth, maxWidth),
    height
  };
}

export function measureContentElements(
  html: ContentElement[],
  ctx: CanvasRenderingContext2D,
  maxWidth: number
): { width: number; height: number } {
  const segments = contentElementsToSegments(html);
  return measureSegments(segments, ctx, maxWidth);
}
