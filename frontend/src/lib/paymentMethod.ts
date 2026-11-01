/**
 * How a payment was made, in the words a person would use. `Adyen Online` is the ledger's name for
 * a GCash payment made through this system, and it stays the stored value; nobody reading a screen
 * should have to know it (Sean, 1 Nov 2026).
 */
export function methodInWords(method: string | null | undefined): string {
  if (!method) return 'Not recorded';
  return method === 'Adyen Online' ? 'GCash (online)' : method;
}
