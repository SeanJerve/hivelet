/**
 * @file services/auditTrailExport.ts
 * @description The audit trail as an Excel workbook. FR-029, BR-018, BR-028.
 *
 * The trail screen offered a CSV while both financial ledgers offered a real
 * workbook, so the one artifact whose entire claim is that it can be trusted
 * left the system in the weakest format of the three. A CSV of this table is
 * also the worst case for the format: `previous_values` and `new_values` are
 * JSON, full of commas, quotes and newlines, and every one of those is a chance
 * to shift a column and change what the record appears to say.
 *
 * WHAT THIS DOES NOT DO
 * ---------------------
 * It does not reshape, summarise or interpret. Every row in, every row out, in
 * the order the database returns them. An audit trail that the export has
 * reorganised is no longer the audit trail.
 *
 * It reads. It writes nothing, and it is the only report that must be able to
 * say so: `audit_logs` has UPDATE and DELETE revoked from every role including
 * the API's own (migration 002), so nothing here could alter a row even if it
 * tried to.
 */
import ExcelJS from 'exceljs';
import { db } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

const INK = 'FF1F2430';
const RULE = 'FFD8DCE3';

/** The same three the screen offers, applied by the database before the limit. */
export type AuditCategory = 'business' | 'auth' | 'all';

/**
 * Authentication events, by action prefix.
 *
 * 6,483 of the trail's rows are AUTH_ACCESS_DENIED, most of them produced by a
 * fault this application has since had fixed. They are kept - the table is
 * append-only by design - but they are not what the landlady did, so the
 * business view excludes them, exactly as the screen does.
 */
const AUTH_PREFIX = 'AUTH_';

function isoOrBlank(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString().replace('T', ' ').slice(0, 19);
}

/** JSON as text, or an empty cell. Never the string "null", which reads as a value. */
function jsonCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  try {
    return JSON.stringify(value, null, 1);
  } catch {
    return '';
  }
}

export async function buildAuditTrailWorkbook(
  category: AuditCategory,
  limit: number
): Promise<{ workbook: ExcelJS.Workbook; rowCount: number }> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 5000) {
    throw ApiError.validation('A row limit between 1 and 5000 is required.', {
      limit: ['must be between 1 and 5000'],
    });
  }

  let query = db
    .from('audit_logs')
    .select('id, created_at, action, entity_type, entity_id, ip_address, previous_values, new_values, profiles(full_name, role)')
    .order('created_at', { ascending: false })
    .limit(limit);

  // Applied by the database, before the limit. It has to be: the newest rows are
  // overwhelmingly AUTH_*, so a filter applied after the limit returns nothing.
  if (category === 'business') query = query.not('action', 'like', `${AUTH_PREFIX}%`);
  if (category === 'auth') query = query.like('action', `${AUTH_PREFIX}%`);

  const { data, error } = await query;
  if (error) throw ApiError.internal(error.message);

  const rows = data ?? [];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hivelet';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Audit trail');

  sheet.columns = [
    { header: 'When (UTC)', key: 'when', width: 21 },
    { header: 'Action', key: 'action', width: 28 },
    { header: 'Record type', key: 'entityType', width: 20 },
    { header: 'Record', key: 'entityId', width: 38 },
    { header: 'Who', key: 'who', width: 26 },
    { header: 'Their role', key: 'role', width: 14 },
    { header: 'From address', key: 'ip', width: 20 },
    { header: 'Before', key: 'before', width: 52 },
    { header: 'After', key: 'after', width: 52 },
  ];

  const head = sheet.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
  head.alignment = { vertical: 'middle' };
  head.height = 22;

  for (const r of rows) {
    // Supabase returns the joined profile as an object or an array depending on
    // the relationship it infers. Both shapes have been seen from this table.
    const profile = Array.isArray((r as any).profiles)
      ? (r as any).profiles[0]
      : (r as any).profiles;

    sheet.addRow({
      when: isoOrBlank((r as any).created_at),
      action: (r as any).action ?? '',
      entityType: (r as any).entity_type ?? '',
      entityId: (r as any).entity_id ?? '',
      who: profile?.full_name ?? 'No signed-in person',
      role: profile?.role ?? 'the system itself',
      ip: (r as any).ip_address ?? '',
      before: jsonCell((r as any).previous_values),
      after: jsonCell((r as any).new_values),
    });
  }

  sheet.eachRow((row, index) => {
    if (index === 1) return;
    row.alignment = { vertical: 'top', wrapText: true };
    row.border = { bottom: { style: 'hair', color: { argb: RULE } } };
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: 'A1', to: 'I1' };

  return { workbook, rowCount: rows.length };
}
