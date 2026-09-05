# TIK — The Interior Kampany

**“Space, in motion.”** — a scroll-driven, architectural web experience.

An interior space that builds itself in real time as you scroll: an empty concrete
shell → walls form → materials arrive → light warms → furniture materialises →
a finished TIK interior → a real project photograph emerges from the wall.

## Run

No build step. It's a static site (CDN libraries).

```bash
cd "The Interior Kampany"
python3 -m http.server 8137
# open http://localhost:8137
```

> Open via a server, not `file://` — ES modules + the import map need HTTP.

## Stack

- **Three.js** (r160, via import map) — the procedural, scroll-controlled hero room (`js/scene.js`).
- **GSAP + ScrollTrigger** — scroll storytelling, pins, reveals (`js/app.js`).
- **Lenis** — smooth inertial scrolling.
- **Fraunces** (editorial serif) × **Space Grotesk** (grotesk) — typography.
- No frameworks, no bundler.

## Files

```
index.html            all sections (hero → footer)
css/app.css           design system + layout (tokens at the top)
js/scene.js           WebGL hero fallback — window.TIKScene.setProgress(0..1)
js/app.js             Lenis, ScrollTrigger, cursor, magnetic, sliders, reveals
assets/hero_scrub.mp4 scroll-scrubbed hero film (all-intra, seekable)
```

## Hero film (scroll-scrubbed video)

The hero is driven by a video that **seeks** to `scrollProgress × duration` — it never
"plays." The WebGL scene in `js/scene.js` stays as an automatic fallback if the video
can't decode. The film maps across the first ~86% of the hero scroll; the last ~14%
crossfades into the real project photograph.

**To replace the film**, re-encode any new clip as **all-intra** (a keyframe on every
frame — this is what makes scrubbing smooth) and drop it at `assets/hero_scrub.mp4`:

```bash
ffmpeg -y -i your_clip.mp4 \
  -c:v libx264 -x264-params "keyint=1:min-keyint=1:scenecut=0" \
  -preset slower -crf 20 -pix_fmt yuv420p \
  -vf "scale=1600:-2,fps=30" -movflags +faststart -an \
  assets/hero_scrub.mp4
```

Verify every frame is a keyframe:
`ffprobe -select_streams v:0 -show_frames -show_entries frame=key_frame -of csv=p=0 assets/hero_scrub.mp4 | grep -c '^1'`
(should equal the total frame count).

## Design language

- **Ivory** `#F3EFE7` · **Ink** `#17150F` · **one accent — TIK Clay** `#B9491F` (no luxury gold).
- Edit the tokens in `:root` (top of `css/app.css`) to retune the whole site.

## Make it real (content to replace)

- **Photography** — currently Unsplash placeholders (`data-img`). Swap for real TIK
  projects. Broken images fail gracefully to the surface colour.
- **Stats** (§15) — the `XX` values are intentional placeholders. Fill in real
  numbers or delete the section; don't invent figures.
- **Projects / testimonials / journal** — replace with genuine work and quotes.
- **Contact** — wire `hello@theinteriorkampany.com` and social links.

## Built-in resilience

- **No WebGL / old GPU** → hero falls back to a static architectural gradient.
- **`prefers-reduced-motion`** → 3D presents a finished room, scroll-jacking off,
  all reveals shown statically.
- **Mobile** → lighter pixel ratio, shadows off, simplified scene; the core story
  (empty → designed → materialised → finished) is preserved.
- Hero WebGL pauses rendering when off-screen.
