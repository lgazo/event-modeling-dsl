import { describe, test, expect } from "vitest";

import { calculate_box_dimensions } from "../src/headless";

describe('Headless tests', () => {

    test('should compute containing box', async () => {
        const html = '<p>Hello <b>world</b>! This is <i>rich</i> text spanning multiple lines if long enough.</p>';
        const maxWidth = 300;
        const dimensions = calculate_box_dimensions(html, maxWidth);
        console.log(dimensions); // e.g., { width: 250, height: 40 }
        expect(dimensions.width).eq(300);
        expect(dimensions.height).eq(40);
    });
});
