# The one thing you send Loyd

## Where it is

### `credentials/PASTE_TO_LOYD.txt`

Open it, select all, copy, send. **That is the whole job.**

It is not in this folder and it is not in the repository, because it carries
Loyd's Supabase secret key and the administrator password. It lives in
`credentials/`, which is gitignored — the same reason `loyd.env` and `creds.txt`
are not in the repo either.

---

## What it replaces

**Everything.** You no longer send `loyd.env` and `creds.txt` as separate files.
Both file contents are embedded inside that one message, and Loyd's Claude writes
them to the right places itself — which also removes the most common failure,
putting the `.env` in `backend/` instead of at the repository root.

So the send list went from three items to one.

---

## What it tells his Claude to do

| Step | |
| :-- | :--- |
| — | The five non-negotiable rules, **before** anything else |
| 1 | Clone, `install:all`, `hooks:install` |
| 2 | Write both credential files, then **prove** with `git check-ignore` that git is ignoring them |
| 3 | Read `CONTINUE_HERE.md` and report the project's current state back to him |
| 4 | Run backend and frontend |
| 5 | The three checks — health, `check:api`, `check:adyen` |
| 6 | Confirm the Supabase MCP authenticates as him — 33 rooms |

It leads with the rules rather than the setup because a fresh Claude on this repo
with no context could very reasonably decide to reset the database for a clean
test. That database holds the owner's real books.

---

## Before you send it

- **Secured group chat only**, and delete the message once he confirms he has it.
- **Do not screenshot it.** A screenshot lands in a camera roll and syncs to a
  cloud backup — that is how the last leak outlived the file it came from.

---

## If he asks

**"Do I need the files you sent earlier?"** No. Everything is in the message.
Anything sent before **2026-09-14** carries a Supabase secret key that has since
been revoked and will simply fail.

**"Should I commit the `.env`?"** Never. Step 2 makes his Claude prove git is
ignoring both files before it is allowed to do anything else.

---

## The manual version

`SET UP LOYDS LAPTOP.md`, same folder — the same steps written for you rather
than for his Claude, in case you would rather walk him through it yourself.
