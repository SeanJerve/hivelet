/**
 * @file services/expenseCategories.ts
 * @description The kinds of expense: the thirteen built in, and the ones the
 * owner adds herself.
 *
 * THE DECISION (owner, 2026-10-12, relayed by the coordinator, answering "Expense
 * categories: keep the 13 fixed, or should she be able to add her own?"):
 * "Keep the 13, but she should also have the ability to add her own."
 *
 * So the thirteen rows of `fixed_expense_categories` stay exactly as they are -
 * her own numbered chart (1-10, with 6a PhilHealth, 6b SSS and 6c Allowances
 * under 6 Salaries) - and nothing here renames or removes them. A kind she adds
 * is a fourteenth row and later, after the thirteen in `display_order`, with the
 * next number after the highest numeric code ("11", "12", ...), so it reads like
 * her own numbering in the ledger, the filter and the workbook's category
 * summary, which all list the table in `display_order`.
 *
 * The table, from the catalogue snapshot (`database/live_schema.csv`; the table
 * was created outside the migrations folder, so no migration describes it):
 * `code varchar(20)` PRIMARY KEY, `name varchar(255)` NOT NULL, `display_order
 * integer` NOT NULL with no default, `parent_code varchar(20)` NULL, a self
 * foreign key. No CHECK, no trigger, no unique index on `name`. Nothing there
 * stops an insert, so no migration is needed; the rules a database would
 * normally hold (unique name, bounded length) are held here instead.
 *
 * Kept out of the route so the rules can be driven with a fake database
 * (`backend/scripts/check-expense-kinds.mjs`) and nothing live is touched.
 */
import { ApiError } from '../utils/ApiError.js';

/**
 * Her thirteen, by code (the live table's rows, read from the anonymised fixture
 * of `/admin/expense-categories` taken from the live database). Built in: never
 * renamed or removed from here (owner, 2026-10-12: "keep the 13").
 */
export const BUILT_IN_CATEGORY_CODES: readonly string[] = [
  '1', '2', '3', '4', '5', '6', '6a', '6b', '6c', '7', '8', '9', '10',
];

/** 2 to 60 (owner's request, 2026-10-12): one letter is a slip, and sixty fits a phone's picker. */
export const KIND_NAME_MIN = 2;
export const KIND_NAME_MAX = 60;

export interface CategoryRow {
  code: string;
  name: string;
  parent_code: string | null;
  display_order: number;
}

/**
 * The name as it will be stored: trimmed, inner runs of spaces (or a pasted tab
 * or line break) made one space. Refused, with the reason in words, when it is
 * missing, too short, too long or carries a control character.
 */
export function cleanKindName(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw ApiError.validation('Name: enter a name for the new kind of expense.', { name: ['required'] });
  }
  const name = raw.replace(/\s+/g, ' ').trim();
  if (name.length === 0) {
    throw ApiError.validation('Name: enter a name for the new kind of expense.', { name: ['required'] });
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(name)) {
    throw ApiError.validation('Name: use letters, numbers and punctuation only.', { name: ['control character'] });
  }
  if (name.length < KIND_NAME_MIN) {
    throw ApiError.validation(`Name: use at least ${KIND_NAME_MIN} characters.`, { name: ['too short'] });
  }
  if (name.length > KIND_NAME_MAX) {
    throw ApiError.validation(`Name: keep it to ${KIND_NAME_MAX} characters or fewer.`, { name: ['too long'] });
  }
  return name;
}

/** Same name, ignoring case and spacing: "fuel  and OIL" is "Fuel and Oil". */
export function sameKindName(a: string, b: string): boolean {
  const key = (s: string) => s.replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');
  return key(a) === key(b);
}

/**
 * Where the new kind goes: the next number after the highest numeric code (her
 * codes are 1-10 with lettered sub-lines, so "11" first), and after every
 * existing row in `display_order`. Never below 11, so a built-in number cannot
 * be handed out even if a row were missing from what was read.
 */
export function nextCategorySlot(rows: readonly Pick<CategoryRow, 'code' | 'display_order'>[]): {
  code: string;
  display_order: number;
} {
  const numbers = rows.map((r) => String(r.code)).filter((c) => /^\d+$/.test(c)).map(Number);
  const code = String(Math.max(10, ...numbers) + 1);
  const display_order = Math.max(BUILT_IN_CATEGORY_CODES.length, ...rows.map((r) => Number(r.display_order) || 0)) + 1;
  return { code, display_order };
}

/** The part of the supabase-js client this needs, so a fake can stand in. */
interface CategoryDb {
  from(table: 'fixed_expense_categories'): any;
}

/**
 * Adds one kind of expense and returns the stored row.
 *
 * Two requests racing for the same number lose to the primary key on `code`
 * (23505) and the loser is told to try again; nothing half-written is left,
 * because the insert is one statement. Two racing with the same NAME would both
 * pass the check above - there is no unique index on `name` - which needs two
 * people adding the same kind in the same second on an account only the owner
 * holds; the duplicate would be harmless and visible in the list.
 */
export async function addExpenseCategory(client: CategoryDb, rawName: unknown): Promise<CategoryRow> {
  const name = cleanKindName(rawName);

  const { data: rows, error: readError } = await client
    .from('fixed_expense_categories')
    .select('code, name, parent_code, display_order');
  if (readError) throw ApiError.internal(`The kinds of expense could not be read: ${readError.message}`);

  const existing = (rows ?? []) as CategoryRow[];
  const clash = existing.find((r) => sameKindName(String(r.name), name));
  if (clash) {
    throw ApiError.conflict(`"${clash.name}" is already a kind of expense (${clash.code}). Choose it from the list.`);
  }

  const slot = nextCategorySlot(existing);
  const { data: created, error: insertError } = await client
    .from('fixed_expense_categories')
    .insert({ code: slot.code, name, parent_code: null, display_order: slot.display_order })
    .select('code, name, parent_code, display_order')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      throw ApiError.conflict('Another kind of expense was added at the same moment. Nothing was saved: try again.');
    }
    throw ApiError.internal(`The new kind of expense was not saved: ${insertError.message}`);
  }
  if (!created) throw ApiError.internal('The new kind of expense was not saved and nothing was written.');
  return created as CategoryRow;
}
