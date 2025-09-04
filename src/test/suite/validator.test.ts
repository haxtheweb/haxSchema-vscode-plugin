import * as assert from 'assert';
import { HAXSchemaValidator } from '../../validator';

suite('HAXSchema Validator Test Suite', () => {
    let validator: HAXSchemaValidator;

    setup(() => {
        validator = new HAXSchemaValidator();
    });

    test('Should validate valid HAXSchema', () => {
        const validSchema = `{
            "api": "1",
            "type": "element",
            "gizmo": {
                "title": "Test Component",
                "description": "A test component",
                "icon": "editor:code",
                "color": "blue"
            }
        }`;

        const errors = validator.validate(validSchema);
        assert.strictEqual(errors.length, 0, 'Valid schema should have no errors');
    });

    test('Should detect missing required properties', () => {
        const invalidSchema = `{
            "type": "element"
        }`;

        const errors = validator.validate(invalidSchema);
        assert.ok(errors.length > 0, 'Should have validation errors');
        assert.ok(errors.some(e => e.message.includes('api')), 'Should detect missing api property');
    });

    test('Should detect invalid type values', () => {
        const invalidSchema = `{
            "api": "1",
            "type": "invalid-type"
        }`;

        const errors = validator.validate(invalidSchema);
        assert.ok(errors.length > 0, 'Should have validation errors');
        assert.ok(errors.some(e => e.message.includes('Invalid value')), 'Should detect invalid type');
    });

    test('Should detect invalid gizmo structure', () => {
        const invalidSchema = `{
            "api": "1",
            "type": "element",
            "gizmo": {
                "title": "Test"
            }
        }`;

        const errors = validator.validate(invalidSchema);
        assert.ok(errors.length > 0, 'Should have validation errors for incomplete gizmo');
    });

    test('Should detect invalid icon format', () => {
        const invalidSchema = `{
            "api": "1",
            "type": "element",
            "gizmo": {
                "title": "Test Component",
                "description": "A test component",
                "icon": "invalidicon",
                "color": "blue"
            }
        }`;

        const errors = validator.validate(invalidSchema);
        assert.ok(errors.some(e => e.message.includes('namespace:icon-name')), 'Should detect invalid icon format');
    });

    test('Should detect invalid demo schema tag names', () => {
        const invalidSchema = `{
            "api": "1",
            "type": "element",
            "demoSchema": [
                {
                    "tag": "invalidtag",
                    "properties": {}
                }
            ]
        }`;

        const errors = validator.validate(invalidSchema);
        assert.ok(errors.some(e => e.message.includes('hyphen')), 'Should detect invalid tag name');
    });

    test('Should detect JSON syntax errors', () => {
        const invalidJson = `{
            "api": "1",
            "type": "element"`;

        const errors = validator.validate(invalidJson);
        assert.ok(errors.length > 0, 'Should detect JSON syntax errors');
        assert.ok(errors.some(e => e.message.includes('Syntax Error')), 'Should have syntax error message');
    });

    test('Should validate settings fields correctly', () => {
        const invalidSchema = `{
            "api": "1",
            "type": "element",
            "settings": {
                "configure": [
                    {
                        "title": "Invalid Field",
                        "inputMethod": "select"
                    }
                ]
            }
        }`;

        const errors = validator.validate(invalidSchema);
        assert.ok(errors.some(e => e.message.includes('property", "attribute", or "slot"')), 'Should detect missing field binding');
        assert.ok(errors.some(e => e.message.includes('requires "options" property')), 'Should detect missing options for select');
    });

    test('Should identify HAXSchema files correctly', () => {
        assert.ok(validator.isHAXSchemaFile('test.haxProperties.json'), 'Should identify HAXSchema files');
        assert.ok(!validator.isHAXSchemaFile('test.json'), 'Should not identify regular JSON files');
        assert.ok(!validator.isHAXSchemaFile('test.txt'), 'Should not identify non-JSON files');
    });
});
