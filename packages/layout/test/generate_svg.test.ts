import { describe, test, beforeAll } from "vitest";

import { EmptyFileSystem, type LangiumDocument } from "langium";
import { parseHelper } from "langium/test";
import { createEventModelingServices } from "event-modeling-language";

import type { EventModel } from 'event-modeling-language';
import { create_db, Dependencies, TextDimensionConfig, TextDimensions, WrapLabelConfig } from "../src/db.js";
import { calculate_box_dimensions } from "../src/headless.js";

const log = {
    debug: (message: string) => {
        console.debug(message);
    }
}

const wrapLabel = (label: string, maxWidth: number, config: WrapLabelConfig) => {
    return label;
}

const calculateTextDimensions = (text: string, config: TextDimensionConfig) => {
    const box = calculate_box_dimensions(text, 300, config.fontFamily, config.fontSize);
    const result: TextDimensions = {
        ...box,
        lineHeight: 1
    };
    return result;
}

const deps: Dependencies = {
    log,
    wrapLabel,
    calculateTextDimensions
};

let services: ReturnType<typeof createEventModelingServices>;
let parse:    ReturnType<typeof parseHelper<EventModel>>;
let document: LangiumDocument<EventModel> | undefined;

beforeAll(async () => {
    console.error("BEFORE")
    services = createEventModelingServices(EmptyFileSystem);
    parse = parseHelper<EventModel>(services.EventModeling);
});

describe('Layout tests', () => {

    test('should create svg', async () => {
        const db = create_db(deps);

        console.log('HERE')
        const evml = `eventmodeling
tf 01 evt Start
tf 02 evt End
rf 03 readmodel ReadModel01 ->> 01 ->> 02 { a: true }
rf 04 rmo ReadModel02 ->> 01 ->> 02`;
        document = await parse(evml);
        console.log(`ast`, document.parseResult)
        db.setAst(document.parseResult.value);
        
        const state = db.getState();
        console.log(state);
    });
});
