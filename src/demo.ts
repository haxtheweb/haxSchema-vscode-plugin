import { isObject } from './jsonUtil';

/** Render demoSchema entries the way HAX would place them in a page. */
export function demoToHtml(demos: unknown[]): string {
    const blocks: string[] = [];
    const tags = new Set<string>();
    for (const demo of demos) {
        if (!isObject(demo) || typeof demo.tag !== 'string') {
            continue;
        }
        tags.add(demo.tag);
        const attrs = isObject(demo.properties) ? toAttributes(demo.properties) : '';
        const content = typeof demo.content === 'string' ? demo.content : '';
        const note = typeof demo.description === 'string' ? `    <!-- ${demo.description.replace(/--/g, '- -')} -->\n` : '';
        blocks.push(`${note}    <${demo.tag}${attrs}>${content}</${demo.tag}>`);
    }
    const imports = [...tags]
        .map((t) => `  <!-- <script type="module" src="./${t}.js"></script> -->`)
        .join('\n');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${[...tags].join(', ')} demo</title>
${imports}
</head>
<body>
  <main>
${blocks.join('\n')}
  </main>
</body>
</html>
`;
}

/** camelCase properties become kebab-case attributes, as Lit reflects them. */
export function toAttributes(properties: Record<string, unknown>): string {
    let out = '';
    for (const [key, value] of Object.entries(properties)) {
        const name = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
        if (value === false || value === null || value === undefined) {
            continue;
        }
        if (value === true) {
            out += ` ${name}`;
        } else if (typeof value === 'object') {
            out += ` ${name}='${JSON.stringify(value).replace(/'/g, '&#39;')}'`;
        } else {
            out += ` ${name}="${String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`;
        }
    }
    return out;
}
