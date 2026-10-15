import * as vscode from 'vscode';
import { Finding } from './jsonUtil';
import { isHaxPropertiesFile, validateHaxProperties } from './validator';
import { demoToHtml } from './demo';

const SEVERITY: Record<Finding['severity'], vscode.DiagnosticSeverity> = {
    error: vscode.DiagnosticSeverity.Error,
    warning: vscode.DiagnosticSeverity.Warning,
    info: vscode.DiagnosticSeverity.Information,
    hint: vscode.DiagnosticSeverity.Hint,
};

export function activate(context: vscode.ExtensionContext): void {
    const collection = vscode.languages.createDiagnosticCollection('haxschema');
    const timers = new Map<string, NodeJS.Timeout>();

    const run = (doc: vscode.TextDocument) => {
        if (!isHaxPropertiesFile(doc.fileName)) {
            return;
        }
        const enabled = vscode.workspace.getConfiguration('haxschema', doc.uri).get<boolean>('semanticValidation', true);
        if (!enabled) {
            collection.delete(doc.uri);
            return;
        }
        const findings = validateHaxProperties(doc.getText(), doc.fileName);
        collection.set(doc.uri, findings.map((f) => {
            const range = new vscode.Range(doc.positionAt(f.offset), doc.positionAt(f.offset + f.length));
            const d = new vscode.Diagnostic(range, f.message, SEVERITY[f.severity]);
            d.source = 'HAXSchema';
            d.code = f.code;
            return d;
        }));
    };

    const schedule = (doc: vscode.TextDocument) => {
        const key = doc.uri.toString();
        clearTimeout(timers.get(key));
        timers.set(key, setTimeout(() => {
            timers.delete(key);
            run(doc);
        }, 250));
    };

    context.subscriptions.push(
        collection,
        vscode.workspace.onDidOpenTextDocument(run),
        vscode.workspace.onDidChangeTextDocument((e) => schedule(e.document)),
        vscode.workspace.onDidCloseTextDocument((doc) => collection.delete(doc.uri)),
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('haxschema')) {
                vscode.workspace.textDocuments.forEach(run);
            }
        }),
        vscode.commands.registerCommand('haxschema.validateFile', () => {
            const doc = activeHaxDocument();
            if (!doc) {
                return;
            }
            run(doc);
            const count = vscode.languages.getDiagnostics(doc.uri).length;
            vscode.window.showInformationMessage(count === 0
                ? 'HAXSchema: no problems found.'
                : `HAXSchema: ${count} problem(s) — see the Problems panel.`);
        }),
        vscode.commands.registerCommand('haxschema.createDemo', async () => {
            const doc = activeHaxDocument();
            if (!doc) {
                return;
            }
            let props: { demoSchema?: unknown[] };
            try {
                props = JSON.parse(doc.getText());
            } catch {
                vscode.window.showErrorMessage('HAXSchema: fix the JSON syntax errors first.');
                return;
            }
            const demos = Array.isArray(props.demoSchema) ? props.demoSchema : [];
            if (!demos.length) {
                vscode.window.showWarningMessage('HAXSchema: this file has no demoSchema entries.');
                return;
            }
            const html = demoToHtml(demos);
            const out = await vscode.workspace.openTextDocument({ content: html, language: 'html' });
            await vscode.window.showTextDocument(out, { preview: false });
        }),
    );

    vscode.workspace.textDocuments.forEach(run);
}

function activeHaxDocument(): vscode.TextDocument | undefined {
    const doc = vscode.window.activeTextEditor?.document;
    if (!doc || !isHaxPropertiesFile(doc.fileName)) {
        vscode.window.showErrorMessage('Open a .haxProperties.json file first.');
        return undefined;
    }
    return doc;
}

export function deactivate(): void {
    // nothing to clean up beyond context.subscriptions
}
