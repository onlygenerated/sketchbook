// Regenerates sketches.json from every sketches/NNN-name/meta.json.
// Folders starting with "_" or "." are skipped. Run with: npm run index
import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sketchesDir = join(root, 'sketches');
const THUMBS = ['thumb.png', 'thumb.jpg', 'thumb.webp', 'thumb.gif'];

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

export async function buildIndex({ quiet = false } = {}) {
  const entries = await readdir(sketchesDir, { withFileTypes: true });
  const sketches = [];

  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('_') || e.name.startsWith('.')) continue;
    const dir = join(sketchesDir, e.name);
    let meta = {};
    try {
      meta = JSON.parse(await readFile(join(dir, 'meta.json'), 'utf8'));
    } catch (err) {
      console.warn(`! ${e.name}: missing or invalid meta.json (${err.message})`);
    }
    if (meta.hidden) continue;

    let thumb = null;
    for (const t of THUMBS) {
      if (await exists(join(dir, t))) { thumb = `sketches/${e.name}/${t}`; break; }
    }

    const num = parseInt(e.name, 10);
    sketches.push({
      slug: e.name,
      number: Number.isFinite(num) ? num : null,
      title: meta.title || e.name,
      date: meta.date || null,
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      description: meta.description || '',
      status: meta.status || 'wip',
      interaction: meta.interaction || '',
      path: `sketches/${e.name}/`,
      thumb,
    });
  }

  sketches.sort((a, b) => (b.number ?? -1) - (a.number ?? -1) || a.slug.localeCompare(b.slug));
  const out = { generated: new Date().toISOString().slice(0, 10), count: sketches.length, sketches };
  await writeFile(join(root, 'sketches.json'), JSON.stringify(out, null, 2) + '\n');
  if (!quiet) console.log(`sketches.json: ${sketches.length} sketch${sketches.length === 1 ? '' : 'es'}`);
  return out;
}

const self = resolve(fileURLToPath(import.meta.url)).toLowerCase();
if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === self) {
  buildIndex().catch((err) => { console.error(err); process.exit(1); });
}
