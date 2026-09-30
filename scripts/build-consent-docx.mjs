#!/usr/bin/env node
/**
 * Writes the testing day's informed consent form (Form 1 of TESTING_DAY_FORMS.md) as a Word file,
 * so the team can type the adviser's name and print it. One A4 page, English and Filipino.
 *
 * Run:  node scripts/build-consent-docx.mjs
 * Out:  docs/FINAL MANUSCRIPT/CONSENT_FORM.docx
 *
 * The wording is Form 1's, word for word. Change Form 1 first, then this, so the two never differ.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from 'docx';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs', 'FINAL MANUSCRIPT', 'CONSENT_FORM.docx');

const FONT = 'Arial';
const t = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size ?? 20, bold: o.bold, italics: o.italics });
const p = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], spacing: { after: o.after ?? 100, before: o.before ?? 0 }, alignment: o.align, border: o.border });
const heading = (en, fil) => p([t(en, { bold: true }), t(fil ? ` / ${fil}` : '', { bold: true, italics: true })], { before: 120, after: 60 });
const fil = (text) => p(t(text, { italics: true, size: 19 }), { after: 140 });
const box = (en, filText) => p([t('☐  ', { size: 24 }), t(en), t(` / ${filText}`, { italics: true })], { after: 80 });
const line = (label, width = 40) => [t(label), t(' ' + '_'.repeat(width))];

const doc = new Document({
  creator: 'Group 4, BS Information Technology, Bicol University College of Science',
  title: 'Informed consent - Hivelet testing day',
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, bottom: 850, left: 1000, right: 1000 } } },
    children: [
      p(t('Informed Consent / Pahintulot na may Kaalaman', { bold: true, size: 30 }), { align: AlignmentType.CENTER, after: 60 }),
      p(t('Hivelet: A Web-Based Apartment Management System for Fe Galang Da Silva Boarding House', { bold: true, size: 21 }), { align: AlignmentType.CENTER, after: 40 }),
      p(t('Group 4, BS Information Technology, Bicol University College of Science', { size: 19 }), { align: AlignmentType.CENTER, after: 40 }),
      p(line('Adviser:', 34), { align: AlignmentType.CENTER, after: 160, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '17603F', space: 6 } } }),

      heading('What this is'),
      p(t('We are testing the Hivelet system with the people who will use it: the landlady, the tenants, and people looking for a room at the Fe Galang Da Silva Boarding House. You will watch a short video about Hivelet, then use the system (on your own phone where possible) for about 10 to 30 minutes, or longer for the landlady, while a member of our team watches and takes notes. Then you answer a short anonymous survey. We are testing the system, not you.')),
      fil('Sinusubukan namin ang sistemang Hivelet kasama ang mga gagamit nito: ang landlady, ang mga nangungupahan, at ang mga naghahanap ng kwarto. Manonood kayo ng maikling video tungkol sa Hivelet, at gagamitin ninyo ang sistema (sa sarili ninyong cellphone kung maaari) nang mga 10 hanggang 30 minuto habang nagmamasid at nagsusulat ang isang miyembro ng aming grupo. Pagkatapos ay sasagot kayo ng maikling survey na walang pangalan. Ang sistema ang sinusubukan namin, hindi kayo.'),

      heading('What we record'),
      p(t('Notes on what you do, what you say, and how long it takes; with your permission, a recording of your screen and photos of the session. In our notes you are a code (for example T2), never your name. Your survey answers are anonymous.')),

      heading('Your privacy (Data Privacy Act of 2012, RA 10173)'),
      p(t('Tenants use their own account, which shows only their own unit, bills, payments and requests. People looking for a room use only the public website and need no account; an inquiry you send reaches the landlady like any real inquiry. Anything we use in our paper has names, numbers, emails and amounts hidden. Recordings and notes are kept by the research team only and deleted after the defense. Taking part is voluntary. You may stop at any time, and it has no effect at all on your tenancy or on any future application for a room.')),
      fil('Kusang-loob po ang paglahok. Maaari kayong tumigil anumang oras, at wala itong epekto sa inyong pag-upa o sa anumang pag-aaplay ninyo ng kwarto.'),

      heading('Please tick', 'Pakitsek'),
      box('I agree to take part in the test.', 'Pumapayag akong lumahok.'),
      box('I agree to my phone screen being recorded.', 'Pumapayag akong i-record ang screen ng aking cellphone.'),
      box('I agree to photos of the session being taken.', 'Pumapayag akong kunan ng litrato ang session.'),
      box('My face may appear in the paper.', 'Maaaring makita ang aking mukha sa papel.'),
      p(t('(If not ticked, faces are blurred or cropped.)', { italics: true, size: 18 }), { after: 160 }),

      p([t('I am / '), t('Ako ay', { italics: true }), t(':   ☐ the landlady / '), t('ang landlady', { italics: true }), t('    ☐ a tenant / '), t('nangungupahan', { italics: true }), t('    ☐ looking for a room / '), t('naghahanap ng kwarto', { italics: true })], { after: 260 }),
      p([...line('Name / Pangalan:', 34), t('   '), ...line('Unit (tenants only):', 8)], { after: 260 }),
      p([...line('Signature / Lagda:', 34), t('   Date: ____ September 2026')], { after: 260 }),
      p(line('Research team member present:', 32), { after: 0 }),
    ],
  }],
});

fs.writeFileSync(out, await Packer.toBuffer(doc));
console.log(`written: ${path.relative(root, out).split(path.sep).join('/')}`);
