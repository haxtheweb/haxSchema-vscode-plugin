import * as assert from 'assert';
import { CODES, isLocaleFile, tagFromFileName, validateHaxProperties } from '../src/validator';
import { toAttributes } from '../src/demo';

const codes = (text: string, file = 'my-el.haxProperties.json') =>
    validateHaxProperties(text, file).map((f) => f.code);

const withField = (field: object, extra: object = {}) => JSON.stringify({
    settings: { configure: [field] },
    demoSchema: [{ tag: 'my-el', properties: {} }],
    ...extra,
}, null, 2);

suite('semantic validation', () => {
    test('clean file has no findings', () => {
        assert.deepStrictEqual(codes(withField({ property: 'title', inputMethod: 'textfield' })), []);
    });

    test('default slot "" counts as a binding', () => {
        assert.deepStrictEqual(codes(withField({ slot: '', inputMethod: 'code-editor' })), []);
    });

    test('unbound field', () => {
        assert.deepStrictEqual(codes(withField({ title: 'x' })), [CODES.missingBinding]);
    });

    test('container inputs need no binding', () => {
        assert.deepStrictEqual(codes(withField({ inputMethod: 'tabs', properties: [{ property: 'a' }] })), []);
    });

    test('select without options', () => {
        assert.deepStrictEqual(codes(withField({ property: 'a', inputMethod: 'select' })), [CODES.missingOptions]);
        assert.deepStrictEqual(codes(withField({ property: 'a', inputMethod: 'select', options: { x: 'X' } })), []);
        assert.deepStrictEqual(codes(withField({ property: 'a', inputMethod: 'select', itemsList: [] })), []);
    });

    test('slider range', () => {
        assert.deepStrictEqual(codes(withField({ property: 'a', inputMethod: 'slider' })), [CODES.sliderRange]);
    });

    test('duplicate binding in one list', () => {
        const text = JSON.stringify({ settings: { configure: [{ property: 'a' }, { property: 'a' }] } });
        assert.deepStrictEqual(codes(text, ''), [CODES.duplicateBinding]);
    });

    test('same binding in nested array fields is fine', () => {
        const text = JSON.stringify({
            settings: { configure: [{ property: 'items', inputMethod: 'array', properties: [{ property: 'title' }] }, { property: 'title' }] },
        });
        assert.deepStrictEqual(codes(text, ''), []);
    });

    test('camelCase unsetAttributes', () => {
        const findings = validateHaxProperties(JSON.stringify({ saveOptions: { unsetAttributes: ['editMode', 'data-x'] } }), '');
        assert.deepStrictEqual(findings.map((f) => f.code), [CODES.unsetAttributeCase]);
        assert.match(findings[0].message, /"edit-mode"/);
    });

    test('property / attribute casing', () => {
        assert.deepStrictEqual(codes(withField({ property: 'post-mark' })), [CODES.propertyCase]);
        assert.deepStrictEqual(codes(withField({ attribute: 'postMark' })), [CODES.attributeCase]);
    });

    test('invalid validation regex', () => {
        assert.deepStrictEqual(codes(withField({ property: 'a', validation: '([a-z' })), [CODES.badRegex]);
    });

    test('field key typo', () => {
        const findings = validateHaxProperties(withField({ property: 'a', desc: 'x' }), 'my-el.haxProperties.json');
        assert.deepStrictEqual(findings.map((f) => f.code), [CODES.fieldKeyTypo]);
        assert.match(findings[0].message, /"description"/);
    });

    test('unknown but deliberate keys are not flagged', () => {
        assert.deepStrictEqual(codes(withField({ property: 'a', someCustomFlag: true })), []);
    });

    test('demo for own tag', () => {
        const text = JSON.stringify({ demoSchema: [{ tag: 'other-el' }] });
        assert.deepStrictEqual(codes(text, '/x/lib/my-el.haxProperties.json'), [CODES.noOwnDemo]);
    });

    test('locale files and syntax errors are left to the JSON service', () => {
        assert.deepStrictEqual(codes('{"settings":{"configure":[{"title":"x"}]}}', '/x/locales/my-el.es.haxProperties.json'), []);
        assert.deepStrictEqual(codes('{ "api": '), []);
    });

    test('finding points at the offending key', () => {
        const text = withField({ property: 'a', desc: 'x' });
        const [f] = validateHaxProperties(text, 'my-el.haxProperties.json');
        assert.strictEqual(text.substr(f.offset, f.length), '"desc"');
    });
});

suite('helpers', () => {
    test('file name helpers', () => {
        assert.strictEqual(tagFromFileName('/a/b/lib/my-el.haxProperties.json'), 'my-el');
        assert.ok(isLocaleFile('/a/locales/my-el.fr.haxProperties.json'));
        assert.ok(isLocaleFile('C:\\a\\locales\\my-el.fr.haxProperties.json'));
        assert.ok(!isLocaleFile('/a/lib/my-el.haxProperties.json'));
    });

    test('demo attributes', () => {
        assert.strictEqual(
            toAttributes({ primaryColor: 'blue', open: true, hidden: false, items: [1], title: 'a "b"' }),
            ' primary-color="blue" open items=\'[1]\' title="a &quot;b&quot;"',
        );
    });
});
