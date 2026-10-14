# Changelog

## 2.0.0

Rebuilt against the current HAXSchema as implemented in haxtheweb/webcomponents.

- Schema now accepts every haxProperties file in webcomponents except six with real mistakes (the 1.0 schema rejected 90 of 91). Added `editingElement`, `contentEditable`, `editMode`, `documentation`, `settings.inline`, `gizmo.handles` / `shortcut` / `iconLib`, object `options`, object `canScale`, `designSystem: false`, all SimpleFields / HAXFields input methods, the full SimpleColors palette, and the field keys HAX passes through (`noCamera`, `slotWrapper`, `uploadRequirements`, `uploadTransform`, `itemLabel`, …). `api`, `type` and field `inputMethod` are optional, matching HAXWiring's defaults.
- New lenient schema for `locales/*.haxProperties.json` translation files.
- Files stay in VS Code's JSON mode, so completion, hover, formatting and folding come from the built-in JSON language service. Removed the custom `haxschema` language, grammar, completion and hover providers.
- Snippets moved into the schema (`defaultSnippets`) so they appear only where they fit.
- Replaced the ajv-based validator with HAX-specific checks (HAX100–HAX109) positioned with jsonc-parser.
- Fixed: the packaged 1.0 extension excluded `node_modules`, so its runtime dependency `ajv` was missing and activation failed. The extension is now bundled with esbuild into one file.
- Fixed: "Create Demo" wrote camelCase property names as attributes and didn't escape values.
- Added CI and automatic publishing to the VS Code Marketplace and Open VSX.

## 1.0.0

- Initial release.
