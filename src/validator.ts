import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import * as fs from 'fs';
import * as path from 'path';

interface HAXSchemaValidationError {
    message: string;
    path: string;
    line?: number;
    column?: number;
}

export class HAXSchemaValidator {
    private ajv: Ajv;
    private validateFunction: ValidateFunction<any> | null = null;
    private schema: any;

    constructor() {
        this.ajv = new Ajv({ 
            allErrors: true, 
            verbose: true,
            strict: false
        });
        this.loadSchema();
    }

    private loadSchema() {
        try {
            // Load the schema from the schemas directory
            const schemaPath = path.join(__dirname, '..', 'schemas', 'haxschema.json');
            this.schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
            this.validateFunction = this.ajv.compile(this.schema);
        } catch (error) {
            console.error('Failed to load HAXSchema:', error);
        }
    }

    validate(jsonContent: string): HAXSchemaValidationError[] {
        const errors: HAXSchemaValidationError[] = [];

        if (!this.validateFunction) {
            errors.push({
                message: 'Schema validation not available',
                path: '',
                line: 0,
                column: 0
            });
            return errors;
        }

        try {
            const data = JSON.parse(jsonContent);
            const valid = this.validateFunction(data);

            if (!valid && this.validateFunction.errors) {
                for (const error of this.validateFunction.errors) {
                    const position = this.findPositionInJson(jsonContent, error.instancePath || '');
                    errors.push({
                        message: this.formatErrorMessage(error),
                        path: error.instancePath || 'root',
                        line: position.line,
                        column: position.column
                    });
                }
            }

            // Additional semantic validation
            errors.push(...this.performSemanticValidation(data, jsonContent));

        } catch (parseError) {
            const syntaxError = this.parseSyntaxError(parseError as Error, jsonContent);
            errors.push(syntaxError);
        }

        return errors;
    }

    private formatErrorMessage(error: any): string {
        const { keyword, message, params } = error;
        
        switch (keyword) {
            case 'required':
                return `Missing required property: ${params.missingProperty}`;
            case 'enum':
                return `Invalid value. Allowed values: ${params.allowedValues.join(', ')}`;
            case 'type':
                return `Expected ${params.type} but got ${typeof error.data}`;
            case 'pattern':
                return `String does not match required pattern: ${params.pattern}`;
            case 'minLength':
                return `String is too short (minimum length: ${params.limit})`;
            case 'maxLength':
                return `String is too long (maximum length: ${params.limit})`;
            case 'minimum':
                return `Number is too small (minimum: ${params.limit})`;
            case 'maximum':
                return `Number is too large (maximum: ${params.limit})`;
            default:
                return message || 'Validation error';
        }
    }

    private findPositionInJson(jsonContent: string, instancePath: string): { line: number; column: number } {
        const lines = jsonContent.split('\n');
        
        if (!instancePath || instancePath === '') {
            return { line: 0, column: 0 };
        }

        // Convert JSON path to property search
        const pathParts = instancePath.replace(/^\//, '').split('/');
        let currentLine = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Look for the property in the current path
            if (pathParts.length > 0) {
                const currentProperty = pathParts[pathParts.length - 1];
                if (line.includes(`"${currentProperty}"`)) {
                    return { line: i, column: line.indexOf(`"${currentProperty}"`) };
                }
            }
        }

        return { line: 0, column: 0 };
    }

    private parseSyntaxError(error: Error, jsonContent: string): HAXSchemaValidationError {
        const message = error.message;
        let line = 0;
        let column = 0;

        // Try to extract line and column from JSON syntax error
        const positionMatch = message.match(/position (\d+)/);
        if (positionMatch) {
            const position = parseInt(positionMatch[1], 10);
            const lines = jsonContent.substring(0, position).split('\n');
            line = lines.length - 1;
            column = lines[lines.length - 1].length;
        }

        return {
            message: `JSON Syntax Error: ${message}`,
            path: 'root',
            line,
            column
        };
    }

    private performSemanticValidation(data: any, jsonContent: string): HAXSchemaValidationError[] {
        const errors: HAXSchemaValidationError[] = [];

        // Validate gizmo icon format
        if (data.gizmo && data.gizmo.icon) {
            const icon = data.gizmo.icon;
            if (typeof icon === 'string' && !icon.includes(':')) {
                const position = this.findPositionInJson(jsonContent, '/gizmo/icon');
                errors.push({
                    message: 'Icon should be in format "namespace:icon-name" (e.g., "editor:format-quote")',
                    path: '/gizmo/icon',
                    line: position.line,
                    column: position.column
                });
            }
        }

        // Validate demo schema tag names
        if (data.demoSchema && Array.isArray(data.demoSchema)) {
            data.demoSchema.forEach((demo: any, index: number) => {
                if (demo.tag && typeof demo.tag === 'string') {
                    if (!demo.tag.includes('-')) {
                        const position = this.findPositionInJson(jsonContent, `/demoSchema/${index}/tag`);
                        errors.push({
                            message: 'Web component tag names must contain at least one hyphen',
                            path: `/demoSchema/${index}/tag`,
                            line: position.line,
                            column: position.column
                        });
                    }
                }
            });
        }

        // Validate settings field configurations
        if (data.settings) {
            ['configure', 'advanced', 'developer'].forEach(section => {
                if (data.settings[section] && Array.isArray(data.settings[section])) {
                    data.settings[section].forEach((field: any, index: number) => {
                        // Check that field has either property, attribute, or slot
                        if (!field.property && !field.attribute && !field.slot) {
                            const position = this.findPositionInJson(jsonContent, `/settings/${section}/${index}`);
                            errors.push({
                                message: 'Settings field must have either "property", "attribute", or "slot"',
                                path: `/settings/${section}/${index}`,
                                line: position.line,
                                column: position.column
                            });
                        }

                        // Validate select/radio fields have options
                        if (['select', 'radio'].includes(field.inputMethod) && !field.options) {
                            const position = this.findPositionInJson(jsonContent, `/settings/${section}/${index}/inputMethod`);
                            errors.push({
                                message: `${field.inputMethod} input method requires "options" property`,
                                path: `/settings/${section}/${index}/inputMethod`,
                                line: position.line,
                                column: position.column
                            });
                        }

                        // Validate slider/number fields have min/max when appropriate
                        if (['slider'].includes(field.inputMethod)) {
                            if (field.min === undefined || field.max === undefined) {
                                const position = this.findPositionInJson(jsonContent, `/settings/${section}/${index}/inputMethod`);
                                errors.push({
                                    message: 'Slider input method should have "min" and "max" properties',
                                    path: `/settings/${section}/${index}/inputMethod`,
                                    line: position.line,
                                    column: position.column
                                });
                            }
                        }
                    });
                }
            });
        }

        return errors;
    }

    isHAXSchemaFile(fileName: string): boolean {
        return fileName.endsWith('.haxProperties.json');
    }
}
