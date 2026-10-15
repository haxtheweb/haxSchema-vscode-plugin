# HAXSchema for VS Code

Editing support for HAX `.haxProperties.json` files — the HAXSchema that tells the HAX editor how to list, configure and save a web component.

## Features

- **Validation as you type** against a schema built from what HAX actually reads at runtime (`HAXWiring`, `SimpleFields`, `HAXStore` in [haxtheweb/webcomponents](https://github.com/haxtheweb/webcomponents)).
- **Autocomplete and hover docs** for every key, including all `inputMethod`s, the SimpleColors palette for `gizmo.color`, handle types and DDD `designSystem` options.
- **Snippets in context**: trigger suggestions (`Ctrl+Space`) on an empty file for a full starter, or inside a `settings.configure` array for field templates (textfield, select, haxupload, array, …).
- **HAX-specific checks** the schema can't express:

  | Code | Severity | Check |
  |---|---|---|
  | HAX100 | warning | Field isn't bound to a `property`, `attribute` or `slot` |
  | HAX101 | warning | `select` / `radio` without `options` |
  | HAX102 | info | `slider` without `min` / `max` |
  | HAX103 | warning | Two fields in one list bind the same thing |
  | HAX104 | warning | `unsetAttributes` entry is camelCase (HAX matches kebab-case attribute names) |
  | HAX105 | info | No `demoSchema` entry uses the element's own tag |
  | HAX106 | error | `validation` isn't a valid regular expression |
  | HAX107 | warning | Likely typo in a field key (e.g. `desc` → `description`) |
  | HAX108 / HAX109 | warning | `property` written kebab-case / `attribute` written camelCase |

- **Retired or misplaced keys** (`canPosition`, `editElement`, `settings.saveOptions`) are flagged with an explanation instead of a bare "not allowed".
- **Translation files** (`locales/<element>.<lang>.haxProperties.json`) get their own lenient schema, since they only carry translated strings.
- **Preview demoSchema as HTML** command renders the demos with properties converted to attributes.

Turn the HAX-specific checks off with `"haxschema.semanticValidation": false`.

## Commands

- **HAXSchema: Validate File**
- **HAXSchema: Preview demoSchema as HTML**

## Development

```bash
npm install
npm run check     # typecheck + lint + tests
npm run build     # bundle to dist/extension.js
npm run package   # build a .vsix
```

Press `F5` in VS Code to launch an Extension Development Host with the `examples/` folder open.

The tests validate the schema against real haxProperties files from webcomponents in `test/fixtures/`. When HAX gains a new key or input method, add a fixture that uses it and update `schemas/haxschema.json`.

## Releasing

Bump `version` in `package.json` (and add a CHANGELOG entry) in a PR. When it merges to `main`, the **Release** workflow tags `v<version>`, creates a GitHub release with the `.vsix`, and publishes to the Visual Studio Marketplace and Open VSX. See `.github/workflows/release.yml` for the secrets it needs.

## License

Apache-2.0 — part of [HAXTheWeb](https://haxtheweb.org).
