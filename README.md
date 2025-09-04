# HAXSchema VSCode Extension

A comprehensive Visual Studio Code extension that provides language support, validation, and intelligent autocomplete for HAXSchema `.haxProperties.json` files used in the HAX ecosystem.

## Features

### ✨ Language Support
- **Syntax Highlighting**: Rich syntax highlighting for HAXSchema JSON files
- **File Recognition**: Automatic recognition of files matching `*.haxProperties.json`
- **JSON Schema Validation**: Real-time validation using comprehensive HAXSchema specification

### 🚀 Intelligent Autocomplete
- **Context-Aware Completions**: Smart autocomplete based on current JSON path and context
- **Property Suggestions**: Intelligent suggestions for HAXSchema properties
- **Value Completions**: Predefined value suggestions for enums (colors, input methods, etc.)
- **Documentation on Hover**: Detailed documentation for properties and values

### 🔍 Real-Time Validation
- **Schema Validation**: Comprehensive validation against HAXSchema specification
- **Semantic Validation**: Additional validation for HAX-specific patterns
- **Error Highlighting**: Real-time error detection with precise error locations
- **Diagnostic Messages**: Clear, actionable error messages with error codes

### 🛠️ Developer Tools
- **Snippet Library**: Extensive code snippets for common HAXSchema patterns
- **Command Palette**: Built-in commands for validation and demo generation
- **Demo Generation**: Convert demoSchema to HTML preview

## Installation

1. Clone or download this extension to your local machine
2. Open the extension folder in VSCode
3. Run `npm install` to install dependencies
4. Press `F5` to launch the extension development host
5. Open any `.haxProperties.json` file to see the extension in action

## Usage

### File Recognition
The extension automatically activates for files matching the pattern `*.haxProperties.json`.

### Autocompletion
- Type within JSON properties to get contextual suggestions
- Use `Ctrl+Space` to trigger manual completion
- Autocomplete includes:
  - Root-level HAXSchema properties
  - Nested object properties (gizmo, settings, etc.)
  - Enum values (colors, input methods, validation types)
  - Boolean values for configuration options

### Code Snippets
Type these prefixes and press `Tab` to insert:

- `haxschema` - Complete HAXSchema template
- `hax-gizmo` - Gizmo metadata section
- `hax-field-text` - Text field configuration
- `hax-field-bool` - Boolean field configuration  
- `hax-field-select` - Select field with options
- `hax-field-number` - Number field with min/max
- `hax-field-slider` - Slider field configuration
- `hax-field-url` - URL field with validation
- `hax-field-color` - Color picker field
- `hax-field-icon` - Icon picker field
- `hax-field-upload` - File upload field
- `hax-field-code` - Code editor field
- `hax-demo` - Demo schema entry
- `hax-design-system` - Design system configuration
- `hax-save-options` - Save options configuration

### Commands

Access these commands via the Command Palette (`Ctrl+Shift+P`):

- **HAXSchema: Validate File** - Manually validate the current file
- **HAXSchema: Create Demo** - Generate HTML demo from demoSchema

## HAXSchema Structure

The extension supports the complete HAXSchema specification with intelligent autocomplete for:

### Root Properties
- `api` - HAXSchema API version (required)
- `type` - Element type: "element" or "grid" (required)
- `canScale` - Show width scaler in HAX editor
- `canEditSource` - Show inline source view button
- `hideDefaultSettings` - Hide default design options
- `designSystem` - Design system form inputs
- `gizmo` - HAX editor metadata
- `settings` - Form field configurations
- `saveOptions` - Element serialization options
- `demoSchema` - Demo configurations

### Input Methods
Supported input methods for settings fields:
- `textfield`, `boolean`, `number`, `select`, `radio`, `slider`
- `url`, `colorpicker`, `iconpicker`, `code-editor`
- `fileupload`, `haxupload`, `tabs`, `fieldset`, `array`

## Development

### Building the Extension
```bash
npm install
npm run compile
```

### Testing
1. Press `F5` to launch Extension Development Host
2. Open example files in `examples/` directory
3. Test autocomplete, validation, and commands

## License

Apache 2.0 - Part of the HAXTheWeb ecosystem
