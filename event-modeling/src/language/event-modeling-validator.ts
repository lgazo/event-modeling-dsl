import type { ValidationAcceptor, ValidationChecks } from "langium";
import type { EventModelingAstType, EmFrame } from "./generated/ast.js";
import type { EventModelingServices } from "./event-modeling-module.js";

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: EventModelingServices) {
  const registry = services.validation.ValidationRegistry;
  const validator = services.validation.EventModelingValidator;
  const checks: ValidationChecks<EventModelingAstType> = {
    // Person: validator.checkPersonStartsWithCapital
    EmFrame: validator.checkFrameEntityExists,
  };
  registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class EventModelingValidator {
  // checkPersonStartsWithCapital(person: Person, accept: ValidationAcceptor): void {
  //     if (person.name) {
  //         const firstChar = person.name.substring(0, 1);
  //         if (firstChar.toUpperCase() !== firstChar) {
  //             accept('warning', 'Person name should start with a capital.', { node: person, property: 'name' });
  //         }
  //     }
  // }

  checkFrameEntityExists(frame: EmFrame, accept: ValidationAcceptor): void {
    /**
         * If we put cross-reference check there, then we need to implement the validator the following way. The question remains how to supress the reference check itself.
         *
Frame:
    'tf' name=FI modelEntityType=ModelEntityType entityIdentifier=[ModelEntity:EID] ('>t' sourceFrame=[Frame:FI])? ('[[' dataReference=[DataEntity:EID] ']]')? DataBlock;
        */
    // console.log(`hello `,frame);
    // if (frame.entityIdentifier && !this.getEntityByName(frame.entityIdentifier.$refText)) {
    //     accept('info', `Entity '${frame.entityIdentifier.$refText}' does not exist.`, { node: frame, property: 'entityIdentifier' });
    // }
  }

  getEntityByName(name: string | undefined) {
    if (!name) return undefined;
    // Add logic to search for the entity in the model
    return undefined; // Return the entity if found, otherwise return undefined
  }
}
