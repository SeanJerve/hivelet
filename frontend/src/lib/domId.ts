/**
 * A label made safe to use inside an element id, and so inside the ID list of `aria-controls`.
 *
 * An id cannot hold a space: `aria-controls="cluster-units-Boarding House"` names two elements,
 * neither of which exists, and axe-core reports it (aria-valid-attr-value). It came in quietly
 * when "BH" began reading "Boarding House" on 2 Oct 2026, because the cluster's label was also its id.
 */
export function domId(label: string): string {
  return String(label).trim().replace(/[^A-Za-z0-9_-]+/g, '-');
}
