# Changelog

## 2.1.0

Caught up with webcomponents master ([haxtheweb/issues#3392](https://github.com/haxtheweb/issues/issues/3392)); `video-player`, `audio-player` and `ddd-hero` no longer show false errors.

- Accept `designSystem.textAlign` (`false` hides the Text align setting, for blocks with a fixed layout such as media players).
- New input methods: `image-framing` (with its `sourceProperty`, `focalXProperty` and `focalYProperty` keys), `doodle` and `haxcms-language-picker`.
- CI validates every haxProperties file and input method in webcomponents master, on each PR and weekly, so the schema can't fall behind unnoticed.

## 2.0.1

- Accept `designSystem: true` (DDD turns on every design-system control), which 2.0.0 rejected.

## 2.0.0

Rebuilt against the current HAXSchema as implemented in haxtheweb/webcomponents.

- Schema now accepts every haxProperties file in webcomponents except six with real mistakes (the 1.0 schema rejected 90 of 91). Added `editingElement`, `contentEditable`, `editMode`, `documentation`, `settings.inline`, `gizmo.handles` / `shortcut` / `iconLib`, object `options`, object `canScale`, boolean `designSystem`, all SimpleFields / HAXFields input methods, the full SimpleColors palette, and the field keys HAX passes through (`noCamera`, `slotWrapper`, `uploadRequirements`, `uploadTransform`, `itemLabel`, …). `api`, `type` and field `inputMethod` are optional, matching HAXWiring's defaults.
- New lenient schema for `locales/*.haxProperties.json` translation files.
- Files stay in VS Code's JSON mode, so completion, hover, formatting and folding come from the built-in JSON language service. Removed the custom `haxschema` language, grammar, completion and hover providers.
- Snippets moved into the schema (`defaultSnippets`) so they appear only where they fit.
- Replaced the ajv-based validator with HAX-specific checks (HAX100–HAX109) positioned with jsonc-parser.
- Fixed: the packaged 1.0 extension excluded `node_modules`, so its runtime dependency `ajv` was missing and activation failed. The extension is now bundled with esbuild into one file.
- Fixed: "Create Demo" wrote camelCase property names as attributes and didn't escape values.
- Added CI and automatic publishing to the VS Code Marketplace and Open VSX.

## 1.0.0

- Initial release.
