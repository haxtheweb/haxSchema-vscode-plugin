import * as vscode from 'vscode';
import { HAXSchemaValidator } from './validator';

export class HAXSchemaDiagnosticsProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private validator: HAXSchemaValidator;

    constructor(validator: HAXSchemaValidator) {
        this.validator = validator;
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('haxschema');
    }

    register(): vscode.Disposable {
        // Create disposable for all registrations
        const disposables: vscode.Disposable[] = [];

        // Listen for document changes
        disposables.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                if (this.validator.isHAXSchemaFile(event.document.fileName)) {
                    this.updateDiagnostics(event.document);
                }
            })
        );

        // Listen for document opens
        disposables.push(
            vscode.workspace.onDidOpenTextDocument((document) => {
                if (this.validator.isHAXSchemaFile(document.fileName)) {
                    this.updateDiagnostics(document);
                }
            })
        );

        // Listen for document saves
        disposables.push(
            vscode.workspace.onDidSaveTextDocument((document) => {
                if (this.validator.isHAXSchemaFile(document.fileName)) {
                    this.updateDiagnostics(document);
                }
            })
        );

        // Listen for document closes
        disposables.push(
            vscode.workspace.onDidCloseTextDocument((document) => {
                if (this.validator.isHAXSchemaFile(document.fileName)) {
                    this.diagnosticCollection.delete(document.uri);
                }
            })
        );

        // Validate all currently open HAX schema files
        vscode.workspace.textDocuments.forEach(document => {
            if (this.validator.isHAXSchemaFile(document.fileName)) {
                this.updateDiagnostics(document);
            }
        });

        // Return combined disposable
        return vscode.Disposable.from(...disposables, this.diagnosticCollection);
    }

    updateDiagnostics(document: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];
        
        try {
            const content = document.getText();
            const errors = this.validator.validate(content);

            for (const error of errors) {
                const line = Math.max(0, (error.line || 0));
                const column = Math.max(0, (error.column || 0));
                
                // Create range for the diagnostic
                const range = this.createDiagnosticRange(document, line, column, error.path);
                
                // Determine severity based on error type
                const severity = this.getErrorSeverity(error.message);
                
                const diagnostic = new vscode.Diagnostic(
                    range,
                    error.message,
                    severity
                );

                diagnostic.source = 'HAXSchema';
                diagnostic.code = this.getErrorCode(error.message);
                
                // Add related information if available
                if (error.path && error.path !== 'root') {
                    diagnostic.relatedInformation = [
                        new vscode.DiagnosticRelatedInformation(
                            new vscode.Location(document.uri, range),
                            `Path: ${error.path}`
                        )
                    ];
                }

                diagnostics.push(diagnostic);
            }
        } catch (validationError) {
            // If validation itself fails, show a general error
            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(0, 0, 0, 0),
                `HAXSchema validation failed: ${validationError}`,
                vscode.DiagnosticSeverity.Error
            );
            diagnostic.source = 'HAXSchema';
            diagnostics.push(diagnostic);
        }

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    private createDiagnosticRange(
        document: vscode.TextDocument, 
        line: number, 
        column: number, 
        path: string
    ): vscode.Range {
        const documentLine = Math.min(line, document.lineCount - 1);
        const lineText = document.lineAt(documentLine).text;
        
        // Try to find the specific property or value causing the error
        let startColumn = column;
        let endColumn = column + 1;

        // If we have a path, try to locate the property
        if (path && path !== 'root') {
            const pathParts = path.split('/').filter(p => p);
            const lastPart = pathParts[pathParts.length - 1];
            
            if (lastPart) {
                // Look for the property name in quotes
                const propertyMatch = lineText.indexOf(`"${lastPart}"`);
                if (propertyMatch !== -1) {
                    startColumn = propertyMatch;
                    endColumn = propertyMatch + lastPart.length + 2; // Include quotes
                } else {
                    // Look for the property name without quotes (in case it's a value)
                    const valueMatch = lineText.indexOf(lastPart);
                    if (valueMatch !== -1) {
                        startColumn = valueMatch;
                        endColumn = valueMatch + lastPart.length;
                    }
                }
            }
        } else {
            // If no specific path, try to highlight the entire property:value pair
            const colonIndex = lineText.indexOf(':', column);
            if (colonIndex !== -1) {
                // Find the start of the property name
                const openQuoteIndex = lineText.lastIndexOf('"', colonIndex);
                if (openQuoteIndex !== -1) {
                    startColumn = openQuoteIndex;
                    // Find the end of the value
                    const commaIndex = lineText.indexOf(',', colonIndex);
                    const braceIndex = lineText.indexOf('}', colonIndex);
                    const endIndex = Math.min(
                        commaIndex === -1 ? lineText.length : commaIndex,
                        braceIndex === -1 ? lineText.length : braceIndex
                    );
                    endColumn = endIndex;
                }
            }
        }

        // Ensure we don't go beyond the line length
        endColumn = Math.min(endColumn, lineText.length);
        startColumn = Math.min(startColumn, lineText.length);

        return new vscode.Range(documentLine, startColumn, documentLine, endColumn);
    }

    private getErrorSeverity(message: string): vscode.DiagnosticSeverity {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('missing required')) {
            return vscode.DiagnosticSeverity.Error;
        } else if (lowerMessage.includes('syntax error')) {
            return vscode.DiagnosticSeverity.Error;
        } else if (lowerMessage.includes('invalid value')) {
            return vscode.DiagnosticSeverity.Error;
        } else if (lowerMessage.includes('should')) {
            return vscode.DiagnosticSeverity.Warning;
        } else if (lowerMessage.includes('format')) {
            return vscode.DiagnosticSeverity.Information;
        } else {
            return vscode.DiagnosticSeverity.Warning;
        }
    }

    private getErrorCode(message: string): string {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('missing required')) {
            return 'HAX001';
        } else if (lowerMessage.includes('invalid value')) {
            return 'HAX002';
        } else if (lowerMessage.includes('syntax error')) {
            return 'HAX003';
        } else if (lowerMessage.includes('pattern')) {
            return 'HAX004';
        } else if (lowerMessage.includes('type')) {
            return 'HAX005';
        } else if (lowerMessage.includes('length')) {
            return 'HAX006';
        } else if (lowerMessage.includes('icon')) {
            return 'HAX007';
        } else if (lowerMessage.includes('tag name')) {
            return 'HAX008';
        } else if (lowerMessage.includes('input method')) {
            return 'HAX009';
        } else {
            return 'HAX000';
        }
    }

    dispose(): void {
        this.diagnosticCollection.dispose();
    }
}
