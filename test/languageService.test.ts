import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';
import { getLanguageService, TextDocument, Diagnostic } from 'vscode-json-languageservice';

/**
 * Runs the schemas through vscode-json-languageservice, the engine behind
 * VS Code's JSON support, wired up from package.json's jsonValidation the
 * way VS Code does it. This catches schema features VS Code handles
 * differently from ajv (defaultSnippets, fileMatch exclusions, hovers).
 */
const root = path.resolve(__dirname, '..', '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const schemaUri = (rel: string) => `ext://haxschema/${rel.replace(/^\.\//, '')}`;

const ls = getLanguageService({
    // VS Code resolves a relative $ref (haxschema-docs.json -> haxschema.json)
    // against the address of the schema that holds it
    workspaceContext: {
        resolveRelativePath: (relativePath, resource) => new URL(relativePath, resource).toString(),
    },
    schemaRequestService: async (uri) => fs.readFileSync(path.join(root, uri.replace('ext://haxschema/', '')), 'utf8'),
});
ls.configure({
    validate: true,
    allowComments: false,
    schemas: pkg.contributes.jsonValidation.map((v: { fileMatch: string | string[]; url: string }) => ({
        uri: schemaUri(v.url),
        fileMatch: Array.isArray(v.fileMatch) ? v.fileMatch : [v.fileMatch],
    })),
});

const doc = (uri: string, text: string) => TextDocument.create(uri, 'json', 1, text);

async function diagnose(uri: string, text: string): Promise<Diagnostic[]> {
    const d = doc(uri, text);
    return ls.doValidation(d, ls.parseJSONDocument(d));
}

suite('VS Code JSON language service', () => {
    for (const file of globSync('test/fixtures/valid/*.haxProperties.json', { cwd: root })) {
        test(`no diagnostics for ${path.basename(file)}`, async () => {
            const diags = await diagnose(`file:///ws/elements/x/lib/${path.basename(file)}`, fs.readFileSync(path.join(root, file), 'utf8'));
            assert.deepStrictEqual(diags.map((x) => x.message), []);
        });
    }

    test('locale files use the locale schema', async () => {
        const text = '{ "demoSchema": [ { "properties": { "title": "Hola" } } ] }';
        assert.strictEqual((await diagnose('file:///ws/el/locales/my-el.es.haxProperties.json', text)).length, 0);
        assert.ok((await diagnose('file:///ws/el/lib/my-el.haxProperties.json', text)).length > 0, 'base schema requires demo tag');
    });

    for (const file of globSync('test/fixtures/docs/*.docs.json', { cwd: root })) {
        test(`no diagnostics for ${path.basename(file)}`, async () => {
            const diags = await diagnose(`file:///ws/elements/x/lib/${path.basename(file)}`, fs.readFileSync(path.join(root, file), 'utf8'));
            assert.deepStrictEqual(diags.map((x) => x.message), []);
        });
    }

    test('docs data: embedded haxProperties are checked through the $ref', async () => {
        const data = JSON.parse(fs.readFileSync(path.join(root, 'test/fixtures/docs/meme-maker.docs.json'), 'utf8'));
        data.hax.settings.configure[0].inputMethod = 'textbox';
        data.events.push(null);
        const diags = await diagnose('file:///ws/elements/meme-maker/lib/meme-maker.docs.json', JSON.stringify(data, null, 2));
        assert.strictEqual(diags.length, 2, diags.map((x) => x.message).join('\n'));
    });

    test('docs data: only lib/<tag>.docs.json gets the schema', async () => {
        assert.ok((await diagnose('file:///ws/elements/my-el/lib/my-el.docs.json', '{}')).length > 0);
        assert.strictEqual((await diagnose('file:///ws/api.docs.json', '{}')).length, 0);
        assert.strictEqual((await diagnose('file:///ws/elements/my-el/lib/my-el.haxProperties.json', '{ "tag": "my-el" }').then((d) => d.length)), 1,
            'haxProperties files keep the haxProperties schema');
    });

    test('docs data: hover documents keys', async () => {
        const text = '{ "surfaceHash": "0123456789ab" }';
        const d = doc('file:///ws/elements/my-el/lib/my-el.docs.json', text);
        const hover = await ls.doHover(d, d.positionAt(4), ls.parseJSONDocument(d));
        assert.match(JSON.stringify(hover?.contents), /Fingerprint/);
    });

    test('unrelated JSON files are untouched', async () => {
        assert.strictEqual((await diagnose('file:///ws/package.json', '{ "type": "nope" }')).length, 0);
    });

    test('bad inputMethod is reported', async () => {
        const diags = await diagnose('file:///ws/a/my-el.haxProperties.json',
            '{ "settings": { "configure": [ { "property": "a", "inputMethod": "textbox" } ] } }');
        assert.strictEqual(diags.length, 1);
    });

    test('retired keys explain themselves', async () => {
        const diags = await diagnose('file:///ws/a/my-el.haxProperties.json',
            '{ "canPosition": true, "settings": { "saveOptions": {} } }');
        const text = diags.map((x) => x.message).join('\n');
        assert.match(text, /no longer used/);
        assert.match(text, /belongs at the top level/);
    });

    test('field snippets are offered inside settings.configure', async () => {
        const text = '{ "settings": { "configure": [  ] } }';
        const d = doc('file:///ws/a/my-el.haxProperties.json', text);
        const offset = text.indexOf('[') + 2;
        const list = await ls.doComplete(d, d.positionAt(offset), ls.parseJSONDocument(d));
        const labels = (list?.items ?? []).map((i) => i.label);
        for (const expected of ['textfield', 'select', 'haxupload (media)', 'array']) {
            assert.ok(labels.includes(expected), `missing ${expected} in ${labels.join(', ')}`);
        }
    });

    test('inputMethod values are completed', async () => {
        const text = '{ "settings": { "configure": [ { "inputMethod":  } ] } }';
        const d = doc('file:///ws/a/my-el.haxProperties.json', text);
        const offset = text.indexOf('"inputMethod":') + '"inputMethod": '.length;
        const list = await ls.doComplete(d, d.positionAt(offset), ls.parseJSONDocument(d));
        const labels = (list?.items ?? []).map((i) => i.label);
        assert.ok(labels.includes('"haxupload"'), labels.join(', '));
        assert.ok(labels.includes('"md-block"'), labels.join(', '));
    });

    test('hover documents keys', async () => {
        const text = '{ "canEditSource": true }';
        const d = doc('file:///ws/a/my-el.haxProperties.json', text);
        const hover = await ls.doHover(d, d.positionAt(4), ls.parseJSONDocument(d));
        assert.match(JSON.stringify(hover?.contents), /view source/);
    });
});
