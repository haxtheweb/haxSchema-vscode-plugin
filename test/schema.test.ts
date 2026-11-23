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
// the docs schema points at haxschema.json for the embedded haxProperties;
// ajv finds it by $id because `base` was compiled on this instance
const docs = ajv.compile(read('schemas/haxschema-docs.json'));

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

    test('accepts designSystem true / false', () => {
        assert.ok(base({ designSystem: true }), errorsOf(base));
        assert.ok(base({ designSystem: false }), errorsOf(base));
    });

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

suite('haxschema-docs.json', () => {
    for (const file of globSync('test/fixtures/docs/*.docs.json', { cwd: root })) {
        test(`accepts ${path.basename(file)}`, () => {
            assert.ok(docs(read(file)), errorsOf(docs));
        });
    }

    const sample = () => read('test/fixtures/docs/meme-maker.docs.json');
    const video = { id: '', title: 'Meme maker', source: 'https://www.youtube.com/watch?v=x', captions: 'meme-maker.captions.vtt', tutorial: '', order: 0 };

    test('accepts video tutorials', () => {
        const withVideo = { ...sample(), videos: [video, { ...video, id: 'add-text', order: 100 }], video };
        assert.ok(docs(withVideo), errorsOf(docs));
    });

    test('accepts a reviewed walkthrough', () => {
        const d = sample();
        d.walkthroughs[0].status = 'reviewed';
        d.motion.status = 'reviewed';
        assert.ok(docs(d), errorsOf(docs));
    });

    const reject = (name: string, change: (d: ReturnType<typeof sample>) => void, where: string) => test(name, () => {
        const d = sample();
        change(d);
        assert.ok(!docs(d));
        assert.ok(docs.errors?.some((e) => e.instancePath === where), errorsOf(docs));
    });
    reject('rejects a missing key', (d) => { delete d.surfaceHash; }, '');
    reject('rejects an unknown key', (d) => { d.demo = ''; }, '');
    reject('rejects an event without a name', (d) => { d.events.push(null); }, `/events/${sample().events.length}`);
    reject('rejects a malformed surface hash', (d) => { d.surfaceHash = 'abc'; }, '/surfaceHash');
    reject('rejects an unknown walkthrough status', (d) => { d.walkthroughs[0].status = 'approved'; }, '/walkthroughs/0/status');
    reject('rejects "none" on a walkthrough', (d) => { d.walkthroughs[0].status = 'none'; }, '/walkthroughs/0/status');
    reject('rejects a storyboard outside lib/', (d) => { d.walkthroughs[0].file = 'meme-maker.motion.json'; }, '/walkthroughs/0/file');
    reject('rejects a video without a source', (d) => { d.videos = [{ ...video, source: '' }]; }, '/videos/0/source');
    reject('rejects an attribute without a name', (d) => { delete d.attributes[0].name; }, '/attributes/0');
    reject('rejects an unknown HAX input on an attribute', (d) => {
        d.attributes.find((a: { hax: unknown }) => a.hax).hax.input = 'textbox';
    }, `/attributes/${sample().attributes.findIndex((a: { hax: unknown }) => a.hax)}/hax/input`);
    reject('checks the embedded haxProperties with the haxProperties schema', (d) => { d.hax.type = 'block'; }, '/hax/type');
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
