# The 33 test cases left for people: one session sheet

Of Appendix L's 114 test cases, 81 are already run (77 on 4 November, S-01 to S-03 and PF-09 on 13
November, `docs/TESTING_DAY/results/`). These 33 need a person, a phone or another browser. Run them
in one afternoon, write each result in the box, and give the sheet to Claude: the paper then reports
the full re-run. **Write what happened.** A case not done is NT, never a pass, and a time not
measured stays blank.

**Who and what:** the landlady on her laptop; two or three phones signed in as tenants (the test
tenant loydtest on unit PH, and any real tenants who agree); one Android phone and one iPhone; a
Windows laptop with Chrome, Edge and Firefox; a stopwatch. **No real money:** GCash stays in Adyen's
test environment, and no one presses Pay.

## The landlady (5)

| Case | Do | Should see | Result |
| :--- | :--- | :--- | :--- |
| A-01 | She signs in with her own login ID or phone number and password | The Overview opens | |
| A-03 | Ask her, without help, where she would record a payment | She finds Monthly Income within about a minute | |
| A-10 | She signs out, then signs in again | It works | |
| A-35 | Ask: "What would you use first tomorrow morning?" | Write her answer word for word | |
| S-12 | Ask: "Who else knows your password?" | Only she does | |

## Tenants (3)

| Case | Do | Should see | Result |
| :--- | :--- | :--- | :--- |
| A-19 and T-14 | As loydtest on a phone: open the GCash payment, **do not pay**, close it | The Adyen box with a GCash button, inside the window; closing it changes nothing | |
| T-18 | Ask each tenant: "Was anything confusing?" | Write their words exactly | |

## Several people at once (5)

| Case | Do | Should see | Result |
| :--- | :--- | :--- | :--- |
| C-01 | All tenants refresh their Overview together | Every screen loads. Write the slowest, in seconds | |
| C-03 | Every tenant posts a note on their repair request within the same minute | Every note saved once, none lost, none doubled | |
| C-04 | The landlady opens Repairs while C-03 happens, then refreshes | All new notes visible, each on the right request | |
| C-07 | The landlady opens Monthly Income for the whole year while the tenants are active | It loads. Write the time | |
| C-08 | The landlady on the laptop, tenants on phones, all at once | No one's session affects another's | |

## Installing and a weak signal (4)

| Case | Do | Should see | Result |
| :--- | :--- | :--- | :--- |
| O-01 | Android, Chrome: menu, then Install app (or Add to Home screen) | The Hivelet icon on the home screen | |
| O-02 | iPhone, Safari: Share, then Add to Home Screen | The Hivelet icon on the home screen | |
| O-03 | Open it from the icon | Full screen, no address bar, green top bar | |
| O-12 | On the laptop, Chrome DevTools, Network, throttling, add a custom profile with 60000 ms latency, select it, then send something | Within 45 seconds a message says it cannot tell whether it was saved, and to check before sending again | |

## Browsers and devices (6)

On each: open `hivelet.vercel.app`, open a unit, sign in, open the Overview and one other screen.

| Case | Browser | Should see | Result |
| :--- | :--- | :--- | :--- |
| CO-01 | Android, Chrome | Everything works and fits the screen | |
| CO-02 | Android, Samsung Internet | Everything works and fits the screen | |
| CO-03 | iPhone, Safari | Everything works and fits the screen | |
| CO-04 | Windows, Chrome | Everything works | |
| CO-05 | Windows, Edge | Everything works | |
| CO-06 | Firefox | Everything works | |

## Timings in seconds (9)

Laptop column on the Windows laptop, phone column on a phone, both on the same Wi-Fi.

| Case | Screen | How | Laptop | Phone |
| :--- | :--- | :--- | :--- | :--- |
| PF-01 | Public home, first load | Cache cleared (a private window), until the page is drawn | | |
| PF-02 | Public home, second load | Normal reload | | |
| PF-03 | Sign in to the Overview | From pressing Sign in until the figures show | | |
| PF-04 | Monthly Income, full year | Until the last row is visible | | n/a |
| PF-05 | Monthly Income workbook export | From the click until the file is saved | | n/a |
| PF-06 | Tenant Overview, first load | Cache cleared, until Amount due shows | | |
| PF-07 | Tenant Payments | From the menu until the history shows | | |
| PF-08 | Send a repair request | From Send until the confirmation (loydtest, a title starting TEST) | | |
| PF-10 | Lighthouse on a signed-in page | Chrome DevTools, Lighthouse, Analyze. Laptop column Desktop mode, phone column Mobile mode, both on the laptop. Write the four scores | | |

## The phone check (1)

| Case | Do | Should see | Result |
| :--- | :--- | :--- | :--- |
| N-02 | On a phone, open `/category/studio` (then one-bedroom, two-bedroom), tap units quickly one after another, then stop | The floor plan is always shown for the last unit tapped, never a blank box | |

**Afterwards:** close the TEST repair request on unit PH, and give this sheet to Claude.
