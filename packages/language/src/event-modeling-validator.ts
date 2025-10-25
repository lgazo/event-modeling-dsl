import type { ValidationChecks } from 'langium';
import type { EventModelingAstType } from './generated/ast.js';
import type { EventModelingServices } from './event-modeling-module.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: EventModelingServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.EventModelingValidator;
    const checks: ValidationChecks<EventModelingAstType> = {
        // Person: validator.checkPersonStartsWithCapital
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

}
