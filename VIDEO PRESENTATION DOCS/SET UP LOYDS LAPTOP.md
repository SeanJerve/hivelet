# Setting up Loyd's laptop

**You were close.** It is his own `JWT_SECRET` and his own `ADYEN_HMAC_KEY` that
he changes — but there are **two files only you can send** and **one invite only
you can make**, and without those he gets stuck in ways that are not obvious.

Nothing here was deleted. Both files are sitting in `credentials/` on your
machine right now, already prepared.

---

## Part A — what you do (about 5 minutes)

### A1. Send him two files

Both are in `credentials/` on your laptop. Both are gitignored, so cloning the
repo does **not** give him either one.

| File | What it is | Why he needs it |
| :--- | :--- | :--- |
| **`credentials/loyd.env`** | A complete, ready `.env` — all 16 variables filled in, with **his own** Supabase secret key (the one named `loyd`) | Without it the backend will not start |
| **`credentials/creds.txt`** | The admin login and the shared demo-tenant password | The test suites read this file. `npm run check:api` fails instantly without it, and the error does not say why |

Send both, confirm he has them, then delete the message. Do not screenshot
either one — a screenshot lands in a camera roll and syncs to a cloud backup,
which is how the last leak outlived the file it came from.

### A2. Invite him to the Supabase project

**Supabase → your project → Project Settings → Team → Invite.**

This is the step a pasted key does not cover. `.mcp.json` points the Supabase MCP
at the project, and the MCP authenticates against **his own** Supabase account.
Without membership his Claude cannot query the database — which matters, because
*"verify against the database, not the documents"* is rule 3 of the handoff, and
it is how both of the big errors in this project were caught.

### A3. Tell him he needs his own Adyen webhook

Not a value you send — something he creates. See **B5**. The important part is
that **an Adyen webhook points at exactly one URL**, so you two cannot share
one: whoever is not named in the webhook will complete a GCash payment and see
nothing reach the ledger, with no error anywhere.

---

## Part B — what Loyd does

### B1. Clone and install

```bash
git clone https://github.com/SeanJerve/hivelet.git
cd hivelet
npm run install:all
npm run hooks:install
```

`hooks:install` is not optional — it installs the pre-commit scanner that blocks
a commit containing secrets. Given what happened in August, he should run it
before his first commit, not after.

### B2. Drop in the `.env`

Rename the file you sent him to `.env` and put it at the **repository root**,
beside `package.json`.

**Not** in `backend/`. There is no `backend/.env` and nothing reads one.

### B3. Change line one — his own `JWT_SECRET`

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Paste the output over the `JWT_SECRET` value. The command is already in a comment
directly above that line in the file.

Tokens are signed and verified by the same backend, so his does **not** need to
match yours. Sharing one only means that if either laptop is lost, whoever finds
it can mint an admin token for both.

### B4. Put `creds.txt` in place

`credentials/creds.txt`. Create the folder if it is not there.

### B5. Change line two — his own `ADYEN_HMAC_KEY`

This one needs a tunnel first, because Adyen cannot reach a laptop on localhost.

```bash
cloudflared tunnel --url http://localhost:5000
```

Copy the `https://….trycloudflare.com` address it prints. Then:

1. **Adyen Customer Area → Developers → Webhooks → Add webhook → Standard webhook**
2. URL: that tunnel address **+ `/api/public/payments/adyen/webhook`**
3. **Generate an HMAC key.** Paste it over `ADYEN_HMAC_KEY` in his `.env`.
4. Set Basic Auth to a username and password of his choosing, and put the same
   two values in `ADYEN_WEBHOOK_USER` and `ADYEN_WEBHOOK_PASSWORD`.
5. Press **Test** in Adyen and confirm a 200.

**He must not keep your HMAC key.** Each webhook has its own. Using yours against
his webhook makes every notification fail signature verification — which looks
exactly like a broken integration and is genuinely horrible to debug.

On Windows the first `cloudflared` run raises a **Windows Defender Firewall**
prompt. Allow it, or the tunnel cannot accept the return connection.

> **The tunnel address changes every time it restarts** — after a reboot, a power
> cut, or closing the terminal. When it does, the old URL stops resolving and
> Adyen's notifications go nowhere. Paste the new one into the webhook and press
> Test again. Two minutes, and the payment demo silently does not work without it.

### B6. Run it

```bash
npm run dev:backend      # :5000
npm run dev:frontend     # :5173
```

### B7. Prove it works — three checks, in order

```bash
# 1. database reachable AND the lockdown genuinely in force
curl -s http://localhost:5000/api/health
```

Look for `"rlsLockdown":"enforced"`. **That is the only passing value.**
`unverified` means the publishable key was rejected before it reached PostgreSQL,
so nothing was actually tested.

```bash
# 2. 26 endpoint and permission checks
cd backend && npm run check:api

# 3. the signature implementation, 23 checks, no network needed
npm run check:adyen
```

All three green means he is fully set up.

**If `check:api` fails immediately** → `creds.txt` is missing or in the wrong
place. It is the least obvious failure on a fresh machine, and it is almost
always this.

---

## What he does NOT need from you

| | |
| :--- | :--- |
| A separate Supabase publishable key | It is shared, and it is already in the file |
| Your `JWT_SECRET` | He generates his own — B3 |
| Your `ADYEN_HMAC_KEY` | He generates his own — B5 |
| Adyen Customer Area access | Only if he wants to make his own webhook, which B5 assumes. If you would rather not add him, you can create the second webhook yourself and send him its HMAC key |

---

## One thing still open, your call

The four secret keys — `loyd`, `eljohn`, `kiel`, `bins` — were fully readable in
a screenshot sent into this conversation. Not a public repo, so not the same
scale as August, but each of them bypasses row-level security over the real
ledger.

Regenerating is one click each in Supabase. If you do regenerate `loyd`, tell me
and I will rebuild `loyd.env` with the new key in about ten seconds.

You said to leave them for now, so they are untouched.

---

## The full reference

`CONTINUE_HERE.md` at the repository root. It carries the five rules that matter,
the tiered breakdown of all 16 environment variables by how much care each needs,
and what to work on next.
