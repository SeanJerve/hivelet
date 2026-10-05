/**
 * @file lib/photoFile.ts
 * @description The one rule for a photo someone picks: JPG or PNG only.
 *
 * Technical evaluators, 3 Oct 2026: "image validation format, JPG or PNG
 * only". The file picker offers only those two (`PHOTO_ACCEPT`), and the page
 * checks the chosen file again, because a picker's filter is a suggestion: on
 * a phone "Browse" or "All files" still lets anything through. The server
 * refuses anything else too (`unitPhoto` in routes/admin.ts, the ticket
 * attachment rule in routes/tenant.ts).
 *
 * An iPhone photo is HEIC on the phone, but Safari hands a page a JPEG copy
 * when the picker asks for JPEG, so iPhone users are not turned away.
 */
export const PHOTO_ACCEPT = 'image/jpeg,image/png,.jpg,.jpeg,.png';

export const PHOTO_FORMAT_MESSAGE = 'Choose a photo in JPG or PNG format.';

/** True for a JPG or PNG. A file with no type (some phones) is judged by its name. */
export function isJpgOrPng(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  if (type === 'image/jpeg' || type === 'image/jpg' || type === 'image/png') return true;
  return !type && /\.(jpe?g|png)$/i.test(file.name);
}
