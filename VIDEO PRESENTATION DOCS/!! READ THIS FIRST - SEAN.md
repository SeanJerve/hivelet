# READ THIS SEAN!

**Everything for the Module 01 presentation, in one place.**
Last updated 2026-09-14.

---

## 1. THE SCRIPT — this is the one you film from

# 👉 https://claude.ai/code/artifact/e459eaee-9bc8-4062-b8e6-c8f7be6e068b?via=auto_preview

Open it on your phone. Each member taps their own section in the running order at
the top and reads straight from it.

- Colour-coded per speaker — **Loyd** blue, **Sean** teal, **Eljohn** violet,
  **Vince** amber, **Kiel** rose.
- Amber boxes are **stage directions**, never read aloud: *on screen*, *switch
  now*, *point to*, *trace the path*.
- It is **private**. To let the others open it, use the **share menu on the page
  itself**. Sending them the link alone will not work until you do.

**Offline copy:** `filming-script.html` in this folder — double-click, it opens in
any browser and prints cleanly.
**Plain-text copy:** `01_FILMING_SCRIPT.md`, same words without the formatting.

**Timing:** sections 1–6 are 9.8 minutes of speech, 12.7 with questions. The limit
is 10–15.

---

## 2. STILL TO DO BEFORE YOU RECORD

- [ ] **Fill in three member roles.** Only yours is set (Database administrator).
      Loyd, Eljohn and Vince are blank — the module's Group Identification table
      wants a name *and* a role. They are marked red in the script.
- [ ] **Share the script link** with the other four.
- [ ] **Read the "Never say these on camera" table** at the bottom of the script.
      It has two entries about the panel recommendation that I got wrong earlier —
      make sure nobody is rehearsing from an old copy.

---

## 3. THE DIAGRAMS

All in **`diagrams/`** beside this file. Every one exists as both `.svg` and
`.png`.

**Use the `.svg` on camera.** It stays sharp at any zoom — a viewer of a video
cannot lean into the screen the way someone in the room can. The PNGs are only
for tools that refuse SVG; they are 3,900–5,400 px wide so they hold up, but they
soften past that.

| Section | Show this | File |
| :-- | :--- | :--- |
| **3** | Architecture, defense view | `hivelet_architecture_defense.svg` |
| **4** | ERD overview — **open on this** | `hivelet_erd_defense_overview.svg` |
| **4** | Payments close-up — **then switch and stay** | `hivelet_erd_defense_payments.svg` |
| **5** | Level 0 context diagram | `hivelet_dfd_context.svg` |
| **5** | Level 1 DFD | `hivelet_dfd_level1.svg` |
| 4 | *Backup:* ERD with attributes | `hivelet_erd_defense.svg` |
| 4 | *Backup:* full 21-table ERD | `hivelet_erd.svg` |
| 5 | *Optional:* payment sequence | `hivelet_sequence_payment.svg` |
| 4 | *If asked about the verification gate* | `hivelet_state_payment_verification.svg` |

**Do NOT put `hivelet_architecture.svg` on camera.** That is the full component
map — a reference document, not a slide. Use the `_defense` version, which is
built wide and shallow to fill a 16:9 frame.

**Section 4 needs two shots, not one.** Open on the overview while you say what
the schema *is*, then cut to the payments close-up and stay there. At 16:9 the
full ERD is unreadable.

---

## 4. MERMAID SOURCE — copy and paste

You asked for this even though the images are already rendered, and you were
right to: if you want to restyle a diagram, change a label, or regenerate one in
a different tool, this is what you paste in.

### **`08_mermaid_source_paste_ready.md`** ← everything is in here

Nine themed, paste-ready blocks — one per diagram, already carrying the theme
directive. Drop any block into **mermaid.live**, Mermaid Chart, or any Mermaid AI
tool and it renders.

The raw `.mmd` files are in the repo at `docs/diagrams/` if you prefer those.

**If you regenerate a diagram, paste the result back into the matching `.mmd`
file in the repo** — otherwise the repo and your slides drift apart.

**To re-render them yourself as images**, the exact commands and the per-diagram
width and scale settings are at the top of `08_mermaid_source_paste_ready.md`.

---

## 5. THE OTHER DOCUMENTS HERE

You only need the script. These are behind it, numbered by the section they
support, in case a question goes deeper.

| File | What it is |
| :--- | :--- |
| `00_START_HERE_INDEX.md` | Maps every section to its images and documents |
| `01_SCRIPT_defense_pack.md` | The longer reference version of the script |
| `02_panel_recommendation_register.md` | **What the panel actually said**, and the two versions we got wrong |
| `03_section3_architecture.md` | The five tiers, and why a modular monolith |
| `04a…` `04b…` `04c…` | ERD and data dictionary · 3NF proof · security and RLS |
| `05_section5_dfd_traceability.md` | Processes and data stores mapped to components |
| `06a…` `06b…` `06c…` | Design justification · all 49 business rules · 44 requirements |
| `07_errata_corrections.md` | 22 corrections against what we already submitted |

---

## 6. NUMBERS, IF ANYONE ASKS

Re-derived from the live database on 2026-09-14. If you quote one, quote these.

| | |
| :--- | ---: |
| Tables, all with row-level security forced, zero policies | **21** |
| Units · clusters | **33** · **5** |
| Floors | **11 / 11 / 10 / 1** |
| Permissions · roles | **39** · **4** |
| Income ledger rows | **937** |
| Expense allocation rows | **1,327** |
| Business rules violated | **0** |

---

## 7. SETTING UP LOYD'S LAPTOP

Separate guide, same folder:

### **`SET UP LOYDS LAPTOP.md`**

Short version — it is more than the JWT and the HMAC key:

1. Send him **two files** (`loyd.env` and `creds.txt`) — both already prepared.
2. **Invite him to the Supabase project** — a key alone does not give his Claude
   database access.
3. He changes **two lines**: his own `JWT_SECRET`, and his own `ADYEN_HMAC_KEY`
   once he makes his own webhook.

The full steps, with the exact commands and the three checks that prove it
worked, are in that file.

---

*Everything here is generated from the repository. If something looks out of
date, the originals are in `docs/claude_pipeline/outputs/` and
`docs/diagrams/rendered/`.*
