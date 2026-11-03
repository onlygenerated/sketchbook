---
description: Start a new sketch from an idea
argument-hint: "<idea for the sketch>"
---

Create a new sketch in this sketchbook based on this idea: $ARGUMENTS

1. Pick a short title (two to four words) and two or three tags. Reuse existing tags from `sketches.json` where they fit.
2. Run `npm run new -- "<title>" --tags tag1,tag2` to scaffold it.
3. Write the sketch in the new folder's `sketch.js`, following the rules in CLAUDE.md (p5 2.x, fills the window, `windowResized()`, taps work like clicks, `pixelDensity` capped at 2). If it reacts to sound, include `shared/audio.js` and add a tap-to-start prompt like `sketches/002-mic-bloom`.
4. Fill in `description` and `interaction` in `meta.json` (interaction is a short hint like "tap for a new seed"). Keep `status` as `wip` unless I say it's done.
5. Run `npm run index` and `npm run check`.
6. Commit with a message like `003 add <title>`. In a cloud session, push the branch and open a pull request that says what the sketch does and how to interact with it.

Then tell me in two or three sentences what you made and the local preview URL.
