# Restart the tunnel and repoint the Adyen webhook

**Do this before any demo that touches GCash.** Two minutes once you have done it
once.

Nothing else in the system needs it. Cash collection, both ledgers, the Excel
exports, the whole admin side and the tenant portal all work with no tunnel at
all. The **only** thing that needs it is a GCash payment completing end to end.

---

## Why this is not a one-time setup

`cloudflared tunnel --url http://localhost:5000` creates a **free, temporary**
tunnel and gives you a **different random address every time** — something like
`shiny-coral-lamp-4821.trycloudflare.com`.

Adyen stores one fixed URL. So the address Adyen has goes dead the moment your
tunnel restarts, and it restarts on:

- a reboot
- a power cut
- closing the terminal
- losing Wi-Fi for long enough

**There is no setting that fixes this.** A permanent address needs a *named*
Cloudflare tunnel, which needs a domain you own — real setup, not worth it for a
capstone. So the working model is: the tunnel is up while you need it, and you
repoint Adyen when it restarts.

---

## Step 0 — install `cloudflared` (once, ever)

It is **not currently installed on this machine**, so this has to happen first.
In PowerShell:

```powershell
winget install --id Cloudflare.cloudflared
```

Then **close and reopen the terminal** — the PATH will not update in a window
that was already open. Check it took:

```powershell
cloudflared --version
```

If `winget` gives you trouble, the alternative is to download
`cloudflared-windows-amd64.exe` from Cloudflare's releases page, rename it to
`cloudflared.exe`, and run it from the folder you put it in with `.\cloudflared`
instead of `cloudflared`.

---

## Step 1 — start the backend

The tunnel forwards to the backend, so the backend has to be listening first.

```powershell
npm run dev:backend
```

**Leave this terminal open.** Wait for it to say it is up, then confirm:

```powershell
curl -s http://localhost:5000/api/health
```

You want `"rlsLockdown":"enforced"` in there. That is the only passing value.

---

## Step 2 — start the tunnel

A **second** terminal. The first one is running the backend.

```powershell
cloudflared tunnel --url http://localhost:5000
```

It prints a block of text with a line like:

```
https://shiny-coral-lamp-4821.trycloudflare.com
```

**Copy that address.** Yours will be different every time — that is the whole
point of Step 0's warning.

**Leave this terminal open too.** Closing it kills the tunnel.

On the first run Windows Defender Firewall will ask permission. **Allow it**, or
the tunnel cannot accept the return connection.

---

## Step 3 — repoint the webhook in Adyen

1. Adyen Customer Area → **Developers** → **Webhooks**
2. Open the existing **Standard webhook** (do not create a new one — a second
   webhook needs its own HMAC key, and the one in your `.env` belongs to this one)
3. Edit the **URL** to your new tunnel address **plus the path**:

```
https://shiny-coral-lamp-4821.trycloudflare.com/api/public/payments/adyen/webhook
```

**The path matters.** Just the tunnel address on its own will not work.

4. Leave Basic Auth alone — the username and password already in your `.env`
   still match.
5. **Do not regenerate the HMAC key.** The one in your `.env` is this webhook's
   key. Regenerating it makes every notification fail signature verification,
   which looks exactly like a broken integration and is horrible to debug.
6. Save.

---

## Step 4 — prove it works before you trust it

Press **Test** in Adyen. You want **200**.

If you get 200, the path is right, Basic Auth is right, and the tunnel is
carrying traffic.

You can also check from your own machine, which is quicker than a demo:

```powershell
curl -s -o NUL -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{}" https://YOUR-TUNNEL.trycloudflare.com/api/public/payments/adyen/webhook
```

**401 is the correct answer here.** It means the endpoint is alive and refusing
an unsigned call — which is exactly what it should do to anything that is not
Adyen. A **404** means the path is wrong. A **timeout** means the tunnel is not
reaching the backend.

---

## What "broken" looks like, so you recognise it

If the webhook is pointing at a dead address, a GCash payment **completes at
Adyen and nothing arrives**. The tenant sees success. The verification queue stays
empty. No error appears anywhere, in any log, on any screen.

That is the one silent failure left in this system, and it is why this runbook
exists. If a teammate says "I paid and nothing showed up", check this before you
look at any code — the code is almost certainly fine.

---

## Two people cannot share one webhook

An Adyen webhook points at exactly **one** URL. If you and Loyd both run tunnels,
only the machine named in the webhook receives anything. The other one sees
payments complete and vanish.

Two options:

- **Take turns.** Whoever is demonstrating edits the webhook URL to their tunnel.
  This is what the `.env` you sent Loyd assumes, which is why his `ADYEN_HMAC_KEY`
  is yours.
- **Create a second Standard webhook** pointing at his tunnel. Then he generates
  **his own** HMAC key from that webhook and puts it in his `.env` — his, not
  yours.

---

## The short version, once installed

```powershell
# terminal 1
npm run dev:backend

# terminal 2
cloudflared tunnel --url http://localhost:5000
# copy the https://...trycloudflare.com address

# then: Adyen → Developers → Webhooks → edit URL to
#       <that address>/api/public/payments/adyen/webhook
#       → Test → expect 200
```
