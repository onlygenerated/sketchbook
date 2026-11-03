# sketchbook

Creative coding experiments: generative art, animation and audio-reactive visuals, made with [p5.js](https://p5js.org) and Claude Code.

**Live:** https://onlygenerated.github.io/sketchbook/

## Quick start

Requires [Node.js](https://nodejs.org) 18 or later (for the helper scripts and local server). The sketches themselves are plain HTML and JavaScript with no build step.

```powershell
git clone https://github.com/onlygenerated/sketchbook
cd sketchbook
npm run dev                          # preview at http://localhost:3000
npm run new -- "Orbit trails" --tags generative,motion
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Serves the repo at http://localhost:3000 (microphone access works on localhost) |
| `npm run new -- "Title"` | Copies `sketches/_template` to the next numbered folder and updates the gallery |
| `npm run index` | Rebuilds `sketches.json` after editing any `meta.json` |
| `npm run check` | Syntax-checks every sketch and validates metadata, no browser needed |

In Claude Code, `/new-sketch <idea>` does the whole thing: scaffold, write the sketch, update the index and commit.

## Each sketch

```
sketches/003-orbit-trails/
  index.html    loads p5, the shared overlay, and sketch.js
  sketch.js     the sketch
  meta.json     title, date, tags, description, interaction hint, status (wip or done)
  thumb.png     optional square thumbnail for the gallery
```

Every sketch page gets a small overlay (back link, title, **save png** button) that fades away when you stop moving. For a gallery thumbnail, hit save png, crop it square, and drop it in the folder as `thumb.png`.

Audio-reactive sketches use `shared/audio.js` (see `sketches/002-mic-bloom`). It falls back to synthetic demo audio if the microphone is blocked.

## Publishing

GitHub Pages serves the `main` branch, so anything merged to `main` is live within a minute or two.
