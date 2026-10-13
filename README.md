# English, in rhythm

A static, audio-first American English lesson with Brazilian Portuguese guidance, everyday conversation, and music-production scenarios.

**Website:** https://jfanals.github.io/learn-english/

## Player

- 156 timeline segments using 99 original revised voice clips, across 10 chapters.
- Adjustable between-sentence pauses and separate speaking-practice time.
- Slider changes affect the current pause immediately; pausing freezes the countdown.
- Repeat, next/previous, skip pause, chapter navigation, and optional current-line text.
- Relative asset paths for GitHub Pages project hosting; responsive desktop/mobile layout.
- Original timing is about 15:40; estimated duration updates with your pause settings.
- Settings stay in this browser's local storage. No microphone capture, accounts, analytics, or remote settings service.

Speak before hearing the example answer. Keep the current-line text hidden initially if you want audio-only practice. The nine-item recall chapter and final personal-response turn help you evaluate the lesson's difficulty.

## Run locally

No build step or dependencies:

```sh
npm test
npm run serve
# http://localhost:4173
```

Serve over HTTP: opening `index.html` directly via `file://` will not reliably load the manifest/modules.

## Files

- `site/`: the complete public site and original compressed clips.
- `site/lesson.json`: lesson manifest, phrase text, timing, and chapter boundaries.
- `site/player.js`: DOM-independent playback transport.
- `site/app.js`: accessible UI and browser integration.
- `tests/player.test.js`: deterministic timing, navigation/race, and export-boundary tests.
- `scripts/export_site.py`: local maintenance helper to re-export from the original generated pilot's `pilot/output-v2/timeline.json` and Kokoro WAV cache. Those local production inputs are not included in this website repository. Already-exported site assets need no Python or speech models.
- `.github/workflows/pages.yml`: tests and deploys only `site/` on pushes to `main`.

Generated voice clips use Kokoro-82M: `pf_dora` for Brazilian Portuguese, `af_bella` and `am_adam` for American English. English was synthesized at 0.95 speed with preserved quiet clip endings. Voices/model: https://huggingface.co/hexgrad/Kokoro-82M

## Content and privacy

This is an original lesson, not an official Pimsleur product or a translation/reproduction of a commercial course. Only original generated lessons and website code/assets are published. Commercial recordings, source-derived transcripts, private analysis, machine paths, and local model caches are not in this repository or Pages artifact.

The browser and GitHub Pages necessarily request/serve static files; no custom tracking or recording is performed. Background/locked-screen playback depends on browser/OS policies: keep the page active for reliable interactive timing.
