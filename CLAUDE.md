# Sketchbook

Phil's creative coding sketchbook: small p5.js experiments in generative art, animation and audio-reactive visuals. Published as a static site on GitHub Pages, so every sketch on `main` gets a public URL that works on a phone.

Phil works from three places: a Windows 11 laptop (main), a Windows 11 desktop, and a Pixel 10 phone (Claude Code on the web, or Remote Control into the laptop). Everything Claude needs to know about this repo lives in this file and in `.claude/`, because cloud sessions only see what is committed.

## Layout

```
index.html            gallery page (reads sketches.json)
sketches.json         generated list of sketches; never edit by hand
sketches/
  _template/          copied for every new sketch
  NNN-kebab-name/     one folder per sketch
    index.html        loads p5 from the CDN, shared/shell, then sketch.js
    sketch.js         the sketch
    meta.json         title, date, tags, description, status
    thumb.png         optional gallery thumbnail (square, about 600px)
shared/
  shell.css, shell.js overlay with title, back link and save-PNG button
  audio.js            Mic helper for audio-reactive sketches
tools/
  new-sketch.mjs      scaffolds a sketch from the template and rebuilds the index
  build-index.mjs     regenerates sketches.json from every meta.json
```

## Rules

- **No build step.** Plain HTML and JavaScript that runs straight from the folder. Do not add bundlers, TypeScript or frameworks without asking Phil first.
- **New sketches:** run `npm run new -- "Sketch name"`. It picks the next number, copies the template and updates the index. Don't create sketch folders by hand.
- **After changing any meta.json, or renaming or deleting a sketch,** run `npm run index` and commit `sketches.json` with the change.
- **p5.js version is pinned** in each sketch's `index.html` (currently p5 2.3.4 from cdn.jsdelivr.net). This is p5 2.x: there is no `preload()`; use `async function setup()` with `await loadImage(...)` instead. Only bump versions when asked.
- **Every sketch must work on a phone:** fill the window (`createCanvas(windowWidth, windowHeight)`), implement `windowResized()`, treat a tap the same as a click, and cap `pixelDensity` at 2 for performance.
- **Audio:** use `shared/audio.js`. Browsers only allow the microphone after a user gesture and over HTTPS or localhost, so audio sketches show a "tap to start" prompt. Don't load p5.sound.
- **Keep sketches self-contained.** Shared code goes in `shared/` only when two or more sketches need it.
- **Assets** (images, audio, fonts) go in the sketch's own folder. Keep each file under a few MB.
- **Writing style:** never use em-dashes in code comments, docs, commit messages or any prose. Use commas, colons, parentheses or separate sentences.

## Running it

- Local preview: `npm run dev`, then open http://localhost:3000. Works the same in PowerShell on Windows.
- Live site: https://onlygenerated.github.io/sketchbook/ (GitHub Pages, deployed from the `main` branch root; `.nojekyll` keeps the `_template` folder served).

## Working from the phone (cloud sessions)

Cloud sessions can't show Phil a running sketch, so:

1. Make the change on the session's branch, run `npm run index` if needed, and commit.
2. Open a pull request with a short description of what the sketch does and how to interact with it.
3. Phil merges from the GitHub app, then views the result on the live site a minute later.

Before finishing, run `npm run check` (syntax-checks every sketch's JavaScript and validates each meta.json). If a headless browser is available, also load the page and check the console for errors.

## Commits

Short, present tense, sketch number first when relevant: `003 add trails to orbit sketch`.
