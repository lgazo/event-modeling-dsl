import { describe, test, expect } from "vitest";

import { ContentElement } from "../src/db.js";
import { calculateBoxDimensions } from "../src/headless.js";

describe('Headless tests', () => {

    test('should compute containing box', async () => {
        const strippedBlockValue = `  description: 'john'\n  image: 'avatar_john'\n  price: 20.4`;
        const lines = strippedBlockValue.split('\n');
        let semanticContent: ContentElement[] = [{ kind: 'b', valueLines: ["AddItem"] }];
        semanticContent.push({ kind: 'br' });
        semanticContent.push({ kind: 'code', valueLines: lines, params: { maxWidth: 430 } });
        const maxWidth = 300;
        const dimensions = calculateBoxDimensions(semanticContent, { maxWidth });
        // console.log(dimensions);
        expect(dimensions.width).eq(156.5280029296875);
        expect(dimensions.height).eq(69);
    });
});
