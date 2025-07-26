
import { type LangiumDocument } from "langium";
import { expandToString as s } from "langium/generate";
import { EventModeling, isEventModeling } from "../src/language/generated/ast.js";

export function checkDocumentValid(document: LangiumDocument): string | undefined {
    return document.parseResult.parserErrors.length && s`
        Parser errors:
          ${document.parseResult.parserErrors.map(e => e.message).join('\n  ')}
    `
        || document.parseResult.value === undefined && `ParseResult is 'undefined'.`
        || !isEventModeling(document.parseResult.value) && `Root AST object is a ${document.parseResult.value.$type}, expected a '${EventModeling}'.`
        || document.parseResult.lexerErrors.length && s`
  Lexer errors: ${JSON.stringify(document.parseResult.lexerErrors, null, 2)}
`
        || undefined;
}

