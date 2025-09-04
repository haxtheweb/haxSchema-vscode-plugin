import * as vscode from 'vscode';

export class HAXSchemaCompletionProvider implements vscode.CompletionItemProvider {
    private readonly inputMethods = [
        'tabs', 'fieldset', 'array', 'textfield', 'alt', 'url', 'select', 
        'boolean', 'number', 'slider', 'radio', 'colorpicker', 'iconpicker', 
        'code-editor', 'fileupload', 'haxupload'
    ];

    private readonly colors = [
        'red', 'orange', 'yellow', 'green', 'blue', 'purple', 
        'pink', 'grey', 'black', 'white'
    ];

    private readonly validationTypes = ['url', 'email', 'number', 'text'];

    private readonly rootProperties = [
        'api', 'type', 'canScale', 'canEditSource', 'hideDefaultSettings',
        'designSystem', 'gizmo', 'settings', 'saveOptions', 'demoSchema'
    ];

    private readonly gizmoProperties = [
        'title', 'description', 'icon', 'color', 'tags', 'meta'
    ];

    private readonly settingsProperties = [
        'configure', 'advanced', 'developer'
    ];

    private readonly fieldProperties = [
        'property', 'attribute', 'slot', 'title', 'description', 'inputMethod',
        'required', 'validation', 'validationType', 'options', 'min', 'max', 
        'step', 'noVoiceRecord'
    ];

    private readonly designSystemProperties = [
        'accent', 'primary', 'card', 'text', 'designTreatment'
    ];

    private readonly saveOptionsProperties = [
        'wipeSlot', 'unsetAttributes'
    ];

    private readonly demoSchemaProperties = [
        'tag', 'properties', 'content'
    ];

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        
        const line = document.lineAt(position.line).text;
        const currentPath = this.getCurrentPath(document, position);
        
        // Get context-aware completions
        const completions: vscode.CompletionItem[] = [];
        
        if (this.isInPropertyName(line, position.character)) {
            completions.push(...this.getPropertyCompletions(currentPath));
        } else if (this.isInPropertyValue(line, position.character)) {
            completions.push(...this.getValueCompletions(currentPath, line));
        }

        return completions;
    }

    private getCurrentPath(document: vscode.TextDocument, position: vscode.Position): string[] {
        const text = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        const path: string[] = [];
        let braceCount = 0;
        let inString = false;
        let currentProperty = '';
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            if (char === '"' && (i === 0 || text[i - 1] !== '\\')) {
                inString = !inString;
                if (!inString && currentProperty) {
                    if (braceCount === 1) { // Root level property
                        path[0] = currentProperty;
                    } else if (braceCount === 2) { // Nested property
                        path[1] = currentProperty;
                    }
                    currentProperty = '';
                }
            } else if (!inString) {
                if (char === '{') {
                    braceCount++;
                } else if (char === '}') {
                    braceCount--;
                    if (path.length > braceCount) {
                        path.splice(braceCount);
                    }
                }
            } else if (inString) {
                currentProperty += char;
            }
        }
        
        return path;
    }

    private isInPropertyName(line: string, character: number): boolean {
        const beforeCursor = line.substring(0, character);
        const lastQuote = beforeCursor.lastIndexOf('"');
        const lastColon = beforeCursor.lastIndexOf(':');
        
        return lastQuote > lastColon;
    }

    private isInPropertyValue(line: string, character: number): boolean {
        const beforeCursor = line.substring(0, character);
        const lastColon = beforeCursor.lastIndexOf(':');
        const lastQuote = beforeCursor.lastIndexOf('"');
        
        return lastColon > lastQuote;
    }

    private getPropertyCompletions(currentPath: string[]): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        if (currentPath.length === 0) {
            // Root level properties
            this.rootProperties.forEach(prop => {
                const item = new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property);
                item.documentation = this.getPropertyDocumentation(prop);
                completions.push(item);
            });
        } else if (currentPath[0] === 'gizmo') {
            this.gizmoProperties.forEach(prop => {
                const item = new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property);
                item.documentation = this.getPropertyDocumentation(`gizmo.${prop}`);
                completions.push(item);
            });
        } else if (currentPath[0] === 'settings') {
            this.settingsProperties.forEach(prop => {
                const item = new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property);
                item.documentation = this.getPropertyDocumentation(`settings.${prop}`);
                completions.push(item);
            });
        } else if (currentPath[0] === 'designSystem') {
            this.designSystemProperties.forEach(prop => {
                const item = new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property);
                item.documentation = this.getPropertyDocumentation(`designSystem.${prop}`);
                completions.push(item);
            });
        } else if (currentPath[0] === 'saveOptions') {
            this.saveOptionsProperties.forEach(prop => {
                const item = new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property);
                item.documentation = this.getPropertyDocumentation(`saveOptions.${prop}`);
                completions.push(item);
            });
        } else if (currentPath[0] === 'settings' && 
                  ['configure', 'advanced', 'developer'].includes(currentPath[1])) {
            // Settings field properties
            this.fieldProperties.forEach(prop => {
                const item = new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property);
                item.documentation = this.getPropertyDocumentation(`field.${prop}`);
                completions.push(item);
            });
        } else if (currentPath[0] === 'demoSchema') {
            this.demoSchemaProperties.forEach(prop => {
                const item = new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property);
                item.documentation = this.getPropertyDocumentation(`demoSchema.${prop}`);
                completions.push(item);
            });
        }
        
        return completions;
    }

    private getValueCompletions(currentPath: string[], line: string): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        const property = this.getCurrentProperty(line);
        
        if (property === 'api') {
            completions.push(this.createValueCompletion('1', 'HAXSchema API version 1'));
        } else if (property === 'type') {
            completions.push(this.createValueCompletion('element', 'Block level element'));
            completions.push(this.createValueCompletion('grid', 'Container element that can have children'));
        } else if (property === 'inputMethod') {
            this.inputMethods.forEach(method => {
                completions.push(this.createValueCompletion(method, this.getInputMethodDescription(method)));
            });
        } else if (property === 'color' && currentPath[0] === 'gizmo') {
            this.colors.forEach(color => {
                completions.push(this.createValueCompletion(color, `HAX editor button color: ${color}`));
            });
        } else if (property === 'validationType') {
            this.validationTypes.forEach(type => {
                completions.push(this.createValueCompletion(type, `Built-in validation for ${type} format`));
            });
        } else if (['canScale', 'canEditSource', 'hideDefaultSettings', 'wipeSlot', 
                   'accent', 'primary', 'card', 'text', 'designTreatment', 
                   'required', 'noVoiceRecord'].includes(property)) {
            completions.push(this.createValueCompletion('true', 'Enable this option'));
            completions.push(this.createValueCompletion('false', 'Disable this option'));
        }
        
        return completions;
    }

    private getCurrentProperty(line: string): string {
        const match = line.match(/"([^"]+)"\s*:/);
        return match ? match[1] : '';
    }

    private createValueCompletion(value: string, description: string): vscode.CompletionItem {
        const item = new vscode.CompletionItem(`"${value}"`, vscode.CompletionItemKind.Value);
        item.documentation = new vscode.MarkdownString(description);
        item.insertText = `"${value}"`;
        return item;
    }

    private getInputMethodDescription(method: string): string {
        const descriptions: { [key: string]: string } = {
            'tabs': 'Organizing visual wrapper for tabs',
            'fieldset': 'Organizing visual wrapper for grouped fields',
            'array': 'Organizing wrapper for array of objects',
            'textfield': 'Text input field',
            'alt': 'Alt text with validation',
            'url': 'URL input with validation',
            'select': 'Select dropdown list',
            'boolean': 'Checkbox input',
            'number': 'Number input with validation',
            'slider': 'Slider input with min/max/step',
            'radio': 'Radio button selection',
            'colorpicker': 'Color picker input',
            'iconpicker': 'Icon selection picker',
            'code-editor': 'Monaco code editor',
            'fileupload': 'File upload field',
            'haxupload': 'HAX-integrated file upload'
        };
        return descriptions[method] || `Input method: ${method}`;
    }

    private getPropertyDocumentation(property: string): vscode.MarkdownString {
        const docs: { [key: string]: string } = {
            'api': 'HAXSchema API version (currently "1")',
            'type': 'Element type: "element" for block level, "grid" for containers',
            'canScale': 'Whether to show the width scaler in HAX editor',
            'canEditSource': 'Whether to show inline "view source" button',
            'hideDefaultSettings': 'Hide design system and textual alignment options',
            'designSystem': 'Design system form inputs to display',
            'gizmo': 'Metadata for HAX editor listing and search',
            'settings': 'Form fields for element configuration',
            'saveOptions': 'Options for saving/serializing the element',
            'demoSchema': 'Array of demo configurations for the element',
            'gizmo.title': 'Display name in HAX editor',
            'gizmo.description': 'Description shown in HAX editor',
            'gizmo.icon': 'Icon identifier (e.g., "editor:format-quote")',
            'gizmo.color': 'Color for the HAX editor button',
            'gizmo.tags': 'Tags for search and filtering in HAX',
            'gizmo.meta': 'Additional metadata',
            'settings.configure': 'Main configuration fields',
            'settings.advanced': 'Advanced configuration fields',
            'settings.developer': 'Developer configuration fields',
            'field.property': 'Property name to bind to',
            'field.attribute': 'Attribute name to bind to',
            'field.slot': 'Slot name to bind to',
            'field.title': 'Field label shown to user',
            'field.description': 'Help text for the field',
            'field.inputMethod': 'Input control type',
            'field.required': 'Whether field is required',
            'field.validation': 'Validation pattern or type',
            'field.validationType': 'Built-in validation type',
            'field.options': 'Options for select/radio inputs',
            'field.min': 'Minimum value for number/slider',
            'field.max': 'Maximum value for number/slider',
            'field.step': 'Step value for number/slider',
            'field.noVoiceRecord': 'Disable voice recording for this field',
            'designSystem.accent': 'Show accent color picker',
            'designSystem.primary': 'Show primary color picker',
            'designSystem.card': 'Show card styling options',
            'designSystem.text': 'Show text/font options',
            'designSystem.designTreatment': 'Show special design treatment options',
            'saveOptions.wipeSlot': 'Remove lightDom content when saving',
            'saveOptions.unsetAttributes': 'Attributes to remove before saving',
            'demoSchema.tag': 'Web component tag name',
            'demoSchema.properties': 'Properties to set on the element',
            'demoSchema.content': 'Inner HTML content for the element'
        };
        
        const doc = docs[property] || `HAXSchema property: ${property}`;
        return new vscode.MarkdownString(`**${property}**\n\n${doc}`);
    }

    getDocumentation(property: string): vscode.Hover | null {
        const doc = this.getPropertyDocumentation(property);
        return new vscode.Hover(doc);
    }
}
