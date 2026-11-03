// Quick health check that works without a browser (handy in cloud sessions).
// Syntax-checks every .js and .mjs file and validates every meta.json.
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let problems = 0;

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

for (const file of await walk(root)) {
  const rel = relative(root, file);
  if (/\.(m?js)$/.test(file)) {
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    } catch (err) {
      problems++;
      console.error(`x ${rel}\n${err.stderr.toString()}`);
    }
  } else if (file.endsWith('meta.json')) {
    try {
      const meta = JSON.parse(await readFile(file, 'utf8'));
      if (!meta.title) { problems++; console.error(`x ${rel}: missing "title"`); }
    } catch (err) {
      problems++;
      console.error(`x ${rel}: invalid JSON (${err.message})`);
    }
  }
}

if (problems) {
  console.error(`\n${problems} problem${problems === 1 ? '' : 's'} found`);
  process.exit(1);
}
console.log('All sketches look OK');
