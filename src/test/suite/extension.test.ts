import * as assert from 'assert';

suite('Extension Test Suite', () => {
    test('Basic test', () => {
        assert.strictEqual(1 + 1, 2, 'Basic math should work');
    });

    test('Extension modules should load', () => {
        // Test that we can import our modules without errors
        const { HAXSchemaValidator } = require('../../validator');
        const { HAXSchemaCompletionProvider } = require('../../completionProvider');
        
        assert.ok(HAXSchemaValidator, 'Should be able to load validator');
        assert.ok(HAXSchemaCompletionProvider, 'Should be able to load completion provider');
    });
});
