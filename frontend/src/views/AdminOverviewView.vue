<script setup lang="ts">
/**
 * @component AdminOverviewView
 * @description Executive dashboard answering "what needs the landlady's attention today?"
 *              (System Bible Section 17): current-month cash position, pending verifications,
 *              open maintenance priority, new inquiries, and a live 33-unit occupancy matrix.
 * @systemBibleRef Section 17 - Dashboard Philosophy, BR-029 - Current Month Dashboard Default
 */
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Building2,
  Users,
  CreditCard,
  Wrench,
  Layers,
  ArrowRight,
} from 'lucide-vue-next';
import { supabase } from '../lib/supabase';

const router = useRouter();
const loading = ref(true);

interface RoomRow {
  id: string;
  room_number: string;
  floor: number;
  room_type: string;
  current_price: number;
  operational_status: 'Available' | 'Reserved' | 'Occupied' | 'Under Maintenance';
  tenant_name: string | null;
  occupant_count: number;
}

const rooms = ref<RoomRow[]>([]);
const selectedFilter = ref<'all' | 'Occupied' | 'Available' | 'Reserved' | 'Under Maintenance'>('all');

const monthIncomeTotal = ref(0);
const monthWaterTotal = ref(0);
const pendingPaymentsTotal = ref(0);
const pendingPaymentsCount = ref(0);
const openTickets = ref<{ priority: string }[]>([]);
const pendingInquiriesCount = ref(0);

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

const loadDashboard = async () => {
  loading.value = true;

  const [roomsRes, assignmentsRes, incomeRes, paymentsRes, ticketsRes, inquiriesRes] = await Promise.all([
    supabase.from('rooms').select('id, room_number, floor, room_type, current_price, operational_status').order('room_number'),
    supabase.from('room_assignments').select('room_id, occupant_count, profiles(full_name)').eq('is_active', true),
    supabase.from('monthly_income_records').select('rent_amount, water_payment').eq('year', currentYear).eq('month', currentMonth),
    supabase.from('payments').select('amount').eq('verification_status', 'Pending Verification'),
    supabase.from('maintenance_tickets').select('priority').not('status', 'in', '(Closed,Resolved)'),
    supabase.from('inquiries').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
  ]);

  const assignmentByRoom = new Map<string, { tenant_name: string | null; occupant_count: number }>();
  for (const a of assignmentsRes.data ?? []) {
    assignmentByRoom.set(a.room_id, {
      tenant_name: (a as any).profiles?.full_name ?? null,
      occupant_count: a.occupant_count,
    });
  }

  rooms.value = (roomsRes.data ?? []).map((r) => ({
    ...r,
    tenant_name: assignmentByRoom.get(r.id)?.tenant_name ?? null,
    occupant_count: assignmentByRoom.get(r.id)?.occupant_count ?? 0,
  }));

  monthIncomeTotal.value = (incomeRes.data ?? []).reduce((sum, r) => sum + Number(r.rent_amount), 0);
  monthWaterTotal.value = (incomeRes.data ?? []).reduce((sum, r) => sum + Number(r.water_payment), 0);

  pendingPaymentsTotal.value = (paymentsRes.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  pendingPaymentsCount.value = (paymentsRes.data ?? []).length;

  openTickets.value = ticketsRes.data ?? [];
  pendingInquiriesCount.value = inquiriesRes.count ?? 0;

  loading.value = false;
};

onMounted(loadDashboard);

const occupiedCount = computed(() => rooms.value.filter((r) => r.operational_status === 'Occupied').length);
const availableCount = computed(() => rooms.value.filter((r) => r.operational_status === 'Available').length);
const maintenanceCount = computed(() => rooms.value.filter((r) => r.operational_status === 'Under Maintenance').length);
const reservedCount = computed(() => rooms.value.filter((r) => r.operational_status === 'Reserved').length);
const occupancyRate = computed(() => (rooms.value.length ? Math.round((occupiedCount.value / rooms.value.length) * 1000) / 10 : 0));

const emergencyTicketCount = computed(() => openTickets.value.filter((t) => t.priority === 'Emergency').length);

const floors = computed(() => {
  const grouped = new Map<number, RoomRow[]>();
  for (const r of rooms.value) {
    if (!grouped.has(r.floor)) grouped.set(r.floor, []);
    grouped.get(r.floor)!.push(r);
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([floorNumber, floorRooms]) => ({ floorNumber, rooms: floorRooms }));
});

const statusBadgeClass = (status: string) => {
  if (status === 'Occupied') return 'jira-badge-done';
  if (status === 'Available') return 'jira-badge-progress';
  if (status === 'Reserved') return 'jira-badge-warning';
  return 'jira-badge-emergency'; // Under Maintenance
};

const cardTileClass = (status: string) => {
  if (status === 'Available') return 'bg-[#e3fcef] border-[#abf5d1] hover:border-[#36b37e]';
  if (status === 'Under Maintenance') return 'bg-[#ffebe6] border-[#ffbdad]';
  if (status === 'Reserved') return 'bg-[#fffae6] border-[#ffe380]';
  return 'bg-white border-[#dfe1e6] hover:border-[#0c66e4] hover:shadow-xs';
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header Title -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Space</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Dashboard Overview</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d]">Executive Overview</h1>
      </div>
      <div class="text-xs text-[#5e6c84] bg-white border border-[#dfe1e6] px-3 py-1.5 rounded-xs shadow-2xs">
        Showing <strong>{{ monthLabel }}</strong> (current month, per BR-029)
      </div>
    </div>

    <div v-if="loading" class="text-xs text-[#6b778c] p-6 text-center">Loading dashboard...</div>

    <template v-else>
      <!-- Executive KPI Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="jira-card p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-[#6b778c] uppercase tracking-wider">Occupancy Rate</span>
            <Building2 class="w-4 h-4 text-[#0c66e4]" />
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-bold text-[#172b4d]">{{ occupiedCount }} / {{ rooms.length }}</span>
            <span class="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-xs">{{ occupancyRate }}%</span>
          </div>
          <p class="text-xs text-[#6b778c] mt-2 border-t border-[#dfe1e6] pt-2">
            {{ availableCount }} Available &middot; {{ reservedCount }} Reserved &middot; {{ maintenanceCount }} Under Maintenance
          </p>
        </div>

        <div class="jira-card p-4 border-l-4 border-l-[#0c66e4] cursor-pointer" @click="router.push('/admin/billing')">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-[#6b778c] uppercase tracking-wider">{{ monthLabel }} Income</span>
            <CreditCard class="w-4 h-4 text-[#0c66e4]" />
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-bold text-[#172b4d]">&#8369;{{ monthIncomeTotal.toLocaleString() }}</span>
          </div>
          <p class="text-xs text-[#6b778c] mt-2 border-t border-[#dfe1e6] pt-2">
            + &#8369;{{ monthWaterTotal.toLocaleString() }} water this month
          </p>
        </div>

        <div class="jira-card p-4 border-l-4 border-l-amber-500 cursor-pointer" @click="router.push('/admin/billing')">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-[#6b778c] uppercase tracking-wider">Pending Verification</span>
            <CreditCard class="w-4 h-4 text-amber-600" />
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-bold text-[#172b4d]">&#8369;{{ pendingPaymentsTotal.toLocaleString() }}</span>
            <span class="text-xs font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-xs">{{ pendingPaymentsCount }}</span>
          </div>
          <p class="text-xs text-[#6b778c] mt-2 border-t border-[#dfe1e6] pt-2">
            Online GCash payments awaiting admin confirmation (BR-017)
          </p>
        </div>

        <div class="jira-card p-4 border-l-4 border-l-rose-500 cursor-pointer" @click="router.push('/admin/tickets')">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-[#6b778c] uppercase tracking-wider">Open Tickets</span>
            <Wrench class="w-4 h-4 text-rose-600" />
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-bold text-[#172b4d]">{{ openTickets.length }}</span>
            <span v-if="emergencyTicketCount > 0" class="text-xs font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-xs">{{ emergencyTicketCount }} Emergency</span>
          </div>
          <p class="text-xs text-[#6b778c] mt-2 border-t border-[#dfe1e6] pt-2">
            Not yet Resolved or Closed
          </p>
        </div>
      </div>

      <!-- Inquiries quick link -->
      <div class="jira-card p-4 flex items-center justify-between cursor-pointer hover:border-[#0c66e4]" @click="router.push('/admin/inquiries')">
        <div class="flex items-center gap-3">
          <Users class="w-5 h-5 text-[#0c66e4]" />
          <div>
            <p class="text-sm font-bold text-[#172b4d]">{{ pendingInquiriesCount }} inquiry{{ pendingInquiriesCount === 1 ? '' : 'ies' }} awaiting reply</p>
            <p class="text-xs text-[#6b778c]">Public prospects who submitted a room inquiry and haven't been contacted yet</p>
          </div>
        </div>
        <ArrowRight class="w-4 h-4 text-[#6b778c]" />
      </div>

      <!-- 33-Unit Visual Occupancy Matrix -->
      <div class="jira-card p-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#dfe1e6]">
          <div>
            <h2 class="text-base font-bold text-[#172b4d]">{{ rooms.length }}-Unit Visual Occupancy Matrix</h2>
            <p class="text-xs text-[#6b778c]">Fe Galang Da Silva Boarding House (3 Floors)</p>
          </div>

          <div class="flex flex-wrap items-center gap-1.5 bg-[#f4f5f7] p-1 border border-[#dfe1e6] rounded-xs text-xs">
            <button
              v-for="opt in ['all', 'Occupied', 'Available', 'Reserved', 'Under Maintenance']"
              :key="opt"
              @click="selectedFilter = opt as any"
              :class="['px-2.5 py-1 rounded-2xs font-medium transition-colors', selectedFilter === opt ? 'bg-white text-[#0c66e4] font-semibold shadow-2xs' : 'text-[#5e6c84]']"
            >
              {{ opt === 'all' ? `All (${rooms.length})` : opt }}
            </button>
          </div>
        </div>

        <div class="space-y-6">
          <div v-for="floor in floors" :key="floor.floorNumber" class="space-y-2.5">
            <span class="text-xs font-bold text-[#172b4d] bg-[#ebecf0] px-2.5 py-1 rounded-xs border border-[#dfe1e6] inline-flex items-center gap-1.5">
              <Layers class="w-3.5 h-3.5 text-[#0c66e4]" />
              Floor {{ floor.floorNumber }}
            </span>

            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              <div
                v-for="room in floor.rooms"
                :key="room.id"
                v-show="selectedFilter === 'all' || selectedFilter === room.operational_status"
                :class="['p-3 rounded-xs border text-left transition-all relative', cardTileClass(room.operational_status)]"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-bold text-[#172b4d]">{{ room.room_number }}</span>
                  <span :class="['jira-badge text-[10px]', statusBadgeClass(room.operational_status)]">
                    {{ room.operational_status }}
                  </span>
                </div>

                <div class="text-[11px] text-[#5e6c84] truncate mb-1">
                  {{ room.tenant_name || 'Vacant Unit' }}
                </div>

                <div class="flex items-center justify-between text-[10px] text-[#6b778c] border-t border-[#dfe1e6]/60 pt-1.5 mt-1">
                  <span>{{ room.occupant_count }} Occupant{{ room.occupant_count === 1 ? '' : 's' }}</span>
                  <span class="font-semibold text-[#172b4d]">&#8369;{{ Number(room.current_price).toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
