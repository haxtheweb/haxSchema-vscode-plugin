import { JSONPath } from 'jsonc-parser';
import schema from '../schemas/haxschema.json';
import { Finding, isObject, locate, parseDocument, suggest } from './jsonUtil';

/**
 * Checks that JSON Schema can't express. Structural validation (types,
 * enums, required keys) is done by VS Code's JSON language service using
 * schemas/haxschema.json, so nothing here repeats it.
 */

const SECTIONS = ['inline', 'configure', 'advanced', 'developer'] as const;
const FIELD_KEYS = Object.keys(schema.definitions.settingsField.properties);
const CHOICE_METHODS = new Set(['select', 'radio']);
const CONTAINER_METHODS = new Set(['tabs', 'collapse', 'fieldset', 'object']);

export const CODES = {
    missingBinding: 'HAX100',
    missingOptions: 'HAX101',
    sliderRange: 'HAX102',
    duplicateBinding: 'HAX103',
    unsetAttributeCase: 'HAX104',
    noOwnDemo: 'HAX105',
    badRegex: 'HAX106',
    fieldKeyTypo: 'HAX107',
    propertyCase: 'HAX108',
    attributeCase: 'HAX109',
} as const;

export function isLocaleFile(fileName: string): boolean {
    return /[\\/]locales[\\/][^\\/]+\.haxProperties\.json$/.test(fileName);
}

export function isHaxPropertiesFile(fileName: string): boolean {
    return fileName.endsWith('.haxProperties.json');
}

/** `foo-bar.haxProperties.json` -> `foo-bar` */
export function tagFromFileName(fileName: string): string | undefined {
    const m = /([^\\/]+)\.haxProperties\.json$/.exec(fileName);
    return m ? m[1] : undefined;
}

export function validateHaxProperties(text: string, fileName = ''): Finding[] {
    const { root, value, syntaxErrors } = parseDocument(text);
    if (syntaxErrors.length) {
        // VS Code already reports syntax errors for JSON documents
        return [];
    }
    if (!isObject(value) || isLocaleFile(fileName)) {
        return [];
    }
    const out: Finding[] = [];
    const add = (code: string, severity: Finding['severity'], message: string, path: JSONPath, key = false) => {
        out.push({ code, severity, message, path, ...locate(root, path, key) });
    };

    // settings
    const settings = value.settings;
    if (isObject(settings)) {
        for (const section of SECTIONS) {
            const list = settings[section];
            if (Array.isArray(list)) {
                checkFieldList(list, ['settings', section], add);
            }
        }
    }

    // saveOptions.unsetAttributes are HTML attribute names
    const save = value.saveOptions;
    if (isObject(save) && Array.isArray(save.unsetAttributes)) {
        save.unsetAttributes.forEach((attr, i) => {
            if (typeof attr === 'string' && /[A-Z]/.test(attr)) {
                add(CODES.unsetAttributeCase, 'warning',
                    `unsetAttributes takes HTML attribute names. Did you mean "${kebab(attr)}"?`,
                    ['saveOptions', 'unsetAttributes', i]);
            }
        });
    }

    // demoSchema
    const demos = value.demoSchema;
    const ownTag = tagFromFileName(fileName);
    if (Array.isArray(demos)) {
        let sawOwn = false;
        demos.forEach((demo) => {
            if (!isObject(demo) || typeof demo.tag !== 'string') {
                return;
            }
            if (demo.tag === ownTag) {
                sawOwn = true;
            }
        });
        if (ownTag && demos.length > 0 && !sawOwn && ownTag.includes('-')) {
            add(CODES.noOwnDemo, 'info',
                `No demoSchema entry uses <${ownTag}>. HAX inserts the first demo, so it usually should.`,
                ['demoSchema'], true);
        }
    }
    return out;
}

type Add = (code: string, severity: Finding['severity'], message: string, path: JSONPath, key?: boolean) => void;

function checkFieldList(list: unknown[], base: JSONPath, add: Add): void {
    const seen = new Map<string, number>();
    list.forEach((field, i) => {
        if (!isObject(field)) {
            return;
        }
        const path = [...base, i];
        const method = typeof field.inputMethod === 'string' ? field.inputMethod : 'textfield';
        const hasBinding = 'property' in field || 'attribute' in field || 'slot' in field;

        if (!hasBinding && !CONTAINER_METHODS.has(method)) {
            add(CODES.missingBinding, 'warning',
                'Field is not bound to anything. Add "property", "attribute" or "slot".', path);
        }

        const binding = 'property' in field ? `property:${String(field.property)}`
            : 'attribute' in field ? `attribute:${String(field.attribute)}`
                : 'slot' in field ? `slot:${String(field.slot)}` : undefined;
        if (binding) {
            const first = seen.get(binding);
            if (first !== undefined) {
                const [kind, name] = binding.split(/:(.*)/s);
                add(CODES.duplicateBinding, 'warning',
                    `${kind} "${name}" is already bound by field ${first} in this list.`,
                    [...path, kind], true);
            } else {
                seen.set(binding, i);
            }
        }

        if (typeof field.property === 'string' && field.property.includes('-')) {
            add(CODES.propertyCase, 'warning',
                `"property" is the camelCase JS name. Use "${camel(field.property)}", or bind with "attribute": "${field.property}".`,
                [...path, 'property']);
        }
        if (typeof field.attribute === 'string' && /[A-Z]/.test(field.attribute)) {
            add(CODES.attributeCase, 'warning',
                `"attribute" is the kebab-case HTML name. Use "${kebab(field.attribute)}", or bind with "property": "${field.attribute}".`,
                [...path, 'attribute']);
        }

        if (CHOICE_METHODS.has(method) && !('options' in field) && !('itemsList' in field)) {
            add(CODES.missingOptions, 'warning',
                `${method} needs "options" to choose from.`, [...path, 'inputMethod']);
        }
        if (method === 'slider' && (field.min === undefined || field.max === undefined)) {
            add(CODES.sliderRange, 'info',
                'Slider has no "min"/"max"; it will use the control defaults.', [...path, 'inputMethod']);
        }
        if (typeof field.validation === 'string') {
            try {
                new RegExp(field.validation);
            } catch (e) {
                add(CODES.badRegex, 'error',
                    `"validation" is not a valid regular expression: ${(e as Error).message}`,
                    [...path, 'validation']);
            }
        }
        for (const key of Object.keys(field)) {
            if (!FIELD_KEYS.includes(key)) {
                const guess = suggest(key, FIELD_KEYS);
                if (guess) {
                    add(CODES.fieldKeyTypo, 'warning',
                        `Unknown field key "${key}". Did you mean "${guess}"?`, [...path, key], true);
                }
            }
        }
        if (Array.isArray(field.properties)) {
            checkFieldList(field.properties, [...path, 'properties'], add);
        }
    });
}

function kebab(s: string): string {
    return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();
}

function camel(s: string): string {
    return s.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}
