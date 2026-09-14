# Paste this into Loyd's Claude

Loyd opens a terminal in the folder where he keeps projects, starts Claude Code,
and pastes **everything inside the box below** as his first message.

He needs two files from Sean first (`loyd.env` and `creds.txt`). The prompt tells
him where to put them and stops until he has.

---

```text
You are joining an existing capstone project called Hivelet. I am John Lloyd M.
Cuario (Loyd), Database Administrator. Set up my machine and verify it works.

FIVE RULES THAT ARE NOT NEGOTIABLE. Read these before you touch anything.

1. The Supabase database is LIVE and holds the property owner's real financial
   records - 937 income rows, 1,327 expense allocations. Never DROP, never wipe,
   never truncate, never "reset for a clean test". Every schema change is a new
   numbered migration file in database/migrations/.
2. Never edit database/FULL_DATABASE_SCHEMA.sql. It has been wrong about the
   live schema more than once. database/live_schema.csv is the source of truth,
   and the Supabase MCP (execute_sql) against the catalogue is better still.
3. Verify before you report. A "defect" about generated columns storing 0.00 was
   repeated across nine documents and logged as two business-rule violations. It
   was never true, and the fix it proposed would have broken every income write.
   Check claims against the database, not against the documents.
4. BR-035 wording is locked. The fifty_percent_share column is described ONLY as
   a system-computed figure equal to half that row's Rent Amount, kept for ledger
   parity with the owner's historical spreadsheet. Never name a party, recipient,
   purpose or destination for it. Never write "co-ownership", "co-owner",
   "50/50", "owner share" or "landlady share" anywhere.
5. Adyen with GCash is committed, configured and working. Never describe the
   payment gateway as a mock, a simulator, or "pending consultation".

Two more standing facts: there is NO 2% rent escalation anywhere in this system
(the owner sets rates by hand), and the property is 33 units, not 32.

NOW DO THIS, IN ORDER. Stop and tell me if any step fails.

STEP 1 - get the code
  git clone https://github.com/SeanJerve/hivelet.git
  cd hivelet
  npm run install:all
  npm run hooks:install

  hooks:install is not optional. It installs the pre-commit secret scanner. A
  secret was committed to this repo's public history once already; that is why
  every .env and the whole credentials/ folder are gitignored.

STEP 2 - the two files Sean sent me
  Sean sent me two files directly. They are NOT in the repository and a git pull
  will never produce them - that is deliberate. Ask me for them if I have not
  already put them in place, then:

  a) Rename loyd.env to  .env  and put it at the REPOSITORY ROOT, beside
     package.json. NOT in backend/. There is no backend/.env and nothing reads
     one. This is the single most common way this setup goes wrong.
  b) Put creds.txt at  credentials/creds.txt  (create the folder). The test
     suites read it. Without it `npm run check:api` fails instantly and the
     error message does not say why.

  Everything in the .env is already filled in for me, including my own Supabase
  secret key and my own JWT secret. I do not need to change anything to run it.

STEP 3 - read the handoff document
  Read CONTINUE_HERE.md at the repository root, start to finish. It carries the
  five rules above, a tier-by-tier breakdown of all 16 environment variables by
  how much care each needs, the current state of the audit, and what to work on
  next. Then read docs/claude_pipeline/CONTINUE_HERE.md for pipeline detail.
  Summarise back to me what you understand the project's current state to be and
  what the next piece of work is.

STEP 4 - run it
  npm run dev:backend     (port 5000)
  npm run dev:frontend    (port 5173)

STEP 5 - prove it actually works. Three checks, in this order.

  1) curl -s http://localhost:5000/api/health

     Look for "rlsLockdown":"enforced". That is the ONLY passing value.
     "unverified" means the publishable key was rejected before it ever reached
     PostgreSQL, so the lockdown was never actually tested - it is not a pass.
     "exposed" means the probe read live rows it should not have been able to
     read, and you should stop and tell me immediately.

  2) cd backend && npm run check:api      (26 endpoint and permission checks)

  3) npm run check:adyen                  (23 signature checks, no network)

  All three green means I am set up. If check:api fails immediately, it is
  almost always creds.txt in the wrong place - see step 2b.

STEP 6 - confirm your database access
  This project has the Supabase MCP wired up in .mcp.json. I have been added to
  the Supabase project as a team member, so it authenticates as me. Confirm it
  works by running a read-only query - for example, count the rooms. You should
  get 33. If the MCP cannot authenticate, tell me and I will ask Sean to check
  my membership.

WHAT I DO NOT NEED
  A separate Supabase publishable key (shared, already in the file).
  Sean's JWT secret (mine is already generated and in the file).
  A different Adyen API key, client key or merchant account (all shared, all in
  the file and correct).

ONE THING THAT IS AN ACTION, NOT A SETTING
  Adyen cannot reach a laptop on localhost, so GCash payments only arrive if a
  tunnel is running and an Adyen webhook points at it:
     cloudflared tunnel --url http://localhost:5000
  Sean and I are sharing his one webhook for now, and the HMAC key in my .env is
  already his and already correct. Whoever is testing points that webhook at
  their own tunnel URL. Do not tell me to generate a new HMAC key unless I say I
  am creating a second webhook of my own - an HMAC key belongs to one specific
  webhook, and using the wrong one makes every notification fail signature
  verification, which looks exactly like a broken integration.

  The tunnel address changes every time it restarts. When it does, the webhook
  has to be repointed or payments silently go nowhere.

Start at step 1 and work through to step 6. Report what passed and what did not.
```
