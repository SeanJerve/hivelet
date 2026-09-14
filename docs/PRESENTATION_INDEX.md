# PRESENTATION INDEX — where everything lives

One page, so you are not hunting through folders while recording.
**Everything below is inside the repository.** Paths are from the repo root.

Two directories hold nearly all of it:

```
docs/claude_pipeline/outputs/     the written artifacts  (11 documents)
docs/diagrams/rendered/           the images for slides  (10 diagrams, PNG + SVG)
```

---

## The script you present from

**`docs/claude_pipeline/outputs/PHASE3_DEFENSE_PACK.md`**

The six-section script with timings, the slide-asset table, the anticipated-questions
table, and a short "two things not to say" list. **If you open one file, open this one.**

Its companion, for the single panel recommendation and the six withdrawn claims:
**`docs/claude_pipeline/outputs/PHASE3_PANEL_RECOMMENDATION_REGISTER.md`**

---

## Section by section

Timings are the recommendation in the pack, not a limit.

### §1 — Introduction and problem recap · ~1 min

| | |
| :--- | :--- |
| Backing document | `docs/01_SYSTEM_BIBLE.md` (the property and the problem) |
| Image | none needed |

### §2 — Panel recommendations recap · ~1–2 min

| | |
| :--- | :--- |
| Backing document | `docs/claude_pipeline/outputs/PHASE3_PANEL_RECOMMENDATION_REGISTER.md` |
| Image | none needed |

There was **one** recommendation. Do not attribute a second.

### §3 — Finalized architecture · ~2 min · **GRADED CORE**

| | |
| :--- | :--- |
| On screen | `docs/diagrams/rendered/hivelet_architecture_defense.svg` |
| Backup / reference only | `hivelet_architecture.svg` — **do not put this on camera**, it is a reference map |
| Backing documents | `docs/claude_pipeline/outputs/PHASE1_ARCHITECTURE_AND_PATTERN.md`<br>`docs/04_ARCHITECTURE.md` |

### §4 — Finalized database schema · ~2 min · **GRADED CORE**

| | |
| :--- | :--- |
| Open on | `docs/diagrams/rendered/hivelet_erd_defense_overview.svg` |
| Then cut to, and stay | `docs/diagrams/rendered/hivelet_erd_defense_payments.svg` |
| Backup | `hivelet_erd_defense.svg`, `hivelet_erd.svg` (full 21 tables) |
| If they press on the verification gate | `hivelet_state_payment_verification.svg` — both entry paths converge on Pending Verification; only one transition settles a debt |
| Backing documents | `docs/claude_pipeline/outputs/PHASE2_ERD_AND_DATA_DICTIONARY.md`<br>`docs/claude_pipeline/outputs/PHASE2_NORMALIZATION_PROOF.md` (3NF)<br>`docs/claude_pipeline/outputs/PHASE2_SECURITY_AND_RLS.md` (RLS posture)<br>`docs/05_DATABASE_DESIGN.md` |

**Two shots, not one.** The overview carries the shape of the schema; the payments
close-up is where D-1 to D-4 are actually legible on video.

### §5 — Process and data flow diagrams · ~2 min

| | |
| :--- | :--- |
| On screen | `hivelet_dfd_context.svg` (Level 0), then `hivelet_dfd_level1.svg` (Level 1) |
| Optional | `hivelet_sequence_payment.svg` — the payment sequence, webhook-as-sole-writer |
| Backing document | `docs/claude_pipeline/outputs/PHASE1_DFD_TRACEABILITY.md` |

The Level 1 DFD went from 6 processes to 7. The reason is explained in the pack — open
by naming the change rather than hoping nobody noticed.

### §6 — Design justification · ~2–3 min

| | |
| :--- | :--- |
| Backing documents | `docs/MODULE_01_DESIGN_JUSTIFICATION.md`<br>`docs/claude_pipeline/outputs/PHASE1_BR_CROSSWALK.md`<br>`docs/claude_pipeline/outputs/PHASE1_TRACEABILITY_MATRIX.md` |
| Image | reuse `hivelet_architecture_defense.svg` |

---

## Use SVG on camera, not PNG

Both formats are in `docs/diagrams/rendered/`. **Prefer the `.svg`** — it stays sharp at
any zoom, which matters when a viewer cannot lean into the screen the way a panelist can.
The PNGs are there for tools that will not take SVG; they are 3,900–5,400 px wide, so they
hold up, but they do soften if you scale past that.

Paste-ready, themed Mermaid source for every diagram — for mermaid.live, Mermaid Chart or
Mermaid AI — is in **`docs/diagrams/DIAGRAM_SOURCE.md`**. If you regenerate one there,
paste the result back into the matching `.mmd` so the repository stays the source of truth.

To re-render everything yourself, the exact commands and per-diagram settings are recorded
at the top of `DIAGRAM_SOURCE.md`.

---

## Everything in `docs/claude_pipeline/outputs/`

The eleven written artifacts, with what each is for.

| File | What it is |
| :--- | :--- |
| `PHASE3_DEFENSE_PACK.md` | **The script.** Six sections, timings, slide table, Q&A. |
| `PHASE3_PANEL_RECOMMENDATION_REGISTER.md` | The one panel recommendation; §6 lists six withdrawn claims. |
| `PHASE2_ERD_AND_DATA_DICTIONARY.md` | Crow's Foot ERD and the full data dictionary. §6 refutes the `0.00` claim. |
| `PHASE2_NORMALIZATION_PROOF.md` | 3NF proof. 20 of 21 tables, with the one exception named. |
| `PHASE2_SECURITY_AND_RLS.md` | RLS posture, function exposure, the credential incident, open gaps. |
| `PHASE1_ARCHITECTURE_AND_PATTERN.md` | The five-tier pattern and the honest counterweight on modularity. |
| `PHASE1_BR_CROSSWALK.md` | All 49 business rules against the code. **1 violated, not 5.** |
| `PHASE1_TRACEABILITY_MATRIX.md` | 44 functional requirements to the code that implements them. |
| `PHASE1_DFD_TRACEABILITY.md` | Processes and data stores to components; the gap register. |
| `PHASE1_OPEN_DECISIONS_REGISTER.md` | Questions only the client can answer, and which are now closed. |
| `PHASE1_MODULE01_ERRATA.md` | Corrections against the already-submitted Module 01. |

Binding canon, if a question turns on "why is it like that":
`docs/claude_pipeline/PHASE1_LOCKED_DECISIONS.md` and `PHASE2_LOCKED_DECISIONS.md`.

---

## Numbers you may be asked for

Re-derived from the live database on 2026-09-14. If you quote one, quote these.

| | |
| :--- | ---: |
| Tables, all with RLS enabled **and** forced, zero policies | **21** |
| Rentable units · clusters | **33** · **5** |
| Floor distribution | **11 / 11 / 10 / 1** |
| Permissions · roles | **39** · **4** |
| Income ledger rows | **937** |
| Expense allocation rows | **1,327** |
| Whole expense ledger | **₱5,823,586.47** |
| Personal, not operating cost (Main House + Other) | **₱3,432,990.47 — 58.95%** |
| Business rules violated | **1** (BR-039) |
| Database calls still in route handlers | **131 of 164 (80%)** |

---

## Two things not to say

1. **Do not attribute a second recommendation to the panel.** There was one.
2. **Do not say** "co-ownership", "co-owner", "50/50", "owner share", "landlady share",
   "2% annual increase", "32 units", "mock", "simulator", or "Pending Consultation".
   `fifty_percent_share` is described **only** as a system-computed figure equal to half
   the row's Rent Amount, retained so the ledger reconciles with the historical
   spreadsheet.
