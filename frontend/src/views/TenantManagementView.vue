<script setup lang="ts">
import WsModal from '@/components/ui/WsModal.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { tenants, fetchTenants as fetchTenantsState, fetchRooms, rooms, roomsFetchFailed, roomsLoaded, tenantsFetchFailed, showToast, asListedUnitCode, waterChargeFor, type TenantRecord } from '@/lib/systemState';
import { peso, CLUSTERS, type Cluster } from '@/lib/canonicalUnits';
import { propertyToday } from '@/lib/propertyDate';
import { api } from '@/lib/api';
import { Search, UserPlus, Pencil, LogOut, Loader2, Check, Copy, ChevronDown, LayoutGrid, Table as TableIcon } from 'lucide-vue-next';
import SkeletonTable from '@/components/ui/SkeletonTable.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';
import RecordTable from '@/components/ui/RecordTable.vue';
import ShowMore from '@/components/ui/ShowMore.vue';
import StatusPill from '@/components/overview/StatusPill.vue';
import PillSelect from '@/components/ui/PillSelect.vue';

const route = useRoute();
const router = useRouter();
const q = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);
const editModalTenant = ref<TenantRecord | null>(null);
const vacateModalTenant = ref<TenantRecord | null>(null);
const isOnboardModalOpen = ref(false);

/**
 * The one place the plaintext temporary password from B-53's onboarding
 * fix is ever shown - see generateTemporaryPassword.ts and admin.ts's own
 * comment on the response. It rides through here only in memory, never
 * written to a ref that survives navigation, and the modal that reads it
 * is not dismissible by accident (Escape/backdrop) so an admin cannot lose
 * it to a stray keypress before it is copied or written down.
 */
const onboardedCredentials = ref<{ name: string; password: string } | null>(null);
const justCopiedPassword = ref(false);

async function copyTemporaryPassword() {
  if (!onboardedCredentials.value) return;
  try {
    await navigator.clipboard.writeText(onboardedCredentials.value.password);
    justCopiedPassword.value = true;
    setTimeout(() => {
      justCopiedPassword.value = false;
    }, 2000);
  } catch {
    // Clipboard access can be refused (permissions, insecure context). The
    // password is still on screen in full either way, so nothing is lost -
    // just tell her to copy it by hand instead of failing silently.
    showToast('info', 'Could not copy automatically', 'Select the password above and copy it by hand.');
  }
}

function closeCredentialsReveal() {
  onboardedCredentials.value = null;
  justCopiedPassword.value = false;
}

// Onboard Form
/**
 * ONE PLACE THAT SAYS WHAT AN EMPTY FORM IS.
 *
 * The reset after a successful onboarding cleared five of the eleven fields
 * below. The other six kept the last resident's values, and two of them are
 * `newEmergName` and `newEmergPhone` - both optional inputs, so nothing made
 * her retype them. Onboard two residents back to back and the second had the
 * FIRST one's next-of-kin name and phone number written onto their profile,
 * along with the first unit's advance rent and move-in date. One resident's
 * emergency contact filed against another is BR-024, not untidiness.
 *
 * Six more lines in the reset would have fixed today's version and left the
 * next field to be forgotten the same way, so the list lives here instead and
 * `resetOnboardForm()` spreads it. A field added above cannot be left out of
 * the reset below, because there is no list down there to leave it out of.
 *
 * The dates were hardcoded to `2026-08-21`, which was a month in the past by
 * the time this was read. BR-033 derives every future rent period from
 * `anniversary_date`, so an onboarding where she does not touch the date - and
 * nothing makes her - sets a tenancy's whole billing cycle to a day picked
 * when the form was written. `propertyToday()` is Manila's today, which is the
 * only calendar this property has.
 */
const onboardDefaults = () => ({
  name: '',
  email: '',
  phone: '',
  // No unit until she picks one. This opened on '1a', which is occupied, so the
  // form's first suggestion was a unit the submit then refused (B-61).
  unit: '',
  moveIn: propertyToday(),
  anniv: propertyToday(),
  // BR-039: the advance rent equals the rent in effect at move-in. It is pre-filled
  // from the unit's LIVE price the moment a unit is chosen (see the watcher below),
  // so the administrator sees and confirms the figure rather than the API
  // substituting one. It started at a flat 9,000, which belonged to no unit, and
  // then at 0, which the form showed as ₱0. Empty until there is a real figure,
  // and the input's `required` makes her enter one.
  deposit: '' as number | '',
  hasRoommates: 'no' as 'no' | 'yes',
  roommateQty: 1,
  emergName: '',
  emergPhone: '',
});

const d0 = onboardDefaults();
const newName = ref(d0.name);
const newEmail = ref(d0.email);
const newPhone = ref(d0.phone);
const newUnit = ref(d0.unit);
const newMoveIn = ref(d0.moveIn);
const newAnniv = ref(d0.anniv);
const newDeposit = ref(d0.deposit);
const newHasRoommates = ref<'no' | 'yes'>(d0.hasRoommates);
const newRoommateQty = ref<number>(d0.roommateQty);
const newEmergName = ref(d0.emergName);
const newEmergPhone = ref(d0.emergPhone);

/** Every field the onboarding form owns, back to an empty form. */
function resetOnboardForm() {
  const d = onboardDefaults();
  newName.value = d.name;
  newEmail.value = d.email;
  newPhone.value = d.phone;
  newUnit.value = d.unit;
  newMoveIn.value = d.moveIn;
  newAnniv.value = d.anniv;
  newDeposit.value = d.deposit;
  newHasRoommates.value = d.hasRoommates;
  newRoommateQty.value = d.roommateQty;
  newEmergName.value = d.emergName;
  newEmergPhone.value = d.emergPhone;
}

// Edit Tenant Assignment Form
const editUnitCode = ref('');
const editStatus = ref<'active' | 'vacated'>('active');
const editHasRoommates = ref<'no' | 'yes'>('no');
const editRoommateQty = ref<number>(0);

const editUnitOptions = computed(() => {
  const opts: { value: string; label: string }[] = [];
  if (editUnitCode.value === '—') {
    opts.push({ value: '—', label: 'No unit assigned' });
  }
  rooms.forEach((u) => {
    const priceStr = !roomsFetchFailed.value ? ` (${peso(u.price)})` : '';
    opts.push({
      value: u.unitCode.toUpperCase(),
      label: `${u.unitCode.toUpperCase()} — ${u.cluster}${priceStr}`,
    });
  });
  return opts;
});

const editStatusOptions = [
  { value: 'active', label: 'Living here' },
  { value: 'vacated', label: 'Moved out' },
];

const sharingOptions = [
  { value: 'no', label: 'Lives alone' },
  { value: 'yes', label: 'With roommates' },
];

/** Units with an active resident say so, because `handleOnboard` will refuse them. */
const occupiedUnitCodes = computed(
  () => new Set(tenants.filter((t) => t.status === 'active').map((t) => t.unitCode.toUpperCase()))
);

const newUnitOptions = computed(() =>
  rooms.map((u) => {
    const priceStr = !roomsFetchFailed.value ? ` — ${peso(u.price)}` : '';
    const taken = occupiedUnitCodes.value.has(u.unitCode.toUpperCase()) ? ' · occupied' : '';
    return {
      value: u.unitCode,
      label: `${u.unitCode.toUpperCase()}${priceStr} (${u.cluster})${taken}`,
    };
  })
);

const newSharingOptions = [
  { value: 'no', label: 'Living alone' },
  { value: 'yes', label: 'With roommates' },
];

/**
 * NOTE: a `checkAnnualEscalation()` helper used to live here, recommending a 2%
 * annual rent increase after 12 months of tenure. It has been removed.
 *
 * There is no 2% rule. It appears in no business rule and in neither Bible
 * document, and the owner confirmed on 2026-09-13 that she simply sets the rate
 * herself when she decides to change it. Errata E-18 and E-20 withdraw the
 * feature in full. Rate changes are recorded in `room_price_history` with the
 * administrator who made them and an effective date (ARCH-004) - the history is
 * kept, the automation never existed.
 */

/**
 * Pre-fills the advance rent from the selected unit's current price. BR-039.
 *
 * Reads the LIVE room list rather than the hardcoded CANONICAL_UNITS table, whose
 * `basePrice` is a second copy that drifts as soon as the landlady changes a rate.
 * The administrator can still overwrite it - this fills the field, it does not
 * decide the amount.
 *
 * "The live room list" is only true once it has loaded. Until then `rooms` is the
 * `CANONICAL_UNITS` seed, at rates written before migration 045 - and converting
 * an enquiry runs on mount, before the fetch answers, so it filled the deposit
 * from those (B-61). With no live rate the field is left empty for her to enter,
 * and `watch(rooms)` below fills it when the list arrives.
 */
function syncDepositToUnit() {
  const live = roomsLoaded.value && !roomsFetchFailed.value
    ? rooms.find((r) => r.unitCode.toLowerCase() === newUnit.value.toLowerCase())
    : undefined;
  newDeposit.value = live && Number(live.price) > 0 ? Number(live.price) : '';
}

/**
 * The occupant count implied by the sharing toggle, and the water it bills at
 * the CONFIGURED rate. BR-014 / BR-040.
 *
 * Both forms stated this as a hardcoded `* 200`, the same defect
 * IncomeCollectionsView and AdminOverviewView were each fixed for on this
 * screen's own neighbours: the figure quoted here would go stale the moment
 * the owner changes the rate in settings, and it was never right for the two
 * Linda units, which are not billed per occupant at all. `waterChargeFor` is
 * the one place that computation lives, and `fetchRooms()` - already called
 * by this screen on mount - loads the live rate before it is needed here.
 */
const editOccupantsPreview = computed(() =>
  editHasRoommates.value === 'yes' ? 1 + (Number(editRoommateQty.value) || 1) : 1
);
const editWaterPreview = computed(() => {
  const room = rooms.find((r) => r.unitCode.toUpperCase() === editUnitCode.value.toUpperCase());
  return waterChargeFor(editUnitCode.value, editOccupantsPreview.value, room?.waterRateType === 'linda_fixed');
});

const newOccupantsPreview = computed(() =>
  newHasRoommates.value === 'yes' ? 1 + (Number(newRoommateQty.value) || 1) : 1
);
const newWaterPreview = computed(() => {
  const room = rooms.find((r) => r.unitCode.toLowerCase() === newUnit.value.toLowerCase());
  return waterChargeFor(newUnit.value, newOccupantsPreview.value, room?.waterRateType === 'linda_fixed');
});

function checkInquiryConversion() {
  if (route.query.convertInquiryId) {
    newName.value = String(route.query.name || '');
    newPhone.value = String(route.query.phone || '');
    newEmail.value = String(route.query.email || '');
    if (route.query.unit) {
      // Was `.toLowerCase()`, which guaranteed a mismatch: the options below are
      // `u.unitCode` and the live list is uppercase, so converting an enquiry for
      // PH selected nothing at all - while `syncDepositToUnit()` on the next line
      // still found the unit case-insensitively and filled in its advance rent.
      // An advance rent for a unit the dropdown was not showing.
      newUnit.value = asListedUnitCode(String(route.query.unit));
    }
    syncDepositToUnit();
    isOnboardModalOpen.value = true;
    showToast('info', 'Inquiry Pre-filled', `Details loaded from prospect inquiry for ${newName.value}.`);
  }
}

/**
 * The skeleton is for a list that has never arrived, not for one being refreshed.
 * Every save calls `fetchTenants()`, and swapping the register for a skeleton each
 * time unmounted the rows under her: focus fell to the page and the scroll jumped
 * back up (B-61). A refresh now leaves the rows where they are until the new ones land.
 * Starts true if `tenants` already holds a list from an earlier visit.
 */
const hasLoadedOnce = ref(tenants.length > 0);
const showSkeleton = computed(() => isLoading.value && !hasLoadedOnce.value);

async function fetchTenants() {
  isLoading.value = true;
  try {
    await fetchTenantsState();
    await fetchRooms();
  } catch (err) {
    console.error('fetchTenants failed:', err);
  } finally {
    isLoading.value = false;
    // Not after a failure: "Try again" would otherwise show the empty register's
    // "Nobody matches" while it retried, instead of a skeleton.
    if (!tenantsFetchFailed.value) hasLoadedOnce.value = true;
  }
}

onMounted(() => {
  fetchTenants();
  checkInquiryConversion();
});

watch(newUnit, syncDepositToUnit);

/**
 * Re-case the onboarding form's unit whenever the room list is replaced.
 *
 * `newUnit` opens on a literal, and `fetchRooms()` swaps the seed's lowercase
 * codes for uppercase ones underneath it, so the literal is wrong in whichever
 * case it is written. Reconciled against the list instead of corrected in
 * place - see `asListedUnitCode`.
 */
watch(rooms, () => {
  newUnit.value = asListedUnitCode(newUnit.value);
  // The live rates have arrived for a unit already chosen (an enquiry converted on
  // mount). Only into an empty field: every save refetches the rooms, and a figure
  // she typed must not be replaced by the list refreshing under her.
  if (newUnit.value && newDeposit.value === '') syncDepositToUnit();
}, { immediate: true });

watch(() => route.query.convertInquiryId, () => {
  checkInquiryConversion();
});

type StatusFilter = 'all' | 'active' | 'vacated' | 'prospect';

const statusFilter = ref<StatusFilter>('all');

/**
 * The ways of looking at the list, each carrying its own count. Prospects only
 * appear as a choice when there is at least one, because a chip reading zero is
 * a question nobody asked.
 */
const filterChips = computed<{ key: StatusFilter; label: string; count: number }[]>(() => [
  { key: 'all', label: 'Everyone', count: tenants.length },
  { key: 'active', label: 'Living here', count: activeCount.value },
  { key: 'vacated', label: 'Moved out', count: vacatedCount.value },
  ...(prospectCount.value
    ? [{ key: 'prospect' as const, label: 'Prospects', count: prospectCount.value }]
    : []),
]);

/**
 * A prospect is not a resident, and this page used to say she was.
 *
 * `/admin/tenants` returns `.in('role', ['tenant', 'prospect'])` on purpose, so an enquirer
 * promoted to a profile shows up here before any unit is assigned. Nothing distinguished
 * them: the header read "44 residents currently on record" when 43 are residents and one is
 * a prospect, the Active chip counted her among the residents paying rent, and her row wore
 * the same green Active badge. With 33 units on the property, a headcount that is quietly
 * one too high is the kind of number someone checks.
 */
const residentCount = computed(() => tenants.filter(t => t.role === 'tenant').length);
const prospectCount = computed(() => tenants.filter(t => t.role === 'prospect').length);

const activeCount = computed(
  () => tenants.filter(t => t.role === 'tenant' && t.status === 'active').length
);
const vacatedCount = computed(
  () => tenants.filter(t => t.role === 'tenant' && (t.status === 'vacated' || t.status === 'notice')).length
);

const rows = computed(() => {
  const query = q.value.toLowerCase().trim();
  return tenants.filter((t) => {
    // Every chip but "All" is about residents, so a prospect answers only her own.
    const matchesFilter =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'prospect' && t.role === 'prospect') ||
      (statusFilter.value === 'active' && t.role === 'tenant' && t.status === 'active') ||
      (statusFilter.value === 'vacated' && t.role === 'tenant' && (t.status === 'vacated' || t.status === 'notice'));

    if (!matchesFilter) return false;

    return (
      !query ||
      t.name.toLowerCase().includes(query) ||
      t.unitCode.toLowerCase().includes(query) ||
      t.phone.includes(query) ||
      t.email.toLowerCase().includes(query)
    );
  });
});

/** How to look at the same rows: flat and alphabetical, or split by cluster. */
type ViewMode = 'list' | 'grouped';
const viewMode = ref<ViewMode>('grouped');

/**
 * `unitCode` on a resident is the only thread to a cluster - `TenantRecord`
 * carries no cluster of its own. `rooms` is keyed by unit and is already the
 * live source every other screen reads a unit's cluster from, so this is a
 * lookup, not a guess. Matched case-insensitively, the same way
 * `asListedUnitCode` does it a few lines up: 22 of the 33 live unit codes
 * are lowercase and residents are not typed consistently against them.
 */
const clusterByUnitCode = computed(() => {
  const map = new Map<string, Cluster>();
  for (const r of rooms) map.set(r.unitCode.toUpperCase(), r.cluster);
  return map;
});

/**
 * `rows`, split by cluster in the same order the rest of the property reads
 * in (`CLUSTERS`), with a resident holding no unit yet - a prospect, always -
 * in a group of its own rather than silently dropped. Empty clusters are
 * left out rather than drawn as a heading over nothing.
 */
/**
 * Which cluster sections are open. Same shape as the room directory and the
 * income register, so the three screens that group by cluster all behave the
 * same way - this one rendered every group expanded with no way to fold one
 * away, which on a register of 40 residents is a long scroll to reach the
 * cluster you actually wanted.
 *
 * The first opens by default, because a screen that starts entirely closed
 * looks broken.
 */
const openClusters = ref<Record<string, boolean>>({});

function isClusterOpen(key: string, index: number) {
  return openClusters.value[key] ?? index === 0;
}

function toggleCluster(key: string, index: number) {
  openClusters.value[key] = !isClusterOpen(key, index);
}

/**
 * How many residents are drawn in each open cluster.
 *
 * Same control, same step and same noun handling as the room directory and the
 * registers, so the reader learns it once. BH holds the bulk of the property,
 * so an open cluster here was the longest uncapped list left on the screen.
 */
const RESIDENTS_PER_STEP = 8;
const shownResidents = ref<Record<string, number>>({});

function residentsShown(key: string) {
  return shownResidents.value[key] ?? RESIDENTS_PER_STEP;
}

function visibleResidents(key: string, all: TenantRecord[]) {
  return all.slice(0, residentsShown(key));
}

function residentsRemaining(key: string, total: number) {
  return Math.max(0, total - residentsShown(key));
}

function showMoreResidents(key: string) {
  shownResidents.value[key] = residentsShown(key) + RESIDENTS_PER_STEP;
}

function showAllResidents(key: string, total: number) {
  shownResidents.value[key] = total;
}

const groupedRows = computed(() => {
  const byCluster = new Map<Cluster | 'unassigned', TenantRecord[]>();
  for (const t of rows.value) {
    const cluster = clusterByUnitCode.value.get(t.unitCode.toUpperCase()) ?? 'unassigned';
    const bucket = byCluster.get(cluster);
    if (bucket) bucket.push(t);
    else byCluster.set(cluster, [t]);
  }

  const groups: { key: string; label: string; residents: TenantRecord[] }[] = [];
  for (const cluster of CLUSTERS) {
    const residents = byCluster.get(cluster);
    if (residents?.length) groups.push({ key: cluster, label: cluster, residents });
  }
  const unassigned = byCluster.get('unassigned');
  if (unassigned?.length) {
    groups.push({ key: 'unassigned', label: 'No unit yet', residents: unassigned });
  }
  return groups;
});

/**
 * `systemState` fills a missing emergency contact with an em dash rather than
 * leaving it blank, so a falsy test never fires and the dialog printed a dash
 * where it meant to say nobody is on file.
 */
function onFile(value: string | null | undefined) {
  const v = (value ?? '').trim();
  return v && v !== '—' && v !== '-' ? v : null;
}

/**
 * The household in words. BR-014 bills water by headcount, so the number of
 * people is the fact worth reading, not a yes/no badge.
 */
function householdLabel(t: TenantRecord) {
  const mates = t.roommateQty ?? Math.max(0, (t.occupants || 1) - 1);
  if (mates === 0) return 'Lives alone';
  return mates === 1 ? 'With 1 roommate' : `With ${mates} roommates`;
}

/** A prospect is not a resident. The three states each get their own words. */
function standing(t: TenantRecord): { label: string; tone: 'paid' | 'verify' | 'neutral' } {
  if (t.role === 'prospect') return { label: 'Prospect', tone: 'verify' };
  if (t.status === 'active') return { label: 'Living here', tone: 'paid' };
  return { label: 'Moved out', tone: 'neutral' };
}

function openEdit(t: TenantRecord) {
  editModalTenant.value = t;
  editUnitCode.value = t.unitCode.toUpperCase();
  editStatus.value = t.status as 'active' | 'vacated';
  const rQty = t.roommateQty ?? Math.max(0, (t.occupants || 1) - 1);
  editHasRoommates.value = rQty > 0 ? 'yes' : 'no';
  editRoommateQty.value = rQty > 0 ? rQty : 1;
}

async function saveEdit() {
  if (!editModalTenant.value) return;
  
  // Verify unit is not occupied by another active tenant
  const targetUnit = editUnitCode.value.toLowerCase();
  const currentTenantId = editModalTenant.value.id;
  const unitChanged = targetUnit !== editModalTenant.value.unitCode.toLowerCase();
  const isOccupiedByOther = tenants.some(t =>
    t.status === 'active' &&
    t.unitCode.toLowerCase() === targetUnit &&
    t.id !== currentTenantId
  );
  if (unitChanged && isOccupiedByOther && targetUnit !== '—' && targetUnit !== 'none') {
    showToast('error', 'Unit Already Occupied', `Unit ${editUnitCode.value.toUpperCase()} already has an active tenant.`);
    return;
  }

  isSubmitting.value = true;
  try {
    const finalRoommateQty = editHasRoommates.value === 'yes' ? Number(editRoommateQty.value) || 1 : 0;
    const finalOccupants = 1 + finalRoommateQty;

    /**
     * `roomNumber` is omitted when no unit is selected, rather than sent as "—".
     *
     * The API treats `roomNumber !== undefined` as "the assignment is being changed": it
     * closes the tenant's active tenancy and frees the unit FIRST, and only then reads the
     * value - where "—" and "none" are its sentinels for *leave them unassigned*. Sending the
     * sentinel from a form whose real subject is the occupant count would therefore end a
     * tenancy as a side effect. Omitting the key skips that whole branch, so editing status
     * or roommates leaves the tenancy exactly where it was.
     *
     * The same held for the resident's OWN unit, which the dropdown opens on: every save
     * sent it, and the API closed the tenancy and opened a new one dated today, moving
     * their move-in and anniversary dates and every rent period after them (B-61). The
     * backend now refuses to reopen a tenancy for an unchanged unit (3927acb); this is
     * the half that never asks it to. `roomNumber` goes only when the unit changed.
     */
    const payload: Record<string, unknown> = {
      accountStatus: editStatus.value === 'active' ? 'active' : 'inactive',
      occupantCount: finalOccupants,
      roommateQty: finalRoommateQty,
    };
    if (unitChanged && editUnitCode.value && editUnitCode.value !== '—') {
      payload.roomNumber = editUnitCode.value.toUpperCase();
    }

    await api.patch(`/admin/tenants/${editModalTenant.value.id}`, payload);

    await fetchTenants();
    await fetchRooms();
    showToast('success', 'Tenant details updated', `Resident info for ${editModalTenant.value.name} updated.`);
    editModalTenant.value = null;
  } catch (err: any) {
    showToast('error', 'Update Failed', err?.message || 'Could not update tenant details.');
  } finally {
    isSubmitting.value = false;
  }
}

function openVacateFromModal(t: TenantRecord) {
  editModalTenant.value = null;
  vacateModalTenant.value = t;
}

async function confirmVacate() {
  if (!vacateModalTenant.value) return;
  isSubmitting.value = true;
  try {
    await api.post(`/admin/tenants/${vacateModalTenant.value.id}/vacate`);
    await fetchTenants();
    await fetchRooms();
    showToast('warning', 'Vacancy settled', `Unit ${vacateModalTenant.value.unitCode} released back to directory.`);
    vacateModalTenant.value = null;
  } catch (err: any) {
    showToast('error', 'Vacate Failed', err?.message || 'Could not settle vacancy.');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleOnboard() {
  if (!newUnit.value) {
    showToast('error', 'Choose a unit', 'Pick the unit they are moving into.');
    return;
  }
  const isOccupied = tenants.some(t => t.status === 'active' && t.unitCode.toLowerCase() === newUnit.value.toLowerCase());
  if (isOccupied) {
    showToast('error', 'Unit Already Occupied', `Unit ${newUnit.value.toUpperCase()} already has an active tenant.`);
    return;
  }

  isSubmitting.value = true;
  try {
    const finalRoommateQty = newHasRoommates.value === 'yes' ? Number(newRoommateQty.value) || 1 : 0;
    const finalOccupants = 1 + finalRoommateQty;

    const created = await api.post<{ id: string; temporaryPassword: string | null }>('/admin/tenants', {
      fullName: newName.value.trim(),
      email: newEmail.value.trim(),
      phone: newPhone.value.trim(),
      roomNumber: newUnit.value.toUpperCase(),
      moveInDate: newMoveIn.value,
      // A blank field is sent blank. The API takes all three as optional and
      // stores NULL, so there is no reason to invent values here - and these were
      // written to the live record as fact: a 9,000 advance rent the landlady
      // never entered, an emergency contact literally named "Emergency Contact"
      // with "-" for a phone number, and an occupation of "Resident" for everyone.
      depositAmount: Number(newDeposit.value) || 0,
      occupantCount: finalOccupants,
      roommateQty: finalRoommateQty,
      emergencyContactName: newEmergName.value.trim(),
      emergencyContactPhone: newEmergPhone.value.trim(),
    });

    /**
     * BR-009 - close the loop on the lead this came from.
     *
     * The inquiry's details were carried into this form, but nothing was ever
     * written back: the lead stayed `Pending` in the inbox indefinitely and
     * `inquiries.converted_tenant_id` - a column that has existed since the
     * original schema - was never set by anything, so no record connected a
     * tenancy to the enquiry that produced it.
     *
     * Not fatal if it fails. The tenant exists either way, and re-running the
     * onboarding to fix a lead's status would create a duplicate person.
     */
    /**
     * READ ONCE, THEN PUT IT DOWN.
     *
     * This read `route.query.convertInquiryId` at submit time and nothing ever
     * cleared it - the file imported `useRoute` and never `useRouter`, so it had
     * no way to. After a conversion the URL still said `?convertInquiryId=X`, so
     * onboarding an unrelated walk-in without leaving the page PATCHed that same
     * enquiry a second time, pointing it at a tenancy it never produced.
     *
     * The backend now refuses that outright (409, PATCH /admin/inquiries/:id,
     * an enquiry can only become one tenancy) so the record is safe either way.
     * This is the half that stops her ever meeting the refusal: the parameter is
     * dropped from the URL as soon as it has been used.
     */
    const inquiryId = route.query.convertInquiryId;
    if (inquiryId && created?.id) {
      try {
        await api.patch(`/admin/inquiries/${inquiryId}`, {
          status: 'Converted',
          convertedTenantId: created.id,
        });
      } catch (err: any) {
        showToast(
          'info',
          'Tenant onboarded',
          `${newName.value} was added, but the inquiry could not be marked Converted. ` +
            'Set it from the Inquiries page.'
        );
      }

      // Used, and now put down - whether the PATCH above succeeded or not. If it
      // failed, the toast has just told her to set the status by hand; leaving
      // the parameter in the URL so the NEXT onboarding retries it against a
      // different resident is not a recovery.
      const { convertInquiryId, name, phone, email, unit, ...keep } = route.query;
      await router.replace({ query: keep });
    }

    await fetchTenants();
    await fetchRooms();

    // Read before resetOnboardForm() clears it below.
    const onboardedName = newName.value.trim();

    isOnboardModalOpen.value = false;
    resetOnboardForm();

    if (created?.temporaryPassword) {
      // The credential reveal modal below is the confirmation - a toast
      // would say the same thing and then take the one thing she needs
      // with it when it auto-dismisses.
      onboardedCredentials.value = { name: onboardedName, password: created.temporaryPassword };
    } else {
      // Only reachable if onboarding somehow ran with neither an email nor
      // a phone number - the form requires phone, so nothing generates
      // this today, but the API's own type is honest that it can happen.
      showToast('success', 'Tenant onboarded', 'Resident portal access and room assignment registered.');
    }
  } catch (err: any) {
    showToast('error', 'Onboarding Failed', err?.message || 'Could not onboard tenant.');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="ws-focus space-y-6">
    <!-- Page header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Admin</p>
        <h1 class="mt-1 text-3xl font-medium leading-tight tracking-tight sm:text-[2.125rem]">
          Residents
        </h1>
        <p class="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
          {{ residentCount }} on record<span v-if="prospectCount">, and {{ prospectCount }} prospect<span v-if="prospectCount > 1">s</span> with no unit yet</span>.
        </p>
      </div>

      <div class="flex items-center gap-2 self-start sm:self-auto">

        <button type="button" class="pill-btn-brand" @click="isOnboardModalOpen = true">
          <UserPlus class="size-4" aria-hidden="true" />
          <span>Move someone in</span>
        </button>
      </div>
    </div>

    <!--
      Search, the switcher, and the standing filter - same grouping as the Units directory.

      A COLUMN ON A PHONE, A ROW FROM `sm` UP, and the two `shrink-0`s that used
      to sit inside the wrapping row are gone.

      What they did, measured in the running app at a 375px viewport: the filter
      wrapper was `shrink-0` while this left-hand group was `flex-1 min-w-0`, so
      the row never wrapped - the left group simply absorbed the whole shortfall
      and closed to 123px of the 343px content column. The search box says
      `w-full`, and `w-full` of 123px is 123px, so the one control the client
      likes was a third of the width he saw it at. The switcher inside it could
      not shrink (`shrink-0`, min-content 236px), so it ran to x=238 inside that
      123px box and straight under the filter pill, which starts at x=135: two
      controls overlapping by 103px.

      Stacking on the small side rather than wrapping means nothing has to be
      squeezed: search, then the switcher, then the filter, each the full width
      of the column. From `sm` the group is a row again and lays out as it did.
      Re-measured at 375, 768 and 1280 - see the note on the room directory's
      filters, which is the same shape and the same trap.
    -->
    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div class="relative w-full sm:w-80">
          <Search
            class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <label for="resident-search" class="sr-only">Search residents</label>
          <input
            id="resident-search"
            v-model="q"
            type="search"
            placeholder="Name, unit, phone or email"
            class="ws-input w-full pl-11"
          />
        </div>

        <!-- By cluster / As a list switcher, same treatment as the Units directory -->
        <div
          class="min-h-[2.75rem] h-11 inline-flex w-full items-center rounded-full bg-tile border border-line p-1 shadow-xs sm:w-auto sm:shrink-0"
          role="group"
          aria-label="How to show the residents"
        >
          <button
            type="button"
            :class="[
              'press h-full flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold cursor-pointer whitespace-nowrap sm:flex-none',
              viewMode === 'grouped' ? 'bg-brand text-on-brand shadow-sm' : 'text-ink-soft hover:text-brand hover:bg-brand-soft/40',
            ]"
            :aria-pressed="viewMode === 'grouped'"
            @click="viewMode = 'grouped'"
          >
            <LayoutGrid class="size-4" aria-hidden="true" />
            <span>By cluster</span>
          </button>
          <button
            type="button"
            :class="[
              'press h-full flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold cursor-pointer whitespace-nowrap sm:flex-none',
              viewMode === 'list' ? 'bg-brand text-on-brand shadow-sm' : 'text-ink-soft hover:text-brand hover:bg-brand-soft/40',
            ]"
            :aria-pressed="viewMode === 'list'"
            @click="viewMode = 'list'"
          >
            <TableIcon class="size-4" aria-hidden="true" />
            <span>As a list</span>
          </button>
        </div>
      </div>

      <!-- `sm:ml-auto` keeps the filter on the right edge even on the line it
           wraps onto, which is what `justify-between` did for it while it was
           the only thing over there. -->
      <div class="flex items-center gap-2 sm:ml-auto">
        <PillSelect
          v-model="statusFilter"
          :options="filterChips"
          aria-label="Filter by standing"
          widthClass="w-full sm:w-52"
        />
      </div>
    </div>

    <!--
      Shaped like whichever view mode is about to render, not always the flat
      list. `viewMode` opens on 'grouped' - several collapsible cluster
      sections, each its own tile - and a single 6-row table here promised one
      flat list on every first load, the opposite of what appeared once
      `groupedRows` arrived. Two shorter tiles reads as "a few sections," the
      shape "grouped" actually is; RoomDirectoryView does the same swap
      between its own two view modes.
    -->
    <div v-if="showSkeleton && viewMode === 'grouped'" class="space-y-6">
      <SkeletonTable :columns="6" :rows="3" />
      <SkeletonTable :columns="6" :rows="3" />
    </div>
    <SkeletonTable v-else-if="showSkeleton" :columns="6" :rows="6" />

    <!--
      A failed load must not be reported as a search result.

      `fetchTenants` swallows its error and leaves the array as it found it -
      empty, on a first load - and the table below then rendered its empty state:
      "Nobody matches", noting that nothing answers to this filter. So a refused
      or broken request told the landlady her filter excluded everyone, on a
      property where 32 of 33 units are occupied, and clearing the filter said
      the same thing again.
    -->
    <UnavailableNote
      v-else-if="tenantsFetchFailed"
      message="The resident list could not be loaded. That is not the same as there being no residents — nothing is shown rather than an empty register."
      @retry="fetchTenants"
    />

    <!--
      A register on a wide screen, a record per tile on a narrow one, and a
      first page of ten with the rest behind a control. It used to be one table
      1,000px wide at every size rendering all 44 rows, so a laptop scrolled
      sideways and every phone scrolled both ways.

      The email and the emergency contact are no longer columns. Both are in
      the edit dialog, where the whole record is, and search still reads the
      email.
    -->
    <RecordTable
      v-else-if="viewMode === 'list'"
      class="ws-reveal"
      :rows="rows"
      caption="Residents, with unit, household, move-in date, deposit and standing"
      noun="resident"
      empty-title="Nobody matches"
      :empty-note="q ? `Nothing on this list answers to “${q}”.` : 'Nothing on this list answers to this filter.'"
    >
      <template #head>
        <tr>
          <th scope="col">Resident</th>
          <th scope="col">Unit</th>
          <th scope="col">Household</th>
          <th scope="col">Moved in</th>
          <th scope="col" class="num">Deposit</th>
          <th scope="col">Standing</th>
          <th scope="col" class="w-14"><span class="sr-only">Actions</span></th>
        </tr>
      </template>

      <template #row="{ row: t }">
        <tr class="group">
          <th scope="row">
            <span class="block font-semibold text-ink">{{ t.name }}</span>
            <span class="tabular block text-xs font-normal text-ink-soft">{{ t.phone }}</span>
          </th>
          <td class="font-semibold uppercase text-ink">{{ t.unitCode }}</td>
          <td>{{ householdLabel(t) }}</td>
          <td>{{ t.moveInDate }}</td>
          <td class="num font-semibold text-ink">{{ peso(t.depositAmount) }}</td>
          <td>
            <StatusPill :tone="standing(t).tone">{{ standing(t).label }}</StatusPill>
          </td>
          <td class="num">
            <!--
              A quiet icon, not a bordered chip. `.icon-btn` draws a ring
              around itself always, which is right for an action that stands
              alone (the notification bell) but reads as an odd floating
              circle in a dense row of plain text. `press-plate` is the same
              treatment the password-reveal toggle already uses: no border,
              no fill until hovered or pressed. It also stays fully
              transparent until that row is hovered or focused, so a page of
              residents does not read as a column of pencils.
            -->
            <button
              type="button"
              class="press-plate flex size-9 items-center justify-center rounded-full ml-auto row-action hover:bg-canvas cursor-pointer"
              :aria-label="`Edit ${t.name}`"
              @click="openEdit(t)"
            >
              <Pencil class="size-3.5 text-ink-soft" aria-hidden="true" />
            </button>
          </td>
        </tr>
      </template>

      <template #card="{ row: t }">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-base font-semibold leading-snug text-ink">{{ t.name }}</p>
            <p class="tabular mt-0.5 text-sm text-ink-soft">{{ t.phone }}</p>
          </div>
          <StatusPill :tone="standing(t).tone">{{ standing(t).label }}</StatusPill>
        </div>

        <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt class="text-xs text-ink-faint">Unit</dt>
            <dd class="font-semibold uppercase text-ink">{{ t.unitCode }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-faint">Household</dt>
            <dd class="text-ink">{{ householdLabel(t) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-faint">Moved in</dt>
            <dd class="text-ink">{{ t.moveInDate }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-faint">Deposit</dt>
            <dd class="tabular font-semibold text-ink">{{ peso(t.depositAmount) }}</dd>
          </div>
        </dl>

        <button type="button" class="pill-btn mt-4 w-full justify-center" @click="openEdit(t)">
          <Pencil class="size-3.5" aria-hidden="true" />
          <span>Edit</span>
        </button>
      </template>
    </RecordTable>

    <!--
      By cluster: the same rows, split into the same five sections the
      property itself reads in. One `.ws-table` per cluster rather than
      routing each group through `RecordTable` - that component owns its own
      empty state and mobile card fallback for ONE list, and five of those
      nested in one screen would fight each other over both.

      It used to scroll horizontally on a narrow screen instead, and the
      comment here called that an acceptable trade because "As a list" covers
      the same data on a phone. `viewMode` opens on 'grouped', so that trade
      was being made on the FIRST thing a phone showed - the client opened it
      on a handset on 2026-09-23 and the columns were cut off mid-word with the
      edit control off screen. Each cluster now carries the same `lg:hidden`
      card stack RecordTable renders, written out below rather than shared.
    -->
    <div v-else-if="viewMode === 'grouped'" class="ws-reveal space-y-6">
      <!--
        The same empty state "As a list" renders through RecordTable, in the
        same shape and with the same words. It was a single grey line with
        straight quotes, against a title-and-sentence with curly ones a few
        lines below - two views of one register disagreeing about what
        "nobody found" looks like.
      -->
      <div
        v-if="groupedRows.length === 0"
        class="ws-reveal rounded-tile bg-tile px-6 py-16 text-center"
      >
        <p class="text-base font-semibold text-ink">Nobody matches</p>
        <p class="mx-auto mt-1 max-w-md text-sm leading-6 text-ink-soft">
          {{ q ? `Nothing on this list answers to “${q}”.` : 'Nothing on this list answers to this filter.' }}
        </p>
      </div>

      <section
        v-for="(group, groupIndex) in groupedRows"
        :key="group.key"
        class="overflow-hidden rounded-tile bg-tile"
      >
        <!--
          Collapsible, like the room directory and the income register. This
          was a plain `div` - the only cluster header in the workspace that
          could not be folded away - so every group stayed open and a register
          of forty residents scrolled past four clusters to reach the fifth.
          A closed section still names itself and says how many it holds.
        -->
        <h2>
          <button
            type="button"
            class="press-plate flex w-full items-baseline justify-between gap-3 px-5 py-4 text-left hover:bg-canvas"
            :aria-expanded="isClusterOpen(group.key, groupIndex)"
            :aria-controls="`residents-cluster-${group.key}`"
            @click="toggleCluster(group.key, groupIndex)"
          >
            <span class="flex items-center gap-2">
              <ChevronDown
                :class="[
                  'size-4 shrink-0 text-ink-soft transition-transform duration-200 ease-[var(--ease-out)]',
                  isClusterOpen(group.key, groupIndex) ? '' : '-rotate-90',
                ]"
                aria-hidden="true"
              />
              <span class="text-[0.9375rem] font-semibold text-ink">{{ group.label }}</span>
            </span>
            <span class="tabular text-xs text-ink-soft">
              {{ group.residents.length }} {{ group.residents.length === 1 ? 'resident' : 'residents' }}
            </span>
          </button>
        </h2>

        <!--
          The table sits INSIDE the padding now, which is what squares the
          corner off under the heading.
          `.ws-table-wrap` carries its own `border-radius: 1rem` (index.css), and
          this was flush against the tile's edges directly beneath the header -
          so its rounded top corners cut into the straight line under the title.
          Every other register puts the table inside `border-t border-line` plus
          padding, which is what makes the radius read as a deliberate inset
          rather than a notch. Same structure here now.
        -->
        <div
          v-if="isClusterOpen(group.key, groupIndex)"
          :id="`residents-cluster-${group.key}`"
          class="ws-reveal border-t border-line p-5 sm:p-6"
        >
        <!--
          THE TABLE IS FOR A SCREEN WIDE ENOUGH TO READ ONE, and below `lg`
          this cluster renders the same residents as tiles instead - the shape
          RecordTable gives "As a list", and the one the client asked to see
          everywhere after opening this screen on a handset.

          The comment that used to sit above this section called the sideways
          scroll "an acceptable trade" because "As a list" covers the same rows
          on a phone. It does, but `viewMode` opens on 'grouped', so the first
          thing a phone showed was the register that scrolls: measured at a
          375px viewport, a 518px table inside a 301px wrapper - 217px of
          sideways scroll, with the Standing pill starting at x=390 and the edit
          pencil at x=463, both past a right edge at 301. The one control that
          opens a resident's record was off screen on the default view.

          Five of these do not go through RecordTable for the reason given
          below - it owns one empty state and one ShowMore per list, and five
          nested would fight over both - so the card markup is repeated from the
          `#card` template above rather than shared. Same fields, same order.
        -->
        <div class="hidden lg:block">
        <div class="ws-table-wrap">
          <table class="ws-table">
            <caption class="sr-only">{{ group.label }} residents, with unit, household, move-in date, deposit and standing</caption>
            <thead>
              <tr>
                <th scope="col">Resident</th>
                <th scope="col">Unit</th>
                <th scope="col">Household</th>
                <th scope="col">Moved in</th>
                <th scope="col" class="num">Deposit</th>
                <th scope="col">Standing</th>
                <th scope="col" class="w-14"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="t in visibleResidents(group.key, group.residents)"
                :key="t.id"
                class="group"
              >
                <th scope="row">
                  <span class="block font-semibold text-ink">{{ t.name }}</span>
                  <span class="tabular block text-xs font-normal text-ink-soft">{{ t.phone }}</span>
                </th>
                <td class="font-semibold uppercase text-ink">{{ t.unitCode }}</td>
                <td>{{ householdLabel(t) }}</td>
                <td>{{ t.moveInDate }}</td>
                <td class="num font-semibold text-ink">{{ peso(t.depositAmount) }}</td>
                <td>
                  <StatusPill :tone="standing(t).tone">{{ standing(t).label }}</StatusPill>
                </td>
                <td class="num">
                  <button
                    type="button"
                    class="press-plate flex size-9 items-center justify-center rounded-full ml-auto row-action hover:bg-canvas cursor-pointer"
                    :aria-label="`Edit ${t.name}`"
                    @click="openEdit(t)"
                  >
                    <Pencil class="size-3.5 text-ink-soft" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>

        <!-- The same residents, one tile each, on anything narrower. -->
        <div class="space-y-3 lg:hidden">
          <div
            v-for="t in visibleResidents(group.key, group.residents)"
            :key="t.id"
            class="rounded-2xl bg-canvas p-5"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-base font-semibold leading-snug text-ink">{{ t.name }}</p>
                <p class="tabular mt-0.5 text-sm text-ink-soft">{{ t.phone }}</p>
              </div>
              <StatusPill :tone="standing(t).tone">{{ standing(t).label }}</StatusPill>
            </div>

            <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt class="text-xs text-ink-faint">Unit</dt>
                <dd class="font-semibold uppercase text-ink">{{ t.unitCode }}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-faint">Household</dt>
                <dd class="text-ink">{{ householdLabel(t) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-faint">Moved in</dt>
                <dd class="text-ink">{{ t.moveInDate }}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-faint">Deposit</dt>
                <dd class="tabular font-semibold text-ink">{{ peso(t.depositAmount) }}</dd>
              </div>
            </dl>

            <button type="button" class="pill-btn mt-4 w-full justify-center" @click="openEdit(t)">
              <Pencil class="size-3.5" aria-hidden="true" />
              <span>Edit</span>
            </button>
          </div>
        </div>

          <ShowMore
            :shown="visibleResidents(group.key, group.residents).length"
            :total="group.residents.length"
            :remaining="residentsRemaining(group.key, group.residents.length)"
            :next-step="Math.min(8, residentsRemaining(group.key, group.residents.length)) || 8"
            noun="resident"
            @more="showMoreResidents(group.key)"
            @all="showAllResidents(group.key, group.residents.length)"
          />
        </div>
      </section>
    </div>

    <!-- The whole record, and the parts of it that can be changed here -->
    <WsModal
      v-if="editModalTenant"
      :title="editModalTenant.name"
      size="lg"
      :dismissible="false"
      @close="editModalTenant = null"
    >
        <div class="rounded-2xl bg-canvas p-5">
          <div class="flex items-start justify-between gap-3 border-b border-line pb-3">
            <p class="text-sm font-semibold text-ink">On record</p>
            <StatusPill :tone="standing(editModalTenant).tone">
              {{ standing(editModalTenant).label }}
            </StatusPill>
          </div>

          <dl class="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 text-sm sm:grid-cols-3">
            <div>
              <dt class="text-xs text-ink-faint">Phone</dt>
              <dd class="tabular mt-0.5 text-ink">{{ editModalTenant.phone }}</dd>
            </div>
            <!--
              The two fields that hold something long get the whole row on a
              phone. A column of this grid is 141px at a 375px viewport, and
              `truncate` turned an address into "mariaconcepci…" with no hover
              to read the `title` from. Across the row it has 303px, which most
              addresses fit in, and the truncation is still there for the ones
              that do not.
            -->
            <div class="col-span-2 min-w-0 sm:col-span-1">
              <dt class="text-xs text-ink-faint">Email</dt>
              <!-- `onFile`, not `||`: a missing email arrives as an em dash, which is
                   truthy, so the dialog printed "—" instead of saying so. -->
              <dd class="mt-0.5 truncate text-ink" :title="onFile(editModalTenant.email) ?? undefined">
                {{ onFile(editModalTenant.email) ?? 'No email on file' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Deposit</dt>
              <dd class="tabular mt-0.5 font-semibold text-ink">
                {{ peso(editModalTenant.depositAmount) }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Moved in</dt>
              <dd class="mt-0.5 text-ink">{{ editModalTenant.moveInDate }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Anniversary</dt>
              <dd class="mt-0.5 text-ink">{{ editModalTenant.anniversary }}</dd>
            </div>
            <div class="col-span-2 min-w-0 sm:col-span-1">
              <dt class="text-xs text-ink-faint">In an emergency</dt>
              <dd class="mt-0.5 truncate text-ink">
                {{ onFile(editModalTenant.emergencyContact.name) ?? 'Nobody on file' }}
              </dd>
              <dd
                v-if="onFile(editModalTenant.emergencyContact.phone)"
                class="tabular truncate text-xs text-ink-soft"
              >
                {{ editModalTenant.emergencyContact.phone }}
              </dd>
            </div>
          </dl>
        </div>

        <form @submit.prevent="saveEdit" class="mt-6 space-y-5">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="ws-field">
              <label for="edit-unit">Unit</label>
              <!--
                `systemState` gives a tenant with no room assignment the unit code "—".
                That matched none of the options below, so the browser rendered this select
                EMPTY, and `required` then refused to submit the form - meaning the four
                active tenants who hold no assignment today could not have their status or
                roommate count edited at all without also being handed a unit.

                The state is now an option of its own, so it displays honestly and the form
                submits. It is `disabled`: a tenant who HAS a unit cannot be un-assigned from
                this dropdown, because releasing a unit is what the Settle Vacancy button is
                for and that path also closes the tenancy properly. A disabled option can
                still be the selected one, and its value is non-empty, so `required` is
                satisfied.
              -->
              <PillSelect id="edit-unit" v-model="editUnitCode" :options="editUnitOptions" aria-label="Unit" widthClass="w-full" />
              <p v-if="editUnitCode === '—'" class="ws-hint">
                This resident holds no unit. Pick one to assign them, or save to change the
                other details and leave them unassigned.
              </p>
            </div>

            <div class="ws-field">
              <label for="edit-status">Standing</label>
              <PillSelect id="edit-status" v-model="editStatus" :options="editStatusOptions" aria-label="Standing" widthClass="w-full" />
            </div>

            <div class="ws-field">
              <label for="edit-roommates">Sharing the unit</label>
              <PillSelect
                id="edit-roommates"
                v-model="editHasRoommates"
                :options="sharingOptions"
                aria-label="Sharing the unit"
                widthClass="w-full"
              />
            </div>

            <div v-if="editHasRoommates === 'yes'" class="ws-reveal ws-field">
              <label for="edit-roommate-qty">How many roommates</label>
              <input
                id="edit-roommate-qty"
                v-model.number="editRoommateQty"
                type="number"
                min="1"
                max="8"
                class="ws-input w-full"
                required
              />
            </div>
          </div>

          <!-- What the headcount means for the water bill, stated as a sentence. -->
          <p class="rounded-2xl bg-canvas px-4 py-3 text-sm leading-6 text-ink-soft">
            <strong class="font-semibold text-ink">{{ editOccupantsPreview }}</strong>
            in the unit, so water is
            <strong class="tabular font-semibold text-ink">{{ peso(editWaterPreview) }}</strong>
            a month.
          </p>

          <div
            class="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <button
              type="button"
              class="pill-btn-danger-quiet"
              @click="openVacateFromModal(editModalTenant)"
            >
              <LogOut class="size-3.5" aria-hidden="true" />
              <span>Move them out</span>
            </button>

            <div class="flex items-center justify-end gap-2">
              <button type="button" class="pill-btn" @click="editModalTenant = null">Cancel</button>
              <button type="submit" :disabled="isSubmitting" class="pill-btn-brand">
                <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" aria-hidden="true" />
                <Check v-else class="size-3.5" aria-hidden="true" />
                <span>Save the changes</span>
              </button>
            </div>
          </div>
        </form>
    </WsModal>

    <!-- Vacate Confirm Dialog -->
    <!--
      Type-to-confirm, deliberately, and the only dialog in the app that asks
      for it.

      Moving someone out is not just a status change: the account is set
      inactive, and `resolveAuthUser` re-reads `account_status` on EVERY
      authenticated request - so the resident loses the portal on their very
      next tap, not at their next sign-in. A token already in their phone stops
      working. That is the right behaviour and it is what Sean asked for, but it
      is far more than a red button conveys, and it was one click away from any
      row in the list.

      The unit code is the phrase rather than the name: it is short enough to
      type without inviting copy-paste, and typing it is what makes her look at
      WHICH row she is on, which is the mistake actually worth preventing.
    -->
    <ConfirmDialog
      v-if="vacateModalTenant"
      title="Move this resident out"
      confirm-label="Move them out"
      destructive
      :busy="isSubmitting"
      :confirm-phrase="vacateModalTenant.unitCode"
      confirm-phrase-label="the unit"
      @cancel="vacateModalTenant = null"
      @confirm="confirmVacate"
    >
      <p class="text-sm leading-6 text-ink-soft">
        <strong class="text-ink">{{ vacateModalTenant.name }}</strong> loses access to the resident portal
        straight away — the next thing they tap will sign them out, even if they are already signed in.
        Unit <strong class="text-ink">{{ vacateModalTenant.unitCode }}</strong> is freed and can be let again.
      </p>
      <p class="text-sm leading-6 text-ink-soft">
        <strong class="text-ink">Their records stay.</strong> Every receipt, payment and repair they are on
        remains in the ledger exactly as it is — this ends their tenancy and their access, it does not erase
        anything. Giving access back means onboarding them again.
      </p>
    </ConfirmDialog>

    <!-- Onboard Tenant Modal -->
    <WsModal
      v-if="isOnboardModalOpen"
      title="Move a tenant in"
      subtitle="Creates the account and assigns the unit."
      size="lg"
      :dismissible="false"
      @close="isOnboardModalOpen = false"
    >

        <form @submit.prevent="handleOnboard" class="grid gap-5 sm:grid-cols-2">
          <div class="ws-field">
            <label for="new-name">Full name</label>
            <input
              id="new-name"
              v-model="newName"
              placeholder="Juan Dela Cruz"
              class="ws-input w-full"
              required
            />
          </div>
          <!--
            Email is optional; the phone number is not.

            OD-09, client-confirmed 2026-09-13: "Do tenants need an email address to exist in
            the system? No." `profiles.email` has been nullable since migration 006 and the
            API schema stopped demanding one in 43c4608 - but this field kept `required`, so
            the administrator still could not submit the form without an address. The rule
            the database actually enforces is `profiles_login_identifier_required`: a profile
            holding a password must have an email OR a phone number. Phone stays required, so
            every tenant onboarded here has one identifier and can sign in.
          -->
          <div class="ws-field">
            <label for="new-email">Email, if they have one</label>
            <input
              id="new-email"
              v-model="newEmail"
              type="email"
              placeholder="you@email.com"
              class="ws-input w-full"
            />
            <p class="ws-hint">Leave this blank and they sign in with their phone number.</p>
          </div>
          <div class="ws-field">
            <label for="new-phone">Phone</label>
            <input
              id="new-phone"
              v-model="newPhone"
              placeholder="0917-000-0000"
              class="ws-input w-full"
              required
            />
            <p class="ws-hint">This is what they sign in with.</p>
          </div>
          <div class="ws-field">
            <label for="new-unit">Unit</label>
            <PillSelect id="new-unit" v-model="newUnit" :options="newUnitOptions" aria-label="Unit" placeholder="Choose a unit" widthClass="w-full" />
          </div>

          <div class="ws-field">
            <label for="new-sharing">Sharing the unit</label>
            <PillSelect id="new-sharing" v-model="newHasRoommates" :options="newSharingOptions" aria-label="Sharing the unit" widthClass="w-full" />
          </div>

          <div v-if="newHasRoommates === 'yes'" class="ws-reveal ws-field">
            <label for="new-roommate-qty">How many roommates</label>
            <input
              id="new-roommate-qty"
              v-model.number="newRoommateQty"
              type="number"
              min="1"
              max="8"
              class="ws-input w-full"
              required
            />
          </div>
          <div v-else class="hidden sm:block" aria-hidden="true" />

          <div class="ws-field">
            <label for="new-move-in">Move-in date</label>
            <input id="new-move-in" v-model="newMoveIn" type="date" class="ws-input w-full" required />
          </div>
          <div class="ws-field">
            <label for="new-anniversary">Anniversary date</label>
            <input
              id="new-anniversary"
              v-model="newAnniv"
              type="date"
              class="ws-input w-full"
              required
            />
            <p class="ws-hint">The date their year is counted from.</p>
          </div>
          <div class="ws-field">
            <!-- OD-04, answered by the owner 2026-09-19: two months are collected at
                 move-in, one of rent and one held as a deposit that is spent at move-out
                 on fixing the unit. This field is ONE of those months - the rent month
                 is recorded as an ordinary income receipt - so the figure is one month's
                 rent and is not to be doubled (B-31).

                 SETTLED 2026-09-20. Asked whether her screen should say "Deposit" or
                 stay "Advance rent", she answered: leave it as deposit. So the four
                 places she reads now say Deposit. The stored figure is unchanged - it
                 was never the number that was in question. -->
            <label for="new-advance">Deposit</label>
            <!--
              `min="0" step="any"`: every other money field in this app carries
              both - this one had neither. `depositAmount` is validated server-side
              by `money` (backend/src/routes/admin.ts), which allows two decimal
              places and rejects negatives, so without `step="any"` a centavo figure
              was silently unsubmittable, and without `min="0"` a typo'd negative
              round-tripped to a 400 instead of being caught inline.
            -->
            <input
              id="new-advance"
              v-model.number="newDeposit"
              type="number"
              min="0"
              step="any"
              class="ws-input w-full"
              required
            />
            <p class="ws-hint">One month, filled in from the unit's current rate once you choose a unit. Change it if she agreed something else.</p>
          </div>
          <div class="ws-field">
            <label for="new-emerg-name">In an emergency, who to call</label>
            <input
              id="new-emerg-name"
              v-model="newEmergName"
              placeholder="Maria Santos"
              class="ws-input w-full"
            />
          </div>
          <div class="ws-field sm:col-span-2">
            <label for="new-emerg-phone">Their phone number</label>
            <input
              id="new-emerg-phone"
              v-model="newEmergPhone"
              placeholder="0928-000-0000"
              class="ws-input w-full"
            />
          </div>

          <p class="rounded-2xl bg-canvas px-4 py-3 text-sm leading-6 text-ink-soft sm:col-span-2">
            <strong class="font-semibold text-ink">{{ newOccupantsPreview }}</strong>
            in the unit, so water is
            <strong class="tabular font-semibold text-ink">{{ peso(newWaterPreview) }}</strong>
            a month.
          </p>

          <div class="flex justify-end gap-2 border-t border-line pt-5 sm:col-span-2">
            <button type="button" class="pill-btn" @click="isOnboardModalOpen = false">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="pill-btn-brand">
              <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" aria-hidden="true" />
              <span>Move them in</span>
            </button>
          </div>
        </form>
    </WsModal>

    <!--
      The credential reveal. Not dismissible by Escape or the backdrop -
      the one thing this modal holds only ever exists here, so an accidental
      dismissal before it is copied or written down cannot be undone by
      reopening it.
    -->
    <WsModal
      v-if="onboardedCredentials"
      title="Tenant onboarded"
      :subtitle="`A one-time password was generated for ${onboardedCredentials.name}.`"
      size="sm"
      :dismissible="false"
      @close="closeCredentialsReveal"
    >
      <p class="text-sm leading-6 text-ink-soft">
        This is the only time it will be shown. Copy it or write it down now, then relay it to
        {{ onboardedCredentials.name }} in person. They will be asked to set their own password
        the first time they sign in, and this one stops working once they do.
      </p>

      <div class="flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 py-3">
        <code class="flex-1 select-all break-all font-mono text-base font-semibold tracking-wide text-ink">{{ onboardedCredentials.password }}</code>
        <button
          type="button"
          class="icon-btn shrink-0"
          :aria-label="justCopiedPassword ? 'Copied' : 'Copy password'"
          @click="copyTemporaryPassword"
        >
          <Check v-if="justCopiedPassword" class="size-4 text-brand" aria-hidden="true" />
          <Copy v-else class="size-4" aria-hidden="true" />
        </button>
      </div>

      <template #actions>
        <button type="button" class="pill-btn-brand" @click="closeCredentialsReveal">
          Done, I've saved this
        </button>
      </template>
    </WsModal>
  </div>
</template>
