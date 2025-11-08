import * as path from 'node:path';
import { extractDestinationAndName } from './util.js';
import { write_svg } from 'event-modeling-layout-headless';
import { EventModel } from 'event-modeling-language';
import { writeFileSync } from 'node:fs';
import { console_log } from './console_log.js';


export function generateSvg(
    model: EventModel,
    filePath: string,
    destination: string | undefined): string {

    const data = extractDestinationAndName(filePath, destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}.svg`;

    const svg_string = write_svg({ log: console_log })(model);
    writeFileSync(generatedFilePath, svg_string, 'utf-8');


    return generatedFilePath;
}
