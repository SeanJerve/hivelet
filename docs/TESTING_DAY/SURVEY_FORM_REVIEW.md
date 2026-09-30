# Review of the live survey form (30 Sep 2026)

The form: *Hivelet System Evaluation — ISO/IEC 25010 Software Quality Assessment* (Google Forms,
built by hand by the team). Reviewed question by question against Chapter 4 §4.4 and
`docs/chapter 4 tenative/ISO_25010_SURVEY_INSTRUMENT.md`.

**Verdict: good content, the right length, but fix six things before anyone answers.** The rated
questions are word for word what Chapter 4 prints, so the results drop straight into Tables 14 to 21.
`scripts/survey/compute-survey.mjs` reads this form's export (grid questions) as of 30 Sep; checked on
a mock export built from the form's own 76 rows.

## Length

| Group | Rated items now | Should be | Time to answer | Verdict |
| :--- | --: | --: | :--- | :--- |
| Landlady | 25 | 28 | about 6 to 8 min | Right, once Portability is added |
| Tenants | 18 | 18 | about 4 to 5 min | Right |
| Technical evaluators | 33 | 33 | about 8 to 10 min | Right for IT people |
| Prospective tenants | 0 | 12 | about 3 min | Missing |

Not too long: grids let a person answer a whole characteristic on one screen. Not too short:
every group rates every characteristic it can actually judge, with at least two items for most, so each
composite mean rests on more than one question.

## Must fix (the results are wrong or unusable without these)

1. **Settings > Responses > turn OFF "Limit to 1 response".** It forces every tester to sign in to
   Google; tenants without a Google account on their phone cannot answer, and two people cannot
   answer on one shared phone.
2. **Delete the "Full Name" question** (or make it optional). The form's own description says
   "Your responses are anonymous", and Chapter 3's ethics section says the same. A required name
   contradicts both and may make tenants rate the landlady's system more kindly than they feel.
   The observation sheets use tester codes, not names; the survey needs neither.
3. **Add Portability to the landlady's section** (Section 2), a grid titled `Portability` with
   these rows (same columns as the others):
   - `26. The system works on the devices I already own.`
   - `27. I can install the system on my phone without going to an app store.`
   - `28. I did not need to install any other software to use the system.`
   Without it, Table 21 has no landlady rows.
4. **Add prospective tenants** (only if prospects are tested today):
   - In "Which best describes you?", add the choice
     `Looking for a room (not living here yet) / Naghahanap ng kwarto (hindi pa nakatira dito)`
     and set it to go to a new section.
   - Add a section `Section 5: LOOKING FOR A ROOM / NAGHAHANAP NG KWARTO` at the end, with the grids
     below. At the end of Section 4 (technical evaluators) set "After section 4" to **Submit form**,
     or technical evaluators will walk into the prospects' questions.
5. **Open comments: make them optional, and add the second question to every group:**
   - Landlady: `What was difficult, confusing, or missing? Please be specific.`
   - Tenants: `What was difficult, confusing, or missing? / Ano ang nahirapan kang gawin, nakalito sa iyo, o kulang sa sistema?`
   - Technical: `Which aspect most needs improvement, and what would you change?`
   A required comment box makes people type "none" to get past it. The "difficult or missing"
   answer is the most useful thing the survey collects: Chapter 4 explains every low score with it.
6. **Check each grid has "Require a response in each row" on** (the grid's ⋮ menu). Otherwise a
   skipped row is saved blank without warning.

## Should fix (better answers, not wrong without it)

7. **Tenant rows in Filipino as well.** Paste the rows below over the tenant grid rows, keeping the
   numbers. Written "English / Filipino"; the scoring script reads either.
8. **Scale labels:** `5 - Strongly Agree` uses a hyphen and the rest a long dash. Cosmetic only.
9. **Landlady item 4** ("Online payments made by tenants appear correctly for me to verify") will
   not have happened on the day, because nobody pays by GCash. Tell her she may answer Neutral if she
   has not seen it; do not remove the item (Chapter 4 prints it).

Fine as it is: the consent question (Yes continues, No submits), the branching on "Which best
describes you?" (landlady to 3, tenants to 4, technical to 5), Sections 3 and 4 ending in
Submit, emails not collected, the device question.

## Copy-paste: tenant rows, bilingual (item 7)

```
1. I can see my own unit details, my bill, and what I still owe. / Nakikita ko ang detalye ng aking unit, ang aking bill, at kung magkano pa ang dapat kong bayaran.
2. I can submit a maintenance request and follow what happens to it. / Nakakapagpasa ako ng request para sa pagpapakumpuni at nasusubaybayan ko kung ano ang nangyayari dito.
3. I can see a record of the payments I have made. / Nakikita ko ang talaan ng mga bayad na naibigay ko na.
4. I can tell what each screen is for without being taught. / Nauunawaan ko kung para saan ang bawat screen kahit walang nagturo sa akin.
5. The words used in the system are easy to understand. / Madaling maintindihan ang mga salitang ginamit sa sistema.
6. It is clear how much I owe and what the amount is made up of. / Malinaw kung magkano ang dapat kong bayaran at kung paano ito nabuo.
7. When something goes wrong, the message tells me what to do about it. / Kapag may mali, sinasabi ng mensahe kung ano ang dapat kong gawin.
8. I was able to use the system without anyone explaining it to me. / Nagamit ko ang sistema kahit walang nagpaliwanag sa akin.
9. The system opens quickly. / Mabilis magbukas ang sistema.
10. The system responds without delay when I move between screens. / Mabilis tumugon ang sistema kapag lumilipat ako ng screen.
11. The system is available whenever I try to use it. / Magagamit ang sistema sa tuwing kailangan ko ito.
12. The information shown to me is correct and up to date. / Tama at napapanahon ang mga impormasyong ipinapakita sa akin.
13. When something cannot be loaded, the system says so instead of showing a wrong amount. / Kapag may hindi mabuksan o ma-load, sinasabi ito ng sistema sa halip na magpakita ng maling halaga.
14. The system works correctly in the browser I normally use. / Gumagana nang maayos ang sistema sa browser na karaniwan kong ginagamit.
15. I can use the system at the same time as my other apps. / Nagagamit ko ang sistema kasabay ng iba kong mga app.
16. The system works on my own phone or computer. / Gumagana ang sistema sa sarili kong cellphone o computer.
17. I can open the system on more than one device. / Nabubuksan ko ang sistema sa higit sa isang device.
18. I did not need to install anything extra to use it. / Hindi ako kinailangang mag-install ng kahit anong karagdagang app para magamit ito.
```

## Copy-paste: the prospects' section (item 4)

One grid per heading, same five columns as the other sections.

```
Functional Suitability
1. I could find which kinds of units the boarding house has and how much they cost. / Nakita ko kung anong mga uri ng unit ang mayroon at kung magkano ang mga ito.
2. I could see enough about a unit (its floor, how many people can stay, its floor plan) to decide whether to ask about it. / Nakita ko ang sapat na detalye ng isang unit (palapag, ilang tao ang puwede, floor plan) para magpasya kung magtatanong ako.
3. I could send an inquiry about a unit without difficulty. / Nakapagpadala ako ng tanong tungkol sa isang unit nang walang hirap.

Usability
4. I could tell what each part of the website is for without being taught. / Nauunawaan ko kung para saan ang bawat bahagi ng website kahit walang nagturo sa akin.
5. The words used on the website are easy to understand. / Madaling maintindihan ang mga salitang ginamit sa website.
6. When I made a mistake in the inquiry form, the message told me what to fix. / Kapag nagkamali ako sa inquiry form, sinabi ng mensahe kung ano ang dapat ayusin.

Performance Efficiency
7. The website opens quickly. / Mabilis magbukas ang website.
8. The pages respond without delay when I move around the website. / Mabilis tumugon ang mga pahina kapag lumilipat ako sa website.

Reliability
9. The information shown (units, rates, availability) looks correct and up to date. / Mukhang tama at napapanahon ang impormasyong ipinapakita (mga unit, presyo, bakante).

Compatibility
10. The website works correctly in the browser I normally use. / Gumagana nang maayos ang website sa browser na karaniwan kong ginagamit.

Portability
11. The website works on my own phone. / Gumagana ang website sa sarili kong cellphone.
12. I did not need to install anything to use it. / Hindi ko kinailangang mag-install ng kahit ano para magamit ito.
```

Open comments for prospects (optional, short answer or paragraph):

```
What did you find most useful on the website? / Ano ang pinakanakatulong sa iyo sa website?
What was difficult, confusing, or missing? / Ano ang nahirapan kang gawin, nakalito sa iyo, o kulang sa website?
```

## After editing

Open the form's **Preview** (the eye icon) and walk each branch once: landlady, tenant, technical,
prospect, and "No, I do not agree". Each should end at Submit after its own section only. Then
delete any test responses (Responses > ⋮ > Delete all responses) before the first real tester.
