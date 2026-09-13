# `server/` — superseded, kept for history

**This directory is not part of the running system.** It contains a `package.json` and
lockfile and no source code at all.

Its dependencies describe an earlier, abandoned stack:

| Dependency | What it implies |
| :--- | :--- |
| `mysql2` | MySQL, not PostgreSQL |
| `ejs` | Server-rendered templates, not a Vue SPA |
| `express-session` | Cookie sessions, not JWT |

**The system as built and defended uses none of these.** It is a Vue 3 SPA against an
Express API against **Supabase PostgreSQL**, authenticated with JWT — see
`docs/claude_pipeline/outputs/PHASE2_ERD_AND_DATA_DICTIONARY.md` and
`docs/04_ARCHITECTURE.md`.

Nothing in `backend/`, `frontend/` or the build references this folder, and no file in
`backend/src` mentions MySQL. It is retained because it is part of the project's history,
not because it runs.

> **If a panelist asks why a MySQL directory is in a PostgreSQL project:** it was an early
> direction that was dropped. Keeping the dead folder was untidy; pretending it was never
> there would be worse.
