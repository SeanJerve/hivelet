# Blocked — needs Sean's setup

**A queue, not a discussion.** Anything Loyd's side could not finish because of what his machine
or credentials cannot reach goes here, in enough detail that Sean can pull, read one entry, and
act without asking a question.

**Never stop working because of one of these.** Record it, move to the next thing, come back if
Sean clears it. The point of this file is that nobody waits.

---

## How to add one

Copy the block. Keep it short, and make it **actionable without context**: Sean will read this
cold, possibly at midnight, after a day of his own work.

```markdown
### B-00 — one line saying what it is

- **Blocked on:** the specific thing that is missing (Adyen keys, the tunnel, a decision, …)
- **What I was doing:** the task, in one sentence
- **What I already did:** files touched, migrations written, anything ready to go
- **What Sean needs to do:** the smallest concrete action, ideally a command
- **How to know it worked:** the check, or the figure that should change
- **Raised:** YYYY-MM-DD by whom
```

**If the work is ready and only the *applying* is blocked, say so and commit the work.** A
migration that is written, reviewed and just not applied is a good entry. A vague "the payment
thing did not work" is not.

---

## Open

*(none yet — this file was created 2026-09-17 when the work split across two machines)*

---

## The ones already known, carried over

### B-01 — Rotate the two demo passwords

- **Blocked on:** whoever holds the accounts should do it once, not both of us at different times
- **What I was doing:** long-standing item — both passwords have been in GitHub history since
  **2026-08-25**
- **What I already did:** there is now a change-password screen (A-12), and
  `scripts/rotate-demo-passwords.mjs` exists
- **What Sean needs to do:** rotate both, update `credentials/creds.txt`, and tell Loyd — five of
  the suites sign in with those credentials, so they break on the other machine until he has the
  new file
- **How to know it worked:** `npm run check:api` still passes with the new `creds.txt`
- **Raised:** 2026-09-17

### B-02 — Apply `database/migrations/023`

- **Blocked on:** a decision rather than access — it touches accounts, not the ledger
- **What I was doing:** three duplicate profiles are holding **working passwords** on a shared
  literal
- **What I already did:** the migration is written and reviewed. One statement
- **What Sean needs to do:** confirm, then apply. **Do not strip the invoice numbers from the
  names** — they are how the rows are identified
- **How to know it worked:** the three profiles read inactive; nothing else changes
- **Raised:** 2026-09-17

### B-03 — The Adyen webhook is shared, so only one machine can receive at a time

- **Blocked on:** coordination, not access. **Both machines have the keys.** There is one webhook
  registered with Adyen, and it can point at exactly one tunnel
- **What I was doing:** n/a until someone tests a real GCash payment
- **What I already did:** `check:adyen` runs anywhere (29 HMAC checks, no network), so signature
  handling stays covered on both machines regardless
- **What is needed:** whoever is testing starts `cloudflared tunnel --url http://localhost:5000`
  and repoints the webhook at their own URL. **The address changes on every restart** — a reboot,
  a power cut, or closing the terminal — and when it does, payments silently go nowhere. Say in
  the group chat when you take it
- **How to know it worked:** a real payment produces a `Pending Verification` row and the webhook
  handler logs it
- **Never:** generate a new HMAC key unless you are deliberately creating a *second* webhook.
  Adyen issues that key and keeps its own copy to sign with, so a different value makes every
  notification fail verification — indistinguishable from a broken integration, and horrible to
  debug
- **Raised:** 2026-09-17

> **Standing note on this one:** the gateway is **configured and working** against Adyen's
> developer sandbox with GCash. It is not a mock, not a simulator, and not pending a decision.
> `check:canon` fails the build on any document that says otherwise.

### B-04 — Run `TESTING_REHEARSAL.md`

- **Blocked on:** nothing technical — it just needs a person, about forty minutes, and a real
  browser
- **What I was doing:** 26 steps that exercise **every write path once**. No write path in this
  system has ever been used by a human being
- **What I already did:** the document is written, every writing step carries an Undo, and it
  runs on `PH`, the only vacant unit
- **What Sean needs to do:** run it, or hand it to Loyd — **either machine can**, and whoever
  does it should tick the boxes in the file and commit them
- **How to know it worked:** the sheet is filled in, and step 23b in particular shows em dashes
  rather than ₱0.00 with the backend stopped
- **Raised:** 2026-09-17
