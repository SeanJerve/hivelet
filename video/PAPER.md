# The paper pitch

`out/paper.mp4`: 60 seconds, 1920×1080, 60 fps, with a voice. It is the composition
`PaperPitch` in `src/Root.tsx`. It is the second one-minute pitch: the first (`PITCH.md`)
kept the film's dark, glowing look, and Sean asked for something with nothing of the film in it.

## The idea

The 2026 design write-ups agree on one thing: away from glossy digital surfaces, toward work
that looks made by hand. That means paper craft, collage, torn edges and cut-outs, rubber
stamps, tactile textures, and hand-built sets (Creative Bloq, "Texture, warmth and tactile
rebellion"; Adobe's 2026 trends; Videobolt's motion trends for 2026). The paper itself
describes her old way as "spreadsheet- and paper-based administration" (Section 1.4). So the
pitch is made of paper.

It is one continuous shot. A camera looks down on a craft table and glides across it, and
everything it finds is something you could pick up:

| Time | Voice | On the table | Source |
| :--- | :--- | :--- | :--- |
| 0–7 | "This is the Fe Galang Da Silva Boarding House, in Legazpi City. Thirty-three units. One landlady." | A pop-up book of her building opens: cream walls, blue rails, the green and coral awnings from the photograph. The real photograph is taped beside it. Its 33 windows light up one by one, and the door opens on one small figure. | Section 1.4 (the address, 33 units) |
| 7–17 | "And it all lived in pieces. A spreadsheet, on one USB drive. A paper invoice book. Repairs, asked for in a chat. And inquiries that left no record." | A collage of scraps, each put down as it is named: her spreadsheet with the drive it lived on ("the only copy!"); two receipts with the same number, ringed ("used twice?!"); a repair request buried under chat bubbles; three inquiries on sticky notes that a gust blows away | Section 4.1.1, Table 4-1; the repeated invoice numbers, Chapter 4 (five were) |
| 17–21 | "Nothing connected. So we folded it all into one. Hivelet." | Red marker strikes out the links; "Nothing connected." in cut-out letters. Every scrap becomes one facet of a hexagon, and the facets fold over green. The house mark is pressed on and the name lands. | Chapter 4 ("nothing connected one to another") |
| 21–39 | "Her ledger, in her own layout, adding itself up. A payment can't be recorded twice. Tenants see their rent on their phones, and pay with GCash. Repairs get tracked, from request to done. Visitors ask about a vacant room. No account needed. And it installs like an app." | A green cutting mat with the app itself on it, printed and taped down. Each print is marked up in paint pen, the duplicate receipt is crossed out and crumpled, a receipt prints out of the phone, a repair card moves along To dispatch, In progress and Done, and the Hivelet icon is peeled off a sticker sheet onto a home screen. | The duplicate guards (Section 4.3.4, the owner's own walkthrough); the ledger in her layout and Adyen with GCash (Section 4.2.4); installing (Section 4.2.7) |
| 39–49 | "We moved in nine hundred thirty-seven of her real records. Security, graded A-plus. Quality, rated four point five three, out of five." | On kraft paper: a split-flap counter rolls to 937. An index card is typed with the three scans and stamped A+. A report card fills with five foil stars, the last 53% full, and gets the stamp VERY HIGH QUALITY. | Chapter 4 (937 rows), Section 4.4.4, Table 4-17 |
| 49–60 | "Hivelet. Her whole boarding house, in one place." | The camera pulls back to the whole table, everything in one place, and comes home to the book. A Hivelet sticker goes on the page. Label tape punches out hivelet.vercel.app, the team (Lloyd · Sean · Eljohn · Vince · Kiel) and Group 4 · Bicol University · IT 124 Capstone Project 2. The book closes; its cover now carries the Hivelet sticker. | |

The visitor's question and answer, the reference sample and the names on the receipts are
samples, as in the film. The notes in marker ("the only copy!", "already recorded") are
annotations, not text from the app.

## How it is built

- `src/paper/kit.tsx`: the materials.
  - Paper with tooth and fibres: textures in `public/paper/tex/`, made by `capture/paper-textures.mjs`.
  - Torn edges, and a lifting shadow that grows with height.
  - Washi tape and push pins.
  - Marker strokes and handwriting that boil at 12 fps, as drawn animation does.
  - Cut-out "ransom" letters, rubber stamps with uneven ink, and label-maker tape.
  - A split-flap counter and foil star stickers.
  - The camera: a world transform with a screen-space directional blur on fast moves.
- `src/paper/Book.tsx`: the pop-up book in CSS 3D. The back page is the sky and the front page the ground. The building, the trees and the hedge stand up as it opens and fold flat under the cover as it closes.
- `src/paper/Pieces.tsx`, `Mat.tsx`, `Proof.tsx`: the three areas of the table. `Mat.tsx` uses the film's own app components (`src/ui`), shown finished.
- `src/paper/PaperPitch.tsx`: the table, the camera's moves, and which area is mounted when.
- Typefaces in `public/fonts/`:
  - Fraunces, Bricolage Grotesque, Caveat and Courier Prime (SIL Open Font License).
  - Permanent Marker (Apache 2.0).
  - All from Fontsource.

The camera and everything that moves through space run at the full 60 fps. Only the
hand-drawn marks boil, at 12 drawings a second, which is what makes them read as drawn.

## Sound

**The voice** is the same Kokoro voice as the first pitch (`af_heart`), voiced with
`python capture/pitch_voice.py MODEL VOICES paper` from `src/paper/script.json`. Three names
get their sounds fixed:
- Hivelet as HIVE-let.
- Fe Galang as Feh ga-LANG.
- Legazpi as le-GAS-pee.

The setup is in `PITCH.md`. The clips are committed.

**The music and every paper sound** are one track, `capture/paper-score.mjs`, timed to the voice and to the scenes.

The music is played by hand, not electronic:
- **Plucked strings.** Karplus–Strong synthesis gives a ukulele, pizzicato and a bass.
- **Bells and percussion.** A glockenspiel, a music box, stomps, claps, finger snaps, a shaker and a tambourine.
- **A whistle** for the finale.

It moves through the minute like this:
- **The opening.** A picked ukulele, and a glockenspiel run, one note for each of the 33 windows.
- **The scraps.** Sneaky pizzicato in D minor that stops dead for "Nothing connected".
- **The fold.** A climb up to the reveal.
- **The product.** The band comes in, in D major at 120 bpm.
- **The proof.** The A+ stamp lands on the push into the bar, and there are five notes for the five stars.
- **The pull back.** The whistled hook.

The paper sounds are made in the same file and land on their frames:
- Sheets landing, tape, and marker that squeaks for as long as the line takes to write.
- Pins, the sticky notes fluttering away, crumpling, and the origami folds.
- The split-flap (one clack per flip, as `SplitFlap` times them), the typewriter, the stamps, label tape, the receipt printer, the sticker, and the book shutting.

The music ducks 10 dB where the voice is speaking (read from the clips). The paper sounds do
not duck. Measured per phrase, the voice sits 12 to 20 dB over the music above 250 Hz. The
exception is "Hivelet.", at about 10 dB, because it lands on the reveal.

**The master** is the same as the first pitch: `capture/pitch-master.mjs paper` takes the mix to -15 LUFS with a -1.5 dBFS ceiling.

## Rebuilding

```bash
npm install
npm run render:paper      # score, render (out/paper-raw.mp4), master (out/paper.mp4)
node capture/pitch-frames.mjs 2 10 20.4 45 52 --comp=PaperPitch --cols=5   # stills: out/paperpitch-frames.png
```

The building photograph comes from `frontend/public/` (see `SCENES.md`, "Rebuilding"). On a
machine that cannot download Remotion's browser, pass `--browser-executable=` to the render.
