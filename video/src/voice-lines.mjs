// The only words the voice says. Captions carry everything else.
// Each line is a fact from the build prompt's verified list.

export const LINES = [
  { id: 'v1', text: 'One owner runs thirty-three units near Bicol University.' },
  { id: 'v2', text: 'Her records lived in a spreadsheet, a receipt book, and a chat thread.' },
  { id: 'v3', text: 'Hivelet puts it all in one place.' },
  { id: 'v4', text: 'Cash still comes first, and every payment is checked before it is saved.' },
  { id: 'v5', text: 'Tenants see their own bill, and report repairs from their phone.' },
  { id: 'v6', text: 'Her real records, checked by twenty automated test suites.' },
];

// rosa is used; ava is kept as a ready alternative (set VOICE in src/timeline.ts).
export const VOICES = [
  { id: 'rosa', name: 'en-PH-RosaNeural', rate: '-4%' },
  { id: 'ava', name: 'en-US-AvaMultilingualNeural', rate: '-4%' },
];
