# The screen pitches (versions A to G)

Seven short pitches made after the reference Sean sent on 16 October 2026: a TikTok
(@motionlovee) in which a laptop sits on a glossy black desk in a dark room and its screen is
the only light. The screen is a quiet editorial page: a mono caption typed with the voice and
a block cursor, heavy grotesk words, a serif italic for the hard moment ("No."), thin line
drawings, dot grids, and now and then a full-bleed colour that lights the room. Real objects sit
on its clean pages: a hand drawing with a pen, a white cable, a brass magnifier, a cardboard box.
The sound is almost only the voice.

Sean's notes after the earlier pitches (`PITCH.md`, `PAPER.md`): "nothing like my original
video", "please, surprise me", and of the first versions here, "way generic". So each version
below takes a different idea from the reference rather than repeating one. Versions F and G are
the answer to "generic": the earlier ones drew in line where the reference puts real things.

| | Composition | Size, length | The idea | Voice |
| :--- | :--- | :--- | :--- | :--- |
| A | `ScreenPitch` | 1920×1080, 60 s | The reference's set-up, nearly as it is: a CSS-3D laptop in a dark room, the voice typed on its screen, a pen drawing the house, the green dot that becomes Hivelet | af_heart |
| B | `Vertical` | 1080×1920, 46 s | Vertical, as the reference is. "Not a spreadsheet. Not one USB drive. No." Each old tool struck out, then full-colour screens (937 in blue, A+ in coral, 4.53 in green) light the desk | af_bella |
| C | `Duo` | 1920×1080, 60 s | Two screens: the lid opens on her Excel sheet; a phone on a stand plays the tenant's side (pay with GCash, report a repair) while the laptop shows her side. The lid shuts at the end | am_michael |
| D | `TenantPitch` | 1080×1920, 39 s | The tenant's side only: a phone in the dark finds the room, asks with no account, pays, reports a repair; then the camera pulls back to her laptop | bf_emma |
| E | `One` | 1920×1080, 42 s | No laptop: the reference's screens edge to edge, built on the word "one" (one ledger, one phone for every tenant, one board for every repair, one page for every visitor) | af_heart |
| F | `Objects` | 1080×1920, 57.5 s | WebGL. Real objects on the screen's page, lit and shadowed: a brass key, the rack of 33 hooks (32 keys taken, 1 vacant), the USB drive, coins, the invoice book, the chat; then the Hivelet mark in enamel, a ledger sheet that adds itself up, a phone that takes GCash, a spanner pushing a repair card to done, a paper dart, a stack of 937 sheets, a padlock that shuts on A+, a gauge that stops at 4.53 | af_heart + af_nicole |
| G | `Desk` | 1920×1080, 56 s | WebGL. The objects are on her desk beside the laptop, lit by its screen, shot close with a depth-of-field lens; when she opens Hivelet each one lifts off the desk and goes into the screen, which becomes the part of Hivelet that replaced it. Only the keys are left: "Same desk. Less on it." | af_bella + bf_emma |

## The facts each one states

All from `FINAL/`: the address and 33 units (Section 1.4; 32 occupied, per the standing facts in
`CLAUDE.md`); the old way (Section 4.1.1, Table 4-1: a two-sheet workbook on a USB flash drive
that was the only copy, invoices in a paper book, rent collected in cash, requests by messaging
application with no record, inquiries with no record); the ledgers in her workbook's layout, her
own invoice numbers (never made up, never twice for the same unit and month) and GCash through
Adyen entering Pending Verification until she verifies it (4.2.4); repairs followed to completion
(4.2.5); inquiries with no account (4.2.3); 937 income rows moved in (Chapter 4); A+ from Qualys
SSL Labs, Mozilla HTTP Observatory and securityheaders.com (4.4.4); 4.53, Very High Quality,
ISO/IEC 25010 (Table 4-17).

Samples, not records: the amounts on ledger rows and receipts, the invoice number 1182, the chat
messages, the repair "Kitchen faucet keeps dripping", the visitor's name. No real tenant's name
is shown in F or G.

## How F and G are built

Three.js through `@remotion/three` (pinned: three 0.186.1, @react-three/fiber 9.8.1).

- `src/objects/world.tsx`: the room. A 14-inch laptop built from rounded boxes, its keys
  instanced; the desk a planar reflection (three's `Reflector` with a shader that blurs with
  distance through the reflection's mipmaps); the screen a rectangle light the size of the
  panel, so the keys and the desk take its colour; a soft bloom round the panel. The screen's
  picture is its own small scene rendered to a texture each frame, with a 2D canvas behind it
  (the page) and one in front (the caption).
- `src/objects/props.tsx`: the objects, each extruded or turned from a 2D outline with a
  physical material: the key, cup hooks, USB drive, coins, invoice book, phone, the Hivelet
  mark in enamel (its rounded hexagon from `frontend/public/favicon.svg`), a ledger sheet, a
  spanner, a paper dart, a padlock, a gauge, a paper stack.
- `src/objects/draw.ts`: the 2D layer (the typed caption, labels, leader lines).
- `src/desk/post.tsx`: G's depth of field: the scene rendered once with its depth, then a disc
  blur weighted by each tap's own blur, so a sharp key does not bleed onto the screen behind it.

Two things learned the hard way, both written into the code where they apply: two
near-coplanar planes (the bezel and the panel) z-fight under the reflection's oblique
projection and cut the reflected screen into diagonal wedges; and 937 separate overlapping
sheets cost two minutes a frame in software WebGL, so the stack is sixteen striped slabs.

## Rebuilding

The voice (Kokoro-82M, offline; see `capture/pitch_voice.py` for the model files):

```bash
python capture/pitch_voice.py MODEL.onnx VOICES.npz objects   # or screen, vertical, duo, tenant, one, desk
```

The sound, then the picture, then the master (loudness to -15 LUFS, picture copied untouched):

```bash
node capture/objects-score.mjs
npx remotion render src/index.ts Objects out/objects-raw.mp4 --gl=angle --timeout=120000
node capture/pitch-master.mjs objects
```

| Version | Score | Render | Master |
| :--- | :--- | :--- | :--- |
| A | `capture/screen-score.mjs` | `ScreenPitch out/screen-raw.mp4` | `screen` |
| B | `capture/vertical-score.mjs` | `Vertical out/vertical-raw.mp4` | `vertical` |
| C | `capture/duo-score.mjs` | `Duo out/duo-raw.mp4` | `duo` |
| D | `capture/tenant-score.mjs` | `TenantPitch out/tenant-raw.mp4` | `tenant` |
| E | `capture/one-score.mjs` | `One out/one-raw.mp4` | `one` |
| F | `capture/objects-score.mjs` | `Objects out/objects-raw.mp4 --gl=angle --timeout=120000` | `objects` |
| G | `capture/desk-score.mjs` | `Desk out/desk-raw.mp4 --gl=angle --timeout=120000` | `desk` |

F and G render in software WebGL at about 1.8 s a frame on four cores, so each takes about
an hour and a half. Stills for checking: `node capture/pitch-frames.mjs 12.5 --comp=Desk
--gl=angle --timeout=180`. The scores are gitignored (`public/*/score.wav`) and rebuilt by
their scripts; the MP4s stay out of the repository.
