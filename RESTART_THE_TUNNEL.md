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

## Step 0 — install `cloudflared` — **ALREADY DONE on Sean's machine**

Installed 2026-09-15: **cloudflared 2026.9.1**, at
`C:\Program Files (x86)\cloudflared\cloudflared.exe`, on the machine PATH.

Smoke-tested at the same time — it reached Cloudflare and issued a working
tunnel, so the install, the network path and the firewall are all fine. That test
tunnel was closed immediately; its address was single-use and is already dead.

**One catch, and you will hit it at least once:** a terminal that was already
open when the install happened does not see the new PATH. Git Bash says
`bash: cloudflared: command not found`; PowerShell says "not recognized".

Two ways out:

- **Close that window and open a new one.** Then plain `cloudflared` works
  everywhere, forever. Worth doing once.
- **Or call it by full path in the window you already have.** In Git Bash — the
  quotes matter, there is a space in "Program Files (x86)":

  ```bash
  "/c/Program Files (x86)/cloudflared/cloudflared.exe" tunnel --url http://localhost:5000
  ```

  In PowerShell:

  ```powershell
  & "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:5000
  ```

<details>
<summary>If you ever need to install it again, on another machine</summary>

```powershell
winget install --id Cloudflare.cloudflared
```

Then reopen the terminal and check with `cloudflared --version`. If `winget`
gives trouble, download `cloudflared-windows-amd64.exe` from Cloudflare's
releases page, rename it `cloudflared.exe`, and call it as `.\cloudflared` from
whichever folder you put it in.

</details>

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

### If it says `EADDRINUSE: address already in use :::5000`

**Nothing is broken.** A backend is already running and holding the port; the
second copy simply could not have it. Check the one that is up:

```powershell
curl -s http://localhost:5000/api/health
```

If that answers, you are done with this step — **skip to Step 2** and point the
tunnel at it. Do not try to start another.

`tsx watch` reloads on code changes, so a long-running backend is usually fine to
leave alone. **The exception is `.env`:** it is read once at boot. Change a key,
the HMAC, or anything else in it and you MUST restart, or the process keeps using
the old value — which looks like the change not working.

To stop whatever is holding the port:

```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }
```

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

### Adyen's "Test configuration" button returns 401, and that is NORMAL

**Do not chase this.** Established on 2026-09-15 after an hour of chasing it.

Adyen's Test button sends a **canned sample payload** — `merchantReference:
testMerchantRef1`, a EUR amount, a placeholder `hmacSignature`. That signature is
**not computed with your HMAC key**. Three different keys were tested against two
different test notifications, nine combinations, and **not one matched** — while
our implementation passes Adyen's own published example 23 times over in
`npm run check:adyen`.

So a **401 on the Test button is a correctly-secured webhook refusing a
notification it cannot verify.** It proves the URL is reachable and Basic Auth is
configured. It proves nothing about your HMAC key either way.

What the Test button DOES tell you:

| Response | Meaning |
| :--- | :--- |
| **401 `Unauthorized.`** | Basic Auth wrong — check the username and password against `.env` |
| **401 `Invalid HMAC signature.`** | Basic Auth is fine. Expected from the Test button. Not a fault |
| **404** | Wrong URL — the `/api/public/payments/adyen/webhook` path is missing |
| **timeout / 502** | The tunnel is not reaching the backend |

### The test that actually means something

Sign a notification with the key in your own `.env` and post it. If the handler
accepts it, the whole chain works — Basic Auth, HMAC and the handler.

```bash
cd backend && npm run build
node -e "
const { computeSignature } = require('./dist/services/adyenWebhook.js');
const fs = require('fs');
const key = fs.readFileSync('../.env','utf8').split(/?
/)
  .find(l => l.startsWith('ADYEN_HMAC_KEY=')).split('=')[1].trim();
const item = { pspReference:'PROBE-'+Date.now(), merchantAccountCode:'HiveletECOM',
  merchantReference:'hivelet-hmac-probe', amount:{currency:'PHP', value:100},
  eventCode:'AUTHORISATION', success:'true' };
fs.writeFileSync(process.env.TEMP+'/probe.json', JSON.stringify({ live:'false',
  notificationItems:[{ NotificationRequestItem:{ ...item,
    additionalData:{ hmacSignature: computeSignature(item, key) } } }] }));
console.log('signed', item.pspReference);
"
```

Then POST that file to the webhook with your Basic Auth. **`200 [accepted]`** is
the pass.

It is safe to run: `hivelet-hmac-probe` matches no bill, so the handler audits it
and deliberately writes **no payment row**. Verified 2026-09-15 — payments stayed
at 15, income records at 937.

### Then, and only then, the real thing

A genuine GCash payment through the tenant portal. That is the only test that
exercises Adyen's real signing path end to end.

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

**What Claude can and cannot do for you here.** It can install `cloudflared`,
start the backend, start the tunnel and read the address out — and it can curl
the endpoint to confirm it is reachable. It **cannot** touch Adyen: that is a web
dashboard behind your login, and no Claude session has a browser or your
credentials. Pasting the URL in and pressing Test is always yours. Four clicks.

Also worth knowing: a tunnel started by a Claude session **dies when that session
ends**. Useful for proving the setup works, not for actually running a demo. Start
it yourself in a terminal you control and leave that window open.
