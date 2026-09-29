/**
 * Builds the Hivelet ISO/IEC 25010 survey as a Google Form, in one run.
 *
 * Written 2026-09-29 from ISO_25010_SURVEY_INSTRUMENT.md (same folder), item for item, so the form's
 * wording matches Chapter 4's Tables 14 to 21 exactly. The only change from the instrument is the one
 * it asks for: the group label "Resident" reads "Tenant".
 *
 * HOW TO USE (about two minutes)
 *   1. Go to https://script.google.com, signed in to the Google account that should own the form.
 *   2. New project. Delete what is in the editor, paste this whole file, and Save.
 *   3. Choose `buildHiveletSurvey` in the function box and press Run. Allow the permission it asks
 *      for (it creates a form in your Drive; it reads nothing else).
 *   4. Open View > Logs (or Execution log). It prints the form's edit link and the link to send.
 *   5. Open the edit link, press the eye icon, and walk all three answers to Q1 once each
 *      (instrument step 8). Each should reach its own questions and then Submit.
 *
 * Settings applied: email collection off, one response per person off (tenants may have no Google
 * account), progress bar on, question order not shuffled.
 */

const OWNER = 'Property owner or administrator / May-ari o administrador ng apartment';
const TENANT = 'Tenant of the boarding house / Nangungupahan sa boarding house';
const TECH = 'Technical evaluator (IT professional, developer, or IT faculty) / Technical evaluator';

const DESCRIPTION = [
  'Thank you for helping us evaluate Hivelet, a web-based apartment management system developed for the Fe Galang Da Silva Boarding House by Group 4, BS Information Technology, Bicol University College of Science.',
  '',
  'This survey measures the quality of the system using the ISO/IEC 25010 international standard for software product quality. It takes about 5 to 10 minutes.',
  '',
  'Please answer based on your own experience of using the system. There are no right or wrong answers, and an honest low rating is more useful to us than a polite high one.',
  '',
  'Your responses are used only for this academic study. Your name is not required and individual answers are not shown to anyone outside the research team.',
  '',
  '---',
  '',
  'Salamat sa pagtulong sa amin na suriin ang Hivelet, isang web-based na sistema para sa pamamahala ng apartment na ginawa para sa Fe Galang Da Silva Boarding House ng Group 4, BS Information Technology, Bicol University College of Science.',
  '',
  'Sinusukat ng survey na ito ang kalidad ng sistema gamit ang pamantayang ISO/IEC 25010. Aabutin ito ng humigit-kumulang 5 hanggang 10 minuto.',
  '',
  'Sagutin po batay sa sarili ninyong karanasan sa paggamit ng sistema. Walang tama o maling sagot, at mas nakakatulong sa amin ang tapat na mababang marka kaysa sa magalang na mataas na marka.',
  '',
  'Ang inyong mga sagot ay gagamitin lamang para sa pag-aaral na ito. Hindi kinakailangan ang inyong pangalan at hindi ipinapakita ang indibidwal na sagot sa sinumang wala sa pangkat ng mananaliksik.',
].join('\n');

// [characteristic heading, [items]] per group. Tenant items are [English, Filipino].
const OWNER_ITEMS = [
  ['Functional Suitability', [
    'The system lets me manage tenant records, units, and the number of occupants in each unit.',
    'The system computes rent and water charges correctly, without me doing the arithmetic myself.',
    'Payments I receive in person are recorded accurately against the correct unit and month.',
    'Online payments made by tenants appear correctly for me to verify before they are settled.',
    'Maintenance requests can be submitted, followed, and closed within the system.',
    'The financial reports the system produces match the records I keep.',
  ]],
  ['Performance Efficiency', [
    'The system responds quickly when I move between screens.',
    'Financial reports are produced without a long wait.',
    'The system stays responsive even when many records are shown at once.',
  ]],
  ['Compatibility', [
    'The system works correctly in the browser I normally use.',
    'Reports exported from the system open correctly in my spreadsheet program.',
    'I can use the system at the same time as the other applications on my device.',
  ]],
  ['Usability', [
    'I can tell what each screen is for without being taught.',
    'The words and labels used match the way I actually talk about my property.',
    'Before anything is changed or deleted, the system asks me to confirm and tells me what will happen.',
    'When something goes wrong, the message tells me what to do about it.',
    'I was able to learn the system without technical help.',
  ]],
  ['Reliability', [
    'The system is available whenever I need it during the day.',
    'Records I enter are still there when I come back to them.',
    'When information cannot be loaded, the system says so instead of showing a wrong amount.',
    'After an interruption, nothing I had already recorded was lost.',
  ]],
  ['Security', [
    'Only I can reach the financial records.',
    'A tenant can see only their own information.',
    'I can see a record of the actions taken in the system and who took them.',
    'I can change my password myself when I need to.',
  ]],
  ['Portability', [
    'The system works on the devices I already own.',
    'I can install the system on my phone without going to an app store.',
    'I did not need to install any other software to use the system.',
  ]],
];
const OWNER_OPEN = [
  'What worked best for you in the system?',
  'What was difficult, confusing, or missing? Please be specific — this is the most useful answer you can give us.',
];

const TENANT_ITEMS = [
  ['Functional Suitability', [
    ['I can see my own unit details, my bill, and what I still owe.', 'Nakikita ko ang detalye ng aking unit, ang aking bill, at kung magkano pa ang dapat kong bayaran.'],
    ['I can submit a maintenance request and follow what happens to it.', 'Nakakapagpasa ako ng request para sa pagpapakumpuni at nasusubaybayan ko kung ano ang nangyayari dito.'],
    ['I can see a record of the payments I have made.', 'Nakikita ko ang talaan ng mga bayad na naibigay ko na.'],
  ]],
  ['Usability', [
    ['I can tell what each screen is for without being taught.', 'Nauunawaan ko kung para saan ang bawat screen kahit walang nagturo sa akin.'],
    ['The words used in the system are easy to understand.', 'Madaling maintindihan ang mga salitang ginamit sa sistema.'],
    ['It is clear how much I owe and what the amount is made up of.', 'Malinaw kung magkano ang dapat kong bayaran at kung paano ito nabuo.'],
    ['When something goes wrong, the message tells me what to do about it.', 'Kapag may mali, sinasabi ng mensahe kung ano ang dapat kong gawin.'],
    ['I was able to use the system without anyone explaining it to me.', 'Nagamit ko ang sistema kahit walang nagpaliwanag sa akin.'],
  ]],
  ['Performance Efficiency', [
    ['The system opens quickly.', 'Mabilis magbukas ang sistema.'],
    ['The system responds without delay when I move between screens.', 'Mabilis tumugon ang sistema kapag lumilipat ako ng screen.'],
  ]],
  ['Reliability', [
    ['The system is available whenever I try to use it.', 'Magagamit ang sistema sa tuwing kailangan ko ito.'],
    ['The information shown to me is correct and up to date.', 'Tama at napapanahon ang mga impormasyong ipinapakita sa akin.'],
    ['When something cannot be loaded, the system says so instead of showing a wrong amount.', 'Kapag may hindi mabuksan o ma-load, sinasabi ito ng sistema sa halip na magpakita ng maling halaga.'],
  ]],
  ['Compatibility', [
    ['The system works correctly in the browser I normally use.', 'Gumagana nang maayos ang sistema sa browser na karaniwan kong ginagamit.'],
    ['I can use the system at the same time as my other apps.', 'Nagagamit ko ang sistema kasabay ng iba kong mga app.'],
  ]],
  ['Portability', [
    ['The system works on my own phone or computer.', 'Gumagana ang sistema sa sarili kong cellphone o computer.'],
    ['I can open the system on more than one device.', 'Nabubuksan ko ang sistema sa higit sa isang device.'],
    ['I did not need to install anything extra to use it.', 'Hindi ako kinailangang mag-install ng kahit anong karagdagang app para magamit ito.'],
  ]],
];
const TENANT_OPEN = [
  ['What did you find most useful?', 'Ano ang pinakanakatulong sa iyo?'],
  ['What was difficult, confusing, or missing?', 'Ano ang nahirapan kang gawin, nakalito sa iyo, o kulang sa sistema?'],
];

const TECH_ITEMS = [
  ['Functional Suitability', [
    'The system provides the functions required for tenant, unit, and occupancy management.',
    'Rent and water charges are computed correctly and consistently.',
    'Payment recording and verification behave correctly for both in-person and online payments.',
    'The maintenance ticketing workflow supports submission, tracking, and closure.',
    'Generated reports agree with the records held in the database.',
  ]],
  ['Performance Efficiency', [
    'Response times are acceptable for the expected number of users and records.',
    'Report generation completes within a reasonable time.',
    'The system uses client and server resources efficiently.',
  ]],
  ['Compatibility', [
    'The system operates correctly across current mainstream browsers.',
    'Exported files conform to formats that other applications can read.',
    'The system coexists with other applications without interference.',
  ]],
  ['Usability', [
    'The interface is understandable without prior training.',
    'Terminology is consistent across the system and appropriate to the users.',
    'Destructive actions require confirmation and state their consequence.',
    'Error messages are actionable rather than technical.',
    'The interface is operable for users with limited technical background.',
  ]],
  ['Reliability', [
    'The system handles failure of a request without presenting incorrect data.',
    'Recorded data is retained reliably.',
    'The system distinguishes clearly between "no data" and "data could not be loaded".',
    'The system recovers from interruption without data loss.',
  ]],
  ['Security', [
    'Access to functions and records is correctly restricted by role.',
    'A tenant account cannot reach administrative data.',
    'Administrative actions are recorded in an auditable trail.',
    'Credentials are handled and stored appropriately.',
    'Authentication and session handling follow accepted practice.',
  ]],
  ['Maintainability', [
    'The codebase is organized so that a change can be located and made confidently.',
    'The system is documented sufficiently for another developer to maintain it.',
    'Changes to configurable values do not require code changes.',
    'Automated checks exist that would catch a regression.',
    'A change in one part of the system is unlikely to disturb unrelated parts.',
  ]],
  ['Portability', [
    'The system can be deployed to another environment without modification.',
    'The client installs on a mobile device without an application store.',
    'The system does not depend on software the target environment is unlikely to have.',
  ]],
];
const TECH_OPEN = [
  'Which aspect of the system is strongest, from a technical standpoint?',
  'Which aspect most needs improvement, and what would you change?',
];

function scale(form, title, help, low, high) {
  const item = form.addScaleItem().setTitle(title).setBounds(1, 5).setLabels(low, high).setRequired(true);
  if (help) item.setHelpText(help);
  return item;
}

function buildHiveletSurvey() {
  const form = FormApp.create('Hivelet System Evaluation — ISO/IEC 25010 Software Quality Assessment');
  form.setDescription(DESCRIPTION)
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false)
    .setProgressBar(true)
    .setShuffleQuestions(false);

  // Section 1 - About you (Table 12).
  const q1 = form.addMultipleChoiceItem()
    .setTitle('Q1. Which best describes you? / Alin ang naglalarawan sa inyo?')
    .setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle('Q2. How long have you been using or reviewing the system? / Gaano na kayo katagal gumagamit o sumusuri sa sistema?')
    .setChoiceValues(['Less than one week / Wala pang isang linggo', 'One to two weeks / Isa hanggang dalawang linggo', 'More than two weeks / Higit sa dalawang linggo'])
    .setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle('Q3. Which device did you mainly use? / Anong device ang pangunahin ninyong ginamit?')
    .setChoiceValues(['Desktop or laptop computer / Desktop o laptop', 'Mobile phone / Cellphone', 'Tablet / Tablet', 'Both computer and mobile phone / Parehong computer at cellphone'])
    .setRequired(true);

  // Section 2 - Owner.
  const pOwner = form.addPageBreakItem().setTitle('Section 2 — Owner and administrator');
  for (const [heading, items] of OWNER_ITEMS) {
    form.addSectionHeaderItem().setTitle(heading);
    for (const t of items) scale(form, t, null, 'Strongly Disagree', 'Strongly Agree');
  }
  for (const t of OWNER_OPEN) form.addParagraphTextItem().setTitle(t).setRequired(false);

  // Section 3 - Tenants (bilingual). Reaching this page break by going on from Section 2 submits.
  const pTenant = form.addPageBreakItem()
    .setTitle('Section 3 — Tenants')
    .setHelpText('5 — Lubos na Sumasang-ayon (Strongly Agree)\n4 — Sumasang-ayon (Agree)\n3 — Walang Kinikilingan (Neutral)\n2 — Hindi Sumasang-ayon (Disagree)\n1 — Lubos na Hindi Sumasang-ayon (Strongly Disagree)')
    .setGoToPage(FormApp.PageNavigationType.SUBMIT);
  for (const [heading, items] of TENANT_ITEMS) {
    form.addSectionHeaderItem().setTitle(heading);
    for (const [en, fil] of items) {
      scale(form, en, fil, 'Lubos na Hindi Sumasang-ayon (Strongly Disagree)', 'Lubos na Sumasang-ayon (Strongly Agree)');
    }
  }
  for (const [en, fil] of TENANT_OPEN) form.addParagraphTextItem().setTitle(en).setHelpText(fil).setRequired(false);

  // Section 4 - Technical evaluators. Going on from Section 3 submits.
  const pTech = form.addPageBreakItem()
    .setTitle('Section 4 — Technical evaluators')
    .setHelpText('Please review the repository and documentation before answering; maintainability cannot be judged from the screens alone.')
    .setGoToPage(FormApp.PageNavigationType.SUBMIT);
  for (const [heading, items] of TECH_ITEMS) {
    form.addSectionHeaderItem().setTitle(heading);
    for (const t of items) scale(form, t, null, 'Strongly Disagree', 'Strongly Agree');
  }
  for (const t of TECH_OPEN) form.addParagraphTextItem().setTitle(t).setRequired(false);

  // Branching on Q1, set last because it needs the page breaks to exist.
  q1.setChoices([
    q1.createChoice(OWNER, pOwner),
    q1.createChoice(TENANT, pTenant),
    q1.createChoice(TECH, pTech),
  ]);

  const counts = [OWNER_ITEMS, TENANT_ITEMS, TECH_ITEMS].map((g) => g.reduce((n, [, items]) => n + items.length, 0));
  Logger.log('Rated items - owner %s, tenants %s, technical evaluators %s (instrument: 28, 18, 33)', counts[0], counts[1], counts[2]);
  Logger.log('EDIT (keep private): %s', form.getEditUrl());
  Logger.log('SEND TO RESPONDENTS: %s', form.shortenFormUrl(form.getPublishedUrl()));
}
