# The one-minute pitch

`out/pitch.mp4`: 60 seconds, 1920×1080, 60 fps, with a voice. It is the composition `Pitch`
in `src/Root.tsx`, beside the defense film (`Hivelet`, `SCENES.md`). The film shows the app
screen by screen; the pitch is an argument in three acts, and its pictures are motion
graphics built around one thread of light that runs through every scene. It is the same
thread that ties the three records together, draws the Hivelet mark, and wipes from one
feature to the next.

## What it says, and where each claim comes from

| Time | Voice | Picture | Source |
| :--- | :--- | :--- | :--- |
| 0–4.2 | "Thirty-three units. One landlady." | A point of light becomes 33 cells in an 11 × 3 grid, which close into one | 33 units (CLAUDE.md standing fact) |
| 4.2–9 | "And every peso, typed into a spreadsheet on a single USB drive." | Her rows in steep perspective; the thread draws a USB drive, "The only copy", which falls | Section 1.1; Section 4.1.1, Table 4-1 |
| 9–15.25 | "Invoices in a paper book. Repairs, lost in a chat. Inquiries that leave no trace." | Three amber panels: receipts with the same number circled twice, a repair request buried by chat, three inquiries breaking up | Section 4.1.1, Table 4-1 (and the five repeated invoice numbers found in her book, Chapter 4) |
| 15.25–20 | "Nothing connected. So we built Hivelet." | The panels drift apart with broken links; the thread runs through all three, pulls them in and traces the hexagon | |
| 20 | (the drop) | The mark fills; "Hivelet" sweeps in; the camera flies through it | |
| 20–25.5 | "Her ledger, in her own layout. Every payment counted, every invoice kept." | Monthly Income tiles and ledger rows in 3D; "Invoice INV#5120 kept" | Section 4.2 |
| 25.5–30 | "Tenants see their rent on their phones, and pay with GCash when they want to." | The tenant's phone; Pay with GCash tapped; payment received | Adyen with GCash (Section 4.2) |
| 30–33 | "Repairs are tracked, from request to done." | A repair card moving To dispatch, In progress, Done | |
| 33–36.75 | "Visitors ask about a vacant room. No account needed." | A unit's floor plan; a visitor's question and the answer; reference K7QM-3XRD (a sample) | |
| 36.75–40 | "And it installs like an app that still opens offline." | The icon drops onto a home screen; airplane mode; the app opens with "No connection · Transactions unavailable" | |
| 40–44 | "Built on nine hundred thirty-seven of her real records." | 937 rolls in | The 937 income rows carried over from her workbook (Chapter 4) |
| 44–46.5 | "Graded A-plus for security." | A+ with shockwave rings; Qualys SSL Labs · Mozilla Observatory · securityheaders.com | Section 4.4.4 |
| 46.5–50.75 | "And rated Very High Quality: four point five three, out of five." | A ring fills to 4.53 / 5 | Table 4-17, ISO/IEC 25010 |
| 50.75–60 | "Hivelet. One connected system, for the Fe Galang Da Silva Boarding House." | The mark, the name, her building inside the hexagon, hivelet.vercel.app, Group 4, Lloyd · Sean · Eljohn · Vince · Kiel | |

The film's Proof card uses the same three figures (937, A+, 4.53). The paper and slide 13
still report the 82 of 83 tests; only the videos changed.

## How it is built

- `src/pitch/timeline.ts`: when each scene sits, and when each phrase starts. Phrase starts
  live in `src/pitch/vo-at.json` so the score generator reads the same numbers. The score is
  120 bpm, so cuts sit on beats and the drop is on bar 10 (20 s).
- `src/pitch/kit.tsx`: the motion language. Springs at 60 fps, directional motion blur
  (`MBlur`, an SVG blur along the direction of travel), per-character rises (`Rise`), slams,
  the odometer, the camera's drift and hit shake, aurora light, grain, and the thread
  (`Thread`, a Catmull-Rom spline drawn by measured length, with a glowing head).
- `src/pitch/ActOne.tsx`, `ActTwo.tsx`, `ActThree.tsx`: the scenes. Act two reuses the
  film's app components (`src/ui`), which keep 30 fps time, so they are given the frame halved.
- `src/pitch/Pitch.tsx`: the composition, with the voice, the score and the effects.

## Sound

**The voice** is Kokoro-82M (Apache-2.0), voice `af_heart`, run offline by
`capture/pitch_voice.py` from `src/pitch/script.json`: one WAV per phrase in
`public/pitch/vo/`, so every phrase's start is known to the frame, and each clip's length in
`src/pitch/vo.json`. espeak mispronounces two names, so the script swaps their phonemes:
Hivelet as HIVE-let, Fe Galang as Feh ga-LANG. Every phrase is levelled to the same speech
loudness (-16 dBFS RMS over the spoken parts) with a soft knee on the peaks. The WAVs are
committed, so a render needs none of this; only changing a line does.

To regenerate them (Python 3.10 or later):

```bash
python -m venv tts && tts/bin/pip install kokoro-onnx soundfile
# the model: model_quantized.onnx from onnx-community/Kokoro-82M-v1.0-ONNX on Hugging Face,
#   or the parts of the npm package kokoro-q8-shards joined in order (sha256 fbae9257...a1478)
# the voices: package/voices/*.bin from the npm package kokoro-js, each a float32 array
#   reshaped to (510, 1, 256) and saved together with numpy.savez as voices.npz
tts/bin/python capture/pitch_voice.py kokoro-q8.onnx voices.npz
```

If a line's length changes, check `vo-at.json` still leaves each phrase room before the next.

**The score** is `capture/pitch-score.mjs`, synthesized to `public/pitch/score.wav` and timed
to `vo-at.json`, `vo.json` and the scenes. A new piece, not the film's: D minor under the
problem (a sub drone, a dark pad that opens, a clock, then a sixteenth-note pulse), a
struck-metal hit as each figure and each problem lands, a glitch on "Nothing connected", a
build that stops dead so "So we built Hivelet" is said into silence, a reversed chord drawing
in, and the drop in D major as the mark fills. Then a groove at 120 bpm (D, A, B minor, G;
four on the floor, claps, hats, an off-beat bass, pads pumping with the kick, a plucked hook
with a dotted-eighth echo), a snare pickup and crash on each thread wipe, half time under
937, a stop on "Graded" and the A+ hit, the chords twice as fast under 4.53, and a last hit on
the name with the hook slowed under the close and a bell for each of the five names.

The music steps back 8 dB wherever the voice is actually speaking (read from the clips, held
through short gaps so it does not pump), so the words sit 14 to 24 dB over it above 250 Hz.
The hits under a word keep only their low end at full weight.

**The effects** are the film's (`capture/sfx.mjs`), listed in `src/pitch/cues.ts` with the
thing each belongs to. The film's rule holds: a sound only plays when something on screen
lands, slides, is drawn, tapped or arrives (Sean's notes on the fourth cut: swooshes were
overused and did not match what moved). The odometer ticks once per digit as it rolls, slowing
as it slows.

**The master**: Remotion sums the tracks without a limiter, so the score is written with
headroom, and `capture/pitch-master.mjs` gives it back: the rendered mix to -15 LUFS
(BS.1770, gated) through a look-ahead limiter with a -1.5 dBFS ceiling. The picture is copied,
not re-encoded.

## Rebuilding

```bash
npm install
node capture/sfx.mjs           # the effects (shared with the film)
npm run render:pitch           # score, render (out/pitch-raw.mp4), master (out/pitch.mp4)
node capture/pitch-frames.mjs 0.9 2.6 20.2 44.5 --cols=4    # stills at any times, out/pitch-frames.png
```

The building photo and the icon come from `frontend/public/` (see `SCENES.md`, "Rebuilding").
On a machine that cannot download Remotion's browser, pass `--browser-executable=` to the
render and set `REMOTION_BROWSER_EXECUTABLE` for the stills, as for the film.
