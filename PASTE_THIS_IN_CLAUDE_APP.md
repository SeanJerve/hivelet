# Paste this into Claude on the desktop app

Open the Claude desktop app, point it at this folder
(`C:\Users\seanjerve\OneDrive\Desktop\hivelet`), and paste the block below as your
first message.

No secrets in it — everything it needs is already on this machine: `.env` at the
repository root, `credentials/creds.txt`, and `.mcp.json`, which is committed, so
the Supabase database connection follows you into the app with nothing to set up.

---

## COPY FROM HERE

```text
You are continuing an audit of Hivelet, an apartment management system for the Fe
Galang Da Silva Boarding House in Legazpi City — Bicol University Group 4, IT 124
Capstone Project 2. I am Sean Jerve Ll. Rebancos.

This work was running in an editor extension and is moving here. Everything is
committed and pushed; nothing is half-finished.

FIVE RULES THAT ARE NOT NEGOTIABLE. Read these before you touch anything.

1. The Supabase database is LIVE and holds the owner's real financial records -
   937 income rows, 1,327 expense allocations, 33 occupied units. Never DROP,
   never wipe, never truncate, never "reset for a clean test". Every schema
   change is a new numbered migration in database/migrations/.
2. Never edit database/FULL_DATABASE_SCHEMA.sql. It does not describe this
   database and has been wrong about it repeatedly. Ask the CATALOGUE - the
   Supabase MCP against information_schema, pg_index, pg_constraint, pg_trigger.
   database/live_schema.csv is better than the SQL file but has itself been wrong.
3. Verify before you report, and say what you verified against. "It typechecks"
   is not verification.
4. BR-035 wording is locked. The fifty_percent_share column is described ONLY as
   a system-computed figure equal to half that row's Rent Amount, kept for ledger
   parity with the owner's historical spreadsheet. Never name a party, recipient,
   purpose or destination for it. Never write "co-ownership", "co-owner",
   "50/50", "owner share" or "landlady share" anywhere.
5. Adyen with GCash is committed, configured and working. Never describe the
   payment gateway as a mock, a simulator, or "pending consultation".

Two more standing facts: there is NO 2% rent escalation anywhere in this system
(the owner sets rates by hand), and the property is 33 units, not 32.

DO THIS FIRST, IN ORDER

STEP 1 - read three documents, in this order, start to finish.

  CONTINUE_HERE.md                  what is true, and what to do next
  docs/13_AUDIT_JUDGEMENT_LOG.md    WHY the judgements went the way they did
  docs/12_ITERATION_HISTORY.md      the agile iteration record, written for the
                                    professor and panel

  The middle one matters most to you. It carries the decisions a fresh reader
  would otherwise silently reverse - why a divergent value is accepted on
  purpose, why two different failure treatments exist for database writes, why
  three open client decisions are printed on a spreadsheet instead of resolved in
  code, and why nothing was ever written to production to test anything.

STEP 2 - prove the environment works before changing anything.

  npm run dev:backend        (port 5000, leave it running)

  curl -s http://localhost:5000/api/health
     Look for "rlsLockdown":"enforced". That is the ONLY passing value.
     "unverified" means the publishable key was rejected before it reached
     PostgreSQL, so nothing was actually tested. "exposed" means stop and tell me.

  cd backend && npm run check:api       53 endpoint, RBAC, perimeter and input checks
              npm run check:adyen       23 HMAC signature checks, no network
              npm run check:billing     water / grace / period / receipt allocation
              npm run check:writes      no database write discards its result
  cd .. && npm run check:rules          the business rule register agrees with itself
           npm run check:secrets        scans for committed credentials

  All seven were green at handoff: 53 / 23 / all / all / all / all / clean.
  If any of them is not, that is the first thing to look at - do not start new
  work on a red suite.

  Two of them behave unusually and are meant to:
    - check:api posts 1e999 at three money columns to prove Infinity is refused,
      and downloads both Excel reports. Those are real requests. A refused request
      writes nothing, which is why it is safe.
    - the BR-013 half of check:billing needs no database at all.

STEP 3 - confirm your own database access.

  .mcp.json is committed and points the Supabase MCP at the project. Run a
  read-only query - count the rooms. You should get 33. If the MCP cannot
  authenticate, tell me.

STEP 4 - tell me where things stand, in your own words.

  How many business rules are enforced, what is still open and why, and what you
  would work on next. If your summary disagrees with the documents, say so - the
  documents have been wrong eight times in this project and finding the ninth is
  useful work.

WHAT I WANT FROM YOU AFTER THAT

Work continuously. Do not stop after each task to ask permission - report what
you did and keep going. I will tell you when to stop. Things that genuinely need
me, rather than you:

  - anything that needs a decision from the client, Mrs. Da Silva
  - anything that needs a tunnel running or a webhook repointed
  - anything that would write test data to the live database
  - team roles, which the documents disagree about and which is ours to settle

Everything else, use your judgement.

Two habits from the previous session that I want kept. Verify against live data
and name the figures you checked. And do not invent a value to fill a gap - this
project has been bitten four times by exactly that, and the judgement log lists
them.
```

## COPY TO HERE

---

## What you need to do, and what you do not

**Nothing to install or configure.** The `.env`, `credentials/creds.txt` and
`.mcp.json` are all already on this machine and the app reads the same folder.

**Two things worth doing while you are at it:**

| | |
| :--- | :--- |
| **Restart the tunnel and repoint the Adyen webhook** | `cloudflared tunnel --url http://localhost:5000`, paste the new URL into the webhook, press Test, expect 200. Until this is done a GCash payment completes at Adyen and **never reaches the ledger, silently** |
| **Rotate `eljohn`, `kiel` and `bins`** | They appeared in a screenshot and are still live. One click each in Supabase, and no file is built around any of them, so there is nothing to rebuild afterwards |

**One thing to avoid:** do not run two Claude sessions against this repo at the
same time. Two sessions editing the same files and pushing to `main` will
collide, and losing a commit is worse than losing a session.

**When you are satisfied the app session is working, close the extension one.**
Everything it knew that mattered is in `docs/13_AUDIT_JUDGEMENT_LOG.md`.
