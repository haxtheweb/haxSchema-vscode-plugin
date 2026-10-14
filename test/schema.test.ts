import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';
import { globSync } from 'glob';

/**
 * Checks the shipped schemas against real haxProperties files from
 * haxtheweb/webcomponents (test/fixtures) so the schema can't drift into
 * rejecting what HAX actually accepts.
 */
const root = path.resolve(__dirname, '..', '..');
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
const base = ajv.compile(read('schemas/haxschema.json'));
const locale = ajv.compile(read('schemas/haxschema-locale.json'));

const errorsOf = (fn: typeof base) => JSON.stringify(fn.errors, null, 2);

suite('haxschema.json', () => {
    for (const file of globSync('test/fixtures/valid/*.haxProperties.json', { cwd: root })) {
        test(`accepts ${path.basename(file)}`, () => {
            assert.ok(base(read(file)), errorsOf(base));
        });
    }
    for (const file of globSync('examples/{my,test}-component.haxProperties.json', { cwd: root })) {
        test(`accepts ${file}`, () => {
            assert.ok(base(read(file)), errorsOf(base));
        });
    }

    test('accepts an empty object (HAXWiring fills defaults)', () => {
        assert.ok(base({}), errorsOf(base));
    });

    test('rejects the invalid example', () => {
        assert.ok(!base(read('examples/invalid-component.haxProperties.json')));
    });

    const reject = (name: string, value: unknown, where: string) => test(name, () => {
        assert.ok(!base(value));
        assert.ok(base.errors?.some((e) => e.instancePath === where), errorsOf(base));
    });
    reject('rejects unknown type', { type: 'block' }, '/type');
    reject('rejects unknown inputMethod', { settings: { configure: [{ property: 'a', inputMethod: 'textbox' }] } }, '/settings/configure/0/inputMethod');
    reject('rejects non-palette gizmo color', { gizmo: { title: 'x', color: 'black' } }, '/gizmo/color');
    reject('rejects unknown designSystem key', { designSystem: { font: true } }, '/designSystem');
    reject('rejects object validation', { settings: { configure: [{ property: 'a', validation: { min: 0 } }] } }, '/settings/configure/0/validation');
    reject('rejects unknown top-level key', { canEdit: true }, '');
});

suite('haxschema-locale.json', () => {
    for (const file of globSync('test/fixtures/locales/*.haxProperties.json', { cwd: root })) {
        test(`accepts ${path.basename(file)}`, () => {
            assert.ok(locale(read(file)), errorsOf(locale));
        });
    }
});

suite('manifest', () => {
    const pkg = read('package.json');
    test('every jsonValidation schema exists', () => {
        for (const v of pkg.contributes.jsonValidation) {
            assert.ok(fs.existsSync(path.join(root, v.url)), v.url);
        }
    });
    test('every command is contributed', () => {
        const src = fs.readFileSync(path.join(root, 'src/extension.ts'), 'utf8');
        for (const c of pkg.contributes.commands) {
            assert.ok(src.includes(`'${c.command}'`), c.command);
        }
    });
});
