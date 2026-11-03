// Scaffolds a new sketch from sketches/_template and rebuilds the index.
// Usage: npm run new -- "Sketch name" [--tags generative,noise]
import { readdir, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex } from './build-index.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sketchesDir = join(root, 'sketches');
const templateDir = join(sketchesDir, '_template');

const args = process.argv.slice(2);
const tagFlag = args.indexOf('--tags');
let tags = [];
if (tagFlag !== -1) {
  tags = (args[tagFlag + 1] || '').split(',').map((t) => t.trim()).filter(Boolean);
  args.splice(tagFlag, 2);
}
const title = args.join(' ').trim();

if (!title) {
  console.error('Usage: npm run new -- "Sketch name" [--tags tag1,tag2]');
  process.exit(1);
}

const slugPart = title
  .toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 40) || 'untitled';

const existing = (await readdir(sketchesDir, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => parseInt(e.name, 10))
  .filter(Number.isFinite);
const next = String((existing.length ? Math.max(...existing) : 0) + 1).padStart(3, '0');
const slug = `${next}-${slugPart}`;
const dest = join(sketchesDir, slug);

await mkdir(dest);
for (const f of await readdir(templateDir)) {
  await copyFile(join(templateDir, f), join(dest, f));
}

const meta = JSON.parse(await readFile(join(dest, 'meta.json'), 'utf8'));
meta.title = title;
meta.date = new Date().toISOString().slice(0, 10);
meta.tags = tags;
await writeFile(join(dest, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');

const html = await readFile(join(dest, 'index.html'), 'utf8');
await writeFile(join(dest, 'index.html'), html.replace(/<title>.*?<\/title>/, `<title>${next} ${title}</title>`));

await buildIndex({ quiet: true });
console.log(`Created sketches/${slug}/`);
console.log(`Edit sketches/${slug}/sketch.js, then preview at http://localhost:3000/sketches/${slug}/`);
