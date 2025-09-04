import * as assert from 'assert';
import { HAXSchemaCompletionProvider } from '../../completionProvider';

suite('HAXSchema Completion Provider Test Suite', () => {
    let provider: HAXSchemaCompletionProvider;

    setup(() => {
        provider = new HAXSchemaCompletionProvider();
    });

    test('Should create completion provider', () => {
        assert.ok(provider, 'Should create completion provider');
    });

    test('Should provide documentation', () => {
        const hover = provider.getDocumentation('api');
        assert.ok(hover, 'Should return hover information');
        assert.ok(hover.contents, 'Should have content in hover');
    });
});
