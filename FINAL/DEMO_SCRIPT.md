# Defense demo script

A live demonstration of Hivelet in about 8 minutes that shows every feature the objectives name
**without putting a real tenant's name or the owner's money on the projector.** Chapter 3, Section
3.4 promises that names and amounts are hidden; a live demo of the owner's ledger would break that
promise in front of the panel. Checked against the live system on 13 October 2026.

**The safe data:** the test tenant **loydtest**, on unit **PH** (the Penthouse). Its two receipts
are voided and its three GCash payments rejected, so nothing it does touches the owner's totals.
Its passwords are with Sean; never type them where the projector shows them.

**Two people:** one drives the laptop (the owner's side and the public site), one drives a phone
(the tenant). The rest of the team answers questions.

---

## The day before

1. Run `npm run backup`.
2. Sign in once on the live site as the owner and as loydtest, so neither account is locked on the
   day.
3. On the phone: open `hivelet.vercel.app`, sign in as loydtest, and **Add to Home Screen**. Leave it
   signed in.
4. Check Adyen is on the **test** account (it is; no real money moves), and that one GCash test
   payment goes through end to end. Reject it afterwards.
5. Put the fallback on the laptop, offline: the defense film (`video/`) and the paper's figures
   (`FINAL/CLAUDE MANUSCRIPT/images/`).
6. ~~Close the two test repair requests on PH~~ **Done 13 October**: all three test requests on PH
   and a 4 October test inquiry were deleted through the app (audit trail, 18:50). Check Repairs is
   still empty of tests the day before; the 30 September inquiry is real evidence and stays.
7. **After the last push before the defense, open the installed app on the phone once and close
   it.** The installed copy updates on the visit after a change; until then it shows the previous
   version (seen 13 October: a laptop's saved copy still had the street misspelled after the fix
   went live).
8. **Ask the owner** whether the panel may see her own screens. If she says no, show her side only
   through the figures (Figures 4-7 to 4-10 use sample records).

---

## The demonstration

### 1. The public website (laptop, 1 minute). Objective 2: booking and reservations
- Open `hivelet.vercel.app`. Say: "This is what a person looking for a room sees, with no account."
- Open a unit category, then a unit: its rate, floor and floor plan.
- Open the inquiry form, fill it as **"Defense Demo"**, and press **Send inquiry**. Point out the
  reference code they can come back with.

### 2. The tenant (phone, 2 minutes). Objective 2: tenant management, payments
- Open the installed app from the home screen. Say: "It installed from the browser; nothing came
  from an app store, and it takes about 1.2 MB."
- **Overview**: the unit, the rent and the standing.
- **Payments and billing**: month by month, receipts.
- Press **Pay with GCash**. Adyen's payment window opens. On Adyen's GCash test page choose a
  successful payment. The phone returns to "Payment received". Say: "Nothing counts yet. The owner
  must verify it."

### 3. The owner verifies (laptop, 1 minute). Objective 2: financial tracking
- Sign in as the owner. Go to **Monthly Income**, the payments awaiting verification.
- Show the loydtest payment, then press **Reject payment**, not **Verify payment**. (Verifying would
  write a receipt into her ledger.) Say: "Verifying settles the bill and writes the receipt in one
  step; we reject this one because it was a demonstration."
- On the phone, the payment now says **Not accepted**, within about 2 seconds. (Touch the phone first
  if nobody has for five minutes: an untouched page checks every 30 seconds.)

### 4. A repair request (phone and laptop, 2 minutes). Objective 2: maintenance ticketing
- Phone: **Repairs**, a new request with a photo, **Send request**.
- Laptop: the request appears on **Repairs** within about 2 seconds, without refreshing. Move it to
  in progress, then close it. The phone shows each change, with a notification.
- Only with the owner's consent, since the board shows other units' requests. Otherwise show it on
  the phone alone.

### 5. Offline (phone, 1 minute). Objective 2: PWA support
- Turn on airplane mode and reopen the app. It opens, shows what was last loaded with the time it
  was saved, and says nothing can be saved or paid until the connection returns.
- Turn the connection back on: "Back online".

### 6. Security in one sentence (laptop, 30 seconds). Objective 2: role-based access
- Say: "A tenant sees only their own records; the database itself enforces it on every table, and
  every change the owner makes is in an audit trail the application cannot erase."

---

## Right after

- **Inquiries**: delete the "Defense Demo" inquiry.
- **Repairs**: make sure the demo request is closed.
- **Monthly Income**: confirm the demo payment shows as rejected.
- Decide whether loydtest stays on PH (see the note below).

## If something fails

- **No internet:** play the film, then walk through the figures.
- **GCash does not return:** say so plainly ("the gateway is in test mode; here is the same flow
  from the testing day") and continue with step 4. Do not retry on stage.
- **A sign-in is refused:** do not retry more than once (five wrong tries lock the account for 15
  minutes); switch to the figures.

---

## A note on unit PH

Since 1 October 2026 loydtest has been the tenant of **PH**, the property's one vacant unit, so the
live site counts **33 of 33 units occupied** and shows no vacancy, while the property really has 32
occupied (CLAUDE.md, and Chapter 4). It also leaves one open test bill of ₱30,400 on PH. For the
demo this is useful; after it, the owner (or Sean) should **move loydtest out** through Tenants, so
the public site shows PH as vacant again. It is recorded in `BLOCKED_FOR_SEAN.md` as B-106.
