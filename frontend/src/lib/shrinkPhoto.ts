/**
 * Shrinks a phone photo in the browser until it fits the request body.
 *
 * WHY: a repair photo travels as a base64 data URI inside the JSON body, and the
 * server accepts 1 MB of body (`express.json({ limit: '1mb' })`). That leaves
 * about 700 KB of image, and a phone photo is typically 2 to 5 MB - so until
 * 2026-09-29 the repair form refused most real photos with "That photo is 3.4
 * MB", and the tenant was told to send it some other way. Found preparing the
 * first test with real tenants, where "add a photo of it" is one of the tasks.
 *
 * A repair photo needs to show a leak or a broken hinge, not print on a
 * billboard: 1600 px on the long side as JPEG is plenty, and usually lands at
 * 150 to 450 KB. If it is still too big, the long side and the quality step
 * down together until it fits.
 *
 * Returns null when the browser cannot decode the file (for example an iPhone
 * HEIC opened in a desktop browser); the caller then falls back to the original
 * file and its own size check. Never throws.
 */

/** Largest data-URI length that still fits the 1 MB body with the ticket's own fields. */
export const MAX_DATA_URL_CHARS = 900_000;

export interface ShrunkPhoto {
  dataUrl: string;
  type: 'image/jpeg';
  width: number;
  height: number;
}

function loadImage(file: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export async function shrinkPhoto(file: File): Promise<ShrunkPhoto | null> {
  if (!file.type.startsWith('image/')) return null;
  const img = await loadImage(file);
  if (!img || !img.naturalWidth || !img.naturalHeight) return null;

  let longSide = 1600;
  let quality = 0.82;
  for (let attempt = 0; attempt < 8; attempt++) {
    const scale = Math.min(1, longSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // A transparent PNG would turn black as JPEG; paint white under it.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= MAX_DATA_URL_CHARS) {
      return { dataUrl, type: 'image/jpeg', width, height };
    }
    longSide = Math.round(longSide * 0.8);
    quality = Math.max(0.5, quality - 0.06);
  }
  return null;
}
