import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';
import { globSync } from 'glob';
import { validateHaxProperties } from '../src/validator';

/**
 * Drift check against a checkout of haxtheweb/webcomponents, so the schema
 * keeps up with what HAX reads at runtime. Runs only when WEBCOMPONENTS_DIR
 * points at that checkout (CI does a sparse checkout of master); skipped
 * otherwise so `npm test` works offline.
 *
 * - every elements/<name>/lib/<name>.haxProperties.json passes the schema
 *   and has no error-level HAX check
 * - every input method HAXFields / SimpleFields define is in the schema enum
 */
const wc = process.env.WEBCOMPONENTS_DIR;
const root = path.resolve(__dirname, '..', '..');
const schema = JSON.parse(fs.readFileSync(path.join(root, 'schemas/haxschema.json'), 'utf8'));

/**
 * Keys of each object literal opened by a line that is exactly
 * `inputMethod: {` (the field registries in HAXFields.js and
 * simple-fields.js). Counts braces line by line; one level down is a key.
 */
export function inputMethodKeys(source: string): string[] {
    const keys: string[] = [];
    const lines = source.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() !== 'inputMethod: {') {
            continue;
        }
        let depth = 1;
        for (let j = i + 1; j < lines.length && depth > 0; j++) {
            const line = lines[j];
            if (depth === 1) {
                const m = /^\s*"?([A-Za-z][\w-]*)"?\s*:\s*\{/.exec(line);
                if (m) {
                    keys.push(m[1]);
                }
            }
            for (const ch of line) {
                if (ch === '{') {
                    depth++;
                } else if (ch === '}') {
                    depth--;
                }
            }
        }
    }
    return keys;
}

suite('inputMethodKeys', () => {
    test('reads one level of keys under inputMethod', () => {
        const src = [
            'const x = {',
            '  inputMethod: {',
            '    alt: {',
            '      defaultSettings: { type: "string" },',
            '    },',
            '    "image-framing": {',
            '      defaultSettings: {',
            '        nested: {},',
            '      },',
            '    },',
            '  },',
            '  other: { notThis: {} },',
            '};',
        ].join('\n');
        assert.deepStrictEqual(inputMethodKeys(src), ['alt', 'image-framing']);
    });
});

(wc ? suite : suite.skip)('webcomponents master', () => {
    const dir = wc ?? '';
    const ajv = new Ajv({ allErrors: true, strict: false });
    const base = ajv.compile(schema);

    test('every input method HAX defines is in the schema', () => {
        const allowed = new Set<string>(schema.definitions.inputMethod.enum);
        const sources = [
            'elements/hax-body-behaviors/lib/HAXFields.js',
            'elements/simple-fields/simple-fields.js',
        ];
        const missing: string[] = [];
        for (const file of sources) {
            const keys = inputMethodKeys(fs.readFileSync(path.join(dir, file), 'utf8'));
            assert.ok(keys.length > 0, `no inputMethod registry found in ${file}`);
            for (const key of keys) {
                if (!allowed.has(key)) {
                    missing.push(`${key} (${file})`);
                }
            }
        }
        assert.deepStrictEqual(missing, [], 'input methods missing from schemas/haxschema.json');
    });

    const files = globSync('elements/*/lib/*.haxProperties.json', { cwd: dir });
    test('finds haxProperties files', () => {
        assert.ok(files.length > 0, `none under ${dir}`);
    });
    for (const file of files) {
        test(`accepts ${file}`, () => {
            const text = fs.readFileSync(path.join(dir, file), 'utf8');
            assert.ok(base(JSON.parse(text)), JSON.stringify(base.errors, null, 2));
            const errors = validateHaxProperties(text, file).filter((f) => f.severity === 'error');
            assert.deepStrictEqual(errors, []);
        });
    }
});
