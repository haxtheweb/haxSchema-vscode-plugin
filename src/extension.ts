import * as vscode from 'vscode';
import { HAXSchemaCompletionProvider } from './completionProvider';
import { HAXSchemaValidator } from './validator';
import { HAXSchemaDiagnosticsProvider } from './diagnostics';

export function activate(context: vscode.ExtensionContext) {
    console.log('HAXSchema extension is now active');

    // Initialize providers
    const completionProvider = new HAXSchemaCompletionProvider();
    const validator = new HAXSchemaValidator();
    const diagnosticsProvider = new HAXSchemaDiagnosticsProvider(validator);

    // Register completion provider
    const completionProviderDisposable = vscode.languages.registerCompletionItemProvider(
        { 
            scheme: 'file', 
            pattern: '**/*.haxProperties.json'
        },
        completionProvider,
        '"', // Trigger completion on quote
        ':', // Trigger completion on colon
        ' ', // Trigger completion on space
        '\n', // Trigger completion on new line
        ','  // Trigger completion on comma
    );

    // Register hover provider for documentation
    const hoverProvider = vscode.languages.registerHoverProvider(
        { scheme: 'file', pattern: '**/*.haxProperties.json' },
        {
            provideHover(document, position, token) {
                const range = document.getWordRangeAtPosition(position, /["'][\w-]+["']/);
                if (range) {
                    const word = document.getText(range).replace(/['"]/g, '');
                    return completionProvider.getDocumentation(word);
                }
                return null;
            }
        }
    );

    // Register diagnostic provider for validation
    const diagnosticsProviderDisposable = diagnosticsProvider.register();

    // Register commands
    const validateCommand = vscode.commands.registerCommand('haxschema.validateFile', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.fileName.endsWith('.haxProperties.json')) {
            diagnosticsProvider.updateDiagnostics(editor.document);
            vscode.window.showInformationMessage('HAXSchema validation completed');
        } else {
            vscode.window.showErrorMessage('Please open a .haxProperties.json file');
        }
    });

    const createDemoCommand = vscode.commands.registerCommand('haxschema.createDemo', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document.fileName.endsWith('.haxProperties.json')) {
            vscode.window.showErrorMessage('Please open a .haxProperties.json file');
            return;
        }

        try {
            const document = editor.document;
            const text = document.getText();
            const haxSchema = JSON.parse(text);
            
            if (haxSchema.demoSchema && haxSchema.demoSchema.length > 0) {
                const demo = haxSchema.demoSchema[0];
                const htmlDemo = createHTMLDemo(demo);
                
                // Show the demo in a new document
                const doc = await vscode.workspace.openTextDocument({
                    content: htmlDemo,
                    language: 'html'
                });
                await vscode.window.showTextDocument(doc);
            } else {
                vscode.window.showWarningMessage('No demo schema found in this HAXSchema file');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error creating demo: ${error}`);
        }
    });

    // Add disposables to context
    context.subscriptions.push(
        completionProviderDisposable,
        hoverProvider,
        diagnosticsProviderDisposable,
        validateCommand,
        createDemoCommand
    );

    console.log('HAXSchema extension activation complete');
}

function createHTMLDemo(demo: any): string {
    const { tag, properties = {}, content = '' } = demo;
    
    // Build attributes from properties
    let attributes = '';
    for (const [key, value] of Object.entries(properties)) {
        if (typeof value === 'string') {
            attributes += ` ${key}="${value}"`;
        } else if (typeof value === 'boolean') {
            if (value) {
                attributes += ` ${key}`;
            }
        } else if (typeof value === 'number') {
            attributes += ` ${key}="${value}"`;
        }
    }
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HAX Component Demo</title>
    <!-- Add your web component import here -->
    <!-- <script type="module" src="path/to/${tag}.js"></script> -->
</head>
<body>
    <h1>HAX Component Demo: ${tag}</h1>
    <div class="demo-container">
        <${tag}${attributes}>
            ${content}
        </${tag}>
    </div>
</body>
</html>`;
}

export function deactivate() {
    console.log('HAXSchema extension is now deactivated');
}
