/**
 * @file config/rbac.ts
 * @description Single source of truth for Hivelet's role/permission matrix.
 * @systemBibleRef Section 4 (Users), Section 20 (Security)
 * @businessRules  BR-024 Tenant Privacy, BR-023 Ticket Closure,
 *                 BR-048 Admin-Only Authorship of Income/Expense Ledgers
 * @requirements   FR-002 Role-Based Access
 *
 * The capstone defines exactly three classes of user (System Bible Section 4),
 * and Section 3 explicitly excludes "complex staff permission systems" — so
 * there is no caretaker or staff tier. `prospect` is not a fourth privilege
 * level: it is the stored identity of a public visitor who submitted an
 * inquiry, and it carries guest-level rights only.
 *
 * Every route authorizes against a PERMISSION, never against a role name
 * directly. That keeps the "who may do what" decision in this one file instead
 * of scattered across controllers.
 */

/** Roles as persisted in `profiles.role`, plus the unauthenticated caller. */
export type Role = 'guest' | 'prospect' | 'tenant' | 'admin';

/** Roles that can exist in the database (`public.user_role_type`). */
export type StoredRole = Extract<Role, 'prospect' | 'tenant' | 'admin'>;

export const ROLES = {
  GUEST: 'guest',
  PROSPECT: 'prospect',
  TENANT: 'tenant',
  ADMIN: 'admin',
} as const;

/**
 * Permissions are `domain:action`. `:own` suffixes mark permissions that are
 * additionally row-scoped at query time — holding `bill:read:own` never means
 * "read all bills", it means "read bills the caller is the tenant of".
 */
export const PERMISSIONS = {
  // ---- Public property information (System Bible Section 4, FR-003) --------
  PROPERTY_VIEW_PUBLIC: 'property:view:public',
  ROOM_VIEW_PUBLIC: 'room:view:public',

  // ---- Inquiries (FR-004, FR-005, BR-006) ---------------------------------
  INQUIRY_CREATE: 'inquiry:create',
  INQUIRY_READ_ALL: 'inquiry:read:all',
  INQUIRY_MANAGE: 'inquiry:manage',
  INQUIRY_CONVERT: 'inquiry:convert',

  // ---- Rooms (FR-007, FR-008) ---------------------------------------------
  ROOM_READ_ALL: 'room:read:all',
  ROOM_READ_OWN: 'room:read:own',
  ROOM_MANAGE: 'room:manage',

  // ---- Tenants & profiles (FR-009, FR-010, BR-024) ------------------------
  TENANT_READ_ALL: 'tenant:read:all',
  TENANT_MANAGE: 'tenant:manage',
  PROFILE_READ_OWN: 'profile:read:own',
  PROFILE_UPDATE_OWN: 'profile:update:own',

  // ---- Billing & payments (FR-011..FR-017, BR-048) ------------------------
  BILL_READ_ALL: 'bill:read:all',
  BILL_READ_OWN: 'bill:read:own',
  BILL_MANAGE: 'bill:manage',
  PAYMENT_READ_ALL: 'payment:read:all',
  PAYMENT_READ_OWN: 'payment:read:own',
  PAYMENT_RECORD: 'payment:record',
  PAYMENT_VERIFY: 'payment:verify',
  PAYMENT_CORRECT: 'payment:correct',

  // ---- Financial ledgers & analytics (BR-048, FR-043) ---------------------
  INCOME_LEDGER_READ: 'income:read',
  INCOME_LEDGER_WRITE: 'income:write',
  EXPENSE_LEDGER_READ: 'expense:read',
  EXPENSE_LEDGER_WRITE: 'expense:write',
  ANALYTICS_VIEW: 'analytics:view',
  REPORT_EXPORT: 'report:export',

  // ---- Maintenance tickets (FR-021..FR-025, BR-023) -----------------------
  TICKET_CREATE_OWN: 'ticket:create:own',
  TICKET_READ_ALL: 'ticket:read:all',
  TICKET_READ_OWN: 'ticket:read:own',
  TICKET_COMMENT: 'ticket:comment',
  TICKET_MANAGE: 'ticket:manage',
  TICKET_CLOSE: 'ticket:close',

  // ---- Notifications & audit (FR-027, FR-029) -----------------------------
  NOTIFICATION_READ_OWN: 'notification:read:own',
  AUDIT_READ: 'audit:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const P = PERMISSIONS;

/**
 * What an unauthenticated visitor may do.
 *
 * System Bible Section 4 — the public visitor "cannot access private tenant
 * information / administrative records" and "cannot directly reserve or
 * transact a room online". Read published property data and submit an inquiry;
 * nothing else.
 */
const GUEST_PERMISSIONS: readonly Permission[] = [
  P.PROPERTY_VIEW_PUBLIC,
  P.ROOM_VIEW_PUBLIC,
  P.INQUIRY_CREATE,
];

/**
 * What an active tenant may do.
 *
 * System Bible Section 4 — a tenant may view their own room/account/billing,
 * submit tickets with photos, communicate with the administrator, and update
 * permitted personal information.
 *
 * Deliberately absent, because the paper forbids them:
 *   - any `*:read:all` permission        (BR-024, cannot see other tenants)
 *   - INCOME/EXPENSE ledger permissions  (BR-048, admin-only authorship)
 *   - PAYMENT_RECORD / PAYMENT_VERIFY    (cannot modify official financial records)
 *   - TICKET_CLOSE                       (BR-023, admin has final authority)
 *   - AUDIT_READ                         (Section 20, administrator-only)
 */
const TENANT_PERMISSIONS: readonly Permission[] = [
  ...GUEST_PERMISSIONS,
  P.PROFILE_READ_OWN,
  P.PROFILE_UPDATE_OWN,
  P.ROOM_READ_OWN,
  P.BILL_READ_OWN,
  P.PAYMENT_READ_OWN,
  P.TICKET_CREATE_OWN,
  P.TICKET_READ_OWN,
  P.TICKET_COMMENT,
  P.NOTIFICATION_READ_OWN,
];

/**
 * The administrator holds every permission.
 *
 * System Bible Section 4: "The system has one administrator role according to
 * the capstone scope."
 */
const ADMIN_PERMISSIONS: readonly Permission[] = Object.values(P);

/**
 * A prospect is a public visitor whose details were captured by an inquiry.
 * They hold guest rights only — the profile row exists for inquiry linkage and
 * later tenant conversion (BR-009), not to grant account access.
 */
const PROSPECT_PERMISSIONS: readonly Permission[] = GUEST_PERMISSIONS;

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  guest: GUEST_PERMISSIONS,
  prospect: PROSPECT_PERMISSIONS,
  tenant: TENANT_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
};

/** Pre-built lookup sets — permission checks run on every request. */
const PERMISSION_SETS: Record<Role, ReadonlySet<Permission>> = {
  guest: new Set(GUEST_PERMISSIONS),
  prospect: new Set(PROSPECT_PERMISSIONS),
  tenant: new Set(TENANT_PERMISSIONS),
  admin: new Set(ADMIN_PERMISSIONS),
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return PERMISSION_SETS[role]?.has(permission) ?? false;
}

export function permissionsForRole(role: Role): Permission[] {
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}

/**
 * True when the role may only ever see its own rows for this domain. Used by
 * controllers to decide whether to apply a tenant scope filter.
 */
export function isSelfScopedRole(role: Role): boolean {
  return role === 'tenant' || role === 'prospect' || role === 'guest';
}
