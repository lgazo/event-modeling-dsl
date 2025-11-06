import { describe, test, beforeAll, expect } from "vitest";

import { EmptyFileSystem, type LangiumDocument } from "langium";
import { parseHelper } from "langium/test";
import { createEventModelingServices } from "event-modeling-language";

import type { EventModel } from 'event-modeling-language';
import { create_db } from "../src/db.js";
import { calculateBoxDimensions, write_svg } from "../src/headless.js";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { console_log } from "../src/console_log.js";

let services: ReturnType<typeof createEventModelingServices>;
let parse: ReturnType<typeof parseHelper<EventModel>>;
let document: LangiumDocument<EventModel> | undefined;

beforeAll(async () => {
    // console.error("BEFORE")
    services = createEventModelingServices(EmptyFileSystem);
    parse = parseHelper<EventModel>(services.EventModeling);
});

describe('Layout tests', () => {

    test('should create svg', async () => {
        const db = create_db({
            log: console_log,
            calculateBoxDimensions
        });

        const evml_names = [
            'multiple-source-frames',
            'translation-pattern',
            'resetting-flow',
            'data-block',
            'simple-block'
        ];

        if (!existsSync('./out/test')) {
            mkdirSync('./out/test');
        }
        evml_names.forEach(async (evml_name) => {
            const evml = readFileSync(`./test/${evml_name}.evml`).toString();
            document = await parse(evml);
            // console.log(`ast`, document.parseResult)
            db.setAst(document.parseResult.value);

            // const state = db.getState();
            // console.log(`state`, state);

            const svg_string = write_svg({ log: console_log })(document.parseResult.value);

            // const out_path = `./out/test/${evml_name}.emdsl.svg`;
            // writeFileSync(out_path, svg_string, 'utf-8');
            const snap = readFileSync(`./test/svg_snapshots/${evml_name}.emdsl.svg`)
            expect(snap.toString()).equals(svg_string);
        });
    });
});
