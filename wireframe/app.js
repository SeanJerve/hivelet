// Hivelet Black & White Wireframe System Logic (Clickable Room Info & Expand Ticket Details)

let currentUser = null; // { name: string, role: 'admin' | 'staff' | 'guest' | 'tenant', room?: string }
let activeInquiryRoom = null; // Currently inquired room for Landlady Chat
let chatMessages = []; // Live chat history

// Active Inquirers List (Who is messaging Mrs. Fe Galang Da Silva)
let activeInquirers = [
  {
    id: 'inq-1',
    name: 'Maria Santos',
    room: '204',
    type: '1-Bedroom',
    price: 6500,
    unread: true,
    messages: [
      { sender: 'Inquirer', time: '10:14 AM', text: 'Hello Mrs. Fe! Is Room 204 still available for move-in next week?' },
      { sender: 'Landlady', time: '10:16 AM', text: 'Yes Maria! Room 204 is 1-Bedroom (₱6,500/mo) with water at ₱200/head. Would you like to view it?' }
    ]
  },
  {
    id: 'inq-2',
    name: 'Alex Gonzaga',
    room: '104',
    type: '1-Bedroom',
    price: 6500,
    unread: true,
    messages: [
      { sender: 'Inquirer', time: '09:45 AM', text: 'Good morning! Inquiring about 1st Floor Room 104 parking slot.' }
    ]
  }
];

let selectedInquirerId = 'inq-1';

// 32 Canonical Property Units across 3 Floors (With Editable Photos)
const ROOMS = [
  // 1st Floor (Rooms 101 - 110)
  { id: '101', floor: 1, num: '101', type: 'Studio', price: 5000, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Alex Santos', paid: true, balance: 0, photo: 'room101_studio.jpg', desc: 'Quiet 1st Floor Studio Unit with private bathroom and single bed frame.' },
  { id: '102', floor: 1, num: '102', type: 'Studio', price: 5000, occupants: 2, maxOccupants: 2, status: 'pending', tenant: 'Maria Clara', paid: false, balance: 5400, photo: 'room102_studio.jpg', desc: 'Cozy 1st Floor Studio near main entrance, ideal for working professionals.' },
  { id: '103', floor: 1, num: '103', type: '1-Bedroom', price: 6500, occupants: 1, maxOccupants: 3, status: 'occupied', tenant: 'Ben Reyes', paid: true, balance: 0, photo: 'room103_1bed.jpg', desc: 'Spacious 1-Bedroom Unit with separated kitchen space and private sub-meter.' },
  { id: '104', floor: 1, num: '104', type: '1-Bedroom', price: 6500, occupants: 0, maxOccupants: 3, status: 'available', tenant: null, paid: true, balance: 0, photo: 'room104_renovated.jpg', desc: 'Newly renovated 1-Bedroom Unit on Floor 1. Excellent ventilation and window light.' },
  { id: '105', floor: 1, num: '105', type: '2-Bedroom', price: 8500, occupants: 2, maxOccupants: 4, status: 'occupied', tenant: 'Chloe Tan', paid: true, balance: 0, photo: 'room105_2bed.jpg', desc: 'Large 2-Bedroom Unit designed for small family or shared roommates.' },
  { id: '106', floor: 1, num: '106', type: 'Studio', price: 5000, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'David Lim', paid: true, balance: 0, photo: 'room106_studio.jpg', desc: 'Ground floor studio unit with easy access to main lobby.' },
  { id: '107', floor: 1, num: '107', type: '1-Bedroom', price: 6500, occupants: 2, maxOccupants: 3, status: 'occupied', tenant: 'Elena Cruz', paid: true, balance: 0, photo: 'room107_tile.jpg', desc: '1-Bedroom unit with ceramic tile flooring and built-in closet.' },
  { id: '108', floor: 1, num: '108', type: '2-Bedroom', price: 8500, occupants: 2, maxOccupants: 4, status: 'overdue', tenant: 'Felix Go', paid: false, balance: 8900, photo: 'room108_corner.jpg', desc: 'Corner 2-Bedroom unit with extra storage space.' },
  { id: '109', floor: 1, num: '109', type: 'Studio', price: 5000, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Grace Lee', paid: true, balance: 0, photo: 'room109_laundry.jpg', desc: 'Compact studio unit near laundry area.' },
  { id: '110', floor: 1, num: '110', type: '3-Bedroom', price: 11000, occupants: 3, maxOccupants: 5, status: 'occupied', tenant: 'Harvey Sy', paid: true, balance: 0, photo: 'room110_family.jpg', desc: 'Premium 3-Bedroom family unit on the 1st floor.' },

  // 2nd Floor (Rooms 201 - 211)
  { id: '201', floor: 2, num: '201', type: 'Studio', price: 5200, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Ian Dizon', paid: true, balance: 0, photo: 'room201_studio.jpg', desc: '2nd Floor Studio Unit with quiet corridor view.' },
  { id: '202', floor: 2, num: '202', type: '1-Bedroom', price: 6500, occupants: 0, maxOccupants: 3, status: 'available', tenant: null, paid: true, balance: 0, photo: 'room202_balcony.jpg', desc: 'Bright 2nd Floor 1-Bedroom Unit with private balcony window.' },
  { id: '203', floor: 2, num: '203', type: '1-Bedroom', price: 6500, occupants: 2, maxOccupants: 3, status: 'occupied', tenant: 'Jane Uy', paid: true, balance: 0, photo: 'room203_desk.jpg', desc: 'Standard 1-Bedroom unit with study desk.' },
  { id: '204', floor: 2, num: '204', type: '1-Bedroom', price: 6500, occupants: 2, maxOccupants: 3, status: 'pending', tenant: 'Juan Dela Cruz', paid: false, balance: 6900, photo: 'room204_main.jpg', desc: 'Well-maintained 1-Bedroom unit on 2nd Floor.' },
  { id: '205', floor: 2, num: '205', type: '2-Bedroom', price: 8800, occupants: 2, maxOccupants: 4, status: 'occupied', tenant: 'Kevin Pineda', paid: true, balance: 0, photo: 'room205_aircon.jpg', desc: '2-Bedroom unit featuring split aircon provision.' },
  { id: '206', floor: 2, num: '206', type: 'Studio', price: 5200, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Leo Ramos', paid: true, balance: 0, photo: 'room206_shelf.jpg', desc: 'Studio unit with wall-mounted shelves.' },
  { id: '207', floor: 2, num: '207', type: '1-Bedroom', price: 6500, occupants: 1, maxOccupants: 3, status: 'occupied', tenant: 'Mona Lisa', paid: true, balance: 0, photo: 'room207_quiet.jpg', desc: 'Quiet mid-hallway 1-Bedroom unit.' },
  { id: '208', floor: 2, num: '208', type: 'Studio', price: 5200, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Nico Val', paid: true, balance: 0, photo: 'room208_tiled.jpg', desc: 'Studio unit with tiled bathroom.' },
  { id: '209', floor: 2, num: '209', type: '2-Bedroom', price: 8800, occupants: 2, maxOccupants: 4, status: 'occupied', tenant: 'Oscar Wilde', paid: true, balance: 0, photo: 'room209_double.jpg', desc: 'Spacious 2-Bedroom unit for double occupancy.' },
  { id: '210', floor: 2, num: '210', type: '3-Bedroom', price: 11500, occupants: 3, maxOccupants: 5, status: 'occupied', tenant: 'Paolo Ballesteros', paid: true, balance: 0, photo: 'room210_master.jpg', desc: '2nd Floor 3-Bedroom Master Suite.' },
  { id: '211', floor: 2, num: '211', type: 'Studio', price: 5200, occupants: 0, maxOccupants: 2, status: 'available', tenant: null, paid: true, balance: 0, photo: 'room211_corner.jpg', desc: 'Corner 2nd Floor Studio Unit, available for immediate move-in.' },

  // 3rd Floor (Rooms 301 - 311)
  { id: '301', floor: 3, num: '301', type: 'Studio', price: 5400, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Quinnie Torres', paid: true, balance: 0, photo: 'room301_high.jpg', desc: '3rd Floor Studio Unit with high ceiling airflow.' },
  { id: '302', floor: 3, num: '302', type: '1-Bedroom', price: 6800, occupants: 1, maxOccupants: 3, status: 'occupied', tenant: 'Rita Daniela', paid: true, balance: 0, photo: 'room302_skyline.jpg', desc: '3rd Floor 1-Bedroom unit with city skyline view.' },
  { id: '303', floor: 3, num: '303', type: '1-Bedroom', price: 6800, occupants: 0, maxOccupants: 3, status: 'available', tenant: null, paid: true, balance: 0, photo: 'room303_fresh.jpg', desc: 'Top Floor 1-Bedroom Unit. Fresh paint and new bathroom fixtures.' },
  { id: '304', floor: 3, num: '304', type: '2-Bedroom', price: 9000, occupants: 2, maxOccupants: 4, status: 'occupied', tenant: 'Sam Conception', paid: true, balance: 0, photo: 'room304_top.jpg', desc: '3rd Floor 2-Bedroom unit.' },
  { id: '305', floor: 3, num: '305', type: 'Studio', price: 5400, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Tina Paner', paid: true, balance: 0, photo: 'room305_deck.jpg', desc: 'Studio unit near roof deck access.' },
  { id: '306', floor: 3, num: '306', type: '1-Bedroom', price: 6800, occupants: 2, maxOccupants: 3, status: 'occupied', tenant: 'Ulysses S.', paid: true, balance: 0, photo: 'room306_cabinet.jpg', desc: '1-Bedroom unit with overhead cabinet storage.' },
  { id: '307', floor: 3, num: '307', type: 'Studio', price: 5400, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Vicky Belo', paid: true, balance: 0, photo: 'room307_studio.jpg', desc: 'Top floor studio unit.' },
  { id: '308', floor: 3, num: '308', type: '2-Bedroom', price: 9000, occupants: 2, maxOccupants: 4, status: 'overdue', tenant: 'Wally Bayola', paid: false, balance: 9400, photo: 'room308_corner.jpg', desc: 'Corner 3rd floor 2-Bedroom unit.' },
  { id: '309', floor: 3, num: '309', type: 'Studio', price: 5400, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Xavier School', paid: true, balance: 0, photo: 'room309_quiet.jpg', desc: 'Quiet studio unit.' },
  { id: '310', floor: 3, num: '310', type: '3-Bedroom', price: 12000, occupants: 3, maxOccupants: 5, status: 'occupied', tenant: 'Yeng Constantino', paid: true, balance: 0, photo: 'room310_penthouse.jpg', desc: 'Penthouse-level 3-Bedroom Unit.' },
  { id: '311', floor: 3, num: '311', type: 'Studio', price: 5400, occupants: 1, maxOccupants: 2, status: 'occupied', tenant: 'Zack Tabudlo', paid: true, balance: 0, photo: 'room311_submeter.jpg', desc: 'Studio unit with private submeter.' }
];

// TICKETS DATA DISPATCH REPOSITORY
const TICKETS_DATA = {
  'ticket-108': {
    room: '108',
    tenant: 'Felix Go',
    phone: '0918-555-0192',
    issue: 'Faucet Leaking in bathroom',
    priority: 'EMERGENCY',
    date: '2026-07-27',
    desc: 'Heavy water leak coming from bathroom faucet sub-assembly. Flooding bathroom floor.',
    technician: 'Mario Tech (Plumbing Specialist)',
    photo: 'faucet_leak_room108.jpg'
  },
  'ticket-305': {
    room: '305',
    tenant: 'Tina Paner',
    phone: '0917-888-3321',
    issue: 'Window Latch Repair',
    priority: 'MEDIUM',
    date: '2026-07-26',
    desc: 'Window latch loose due to worn screws. Needs hardware replacement.',
    technician: 'Carpenter Joseph',
    photo: 'window_latch_305.jpg'
  }
};

// Sample Initial Income Ledger State (Spec 09)
let incomeLedger = [
  { unit: '1a', date: '2026-08-01', invoiceNum: 'INV-80012', contact: 'Alex Santos', period: 'Aug.1-Aug.31/26', rent: 5000, share: 2500, occupants: 1, water: 200, remitted: 5200, paymentMethod: 'Cash', referenceNum: 'N/A' },
  { unit: '1b', date: '2026-08-01', invoiceNum: 'INV-80013', contact: 'Maria Clara', period: 'Aug.1-Aug.31/26', rent: 5000, share: 2500, occupants: 2, water: 400, remitted: 5400, paymentMethod: 'Cash', referenceNum: 'N/A' },
  { unit: '204', date: '2026-08-01', invoiceNum: 'INV-88392', contact: 'Juan Dela Cruz', period: 'Aug.5-Sep.4/26', rent: 6500, share: 3250, occupants: 2, water: 400, remitted: 6900, paymentMethod: 'Online', referenceNum: 'GCASH-9948271' },
  { unit: 'LF', date: '2026-08-01', invoiceNum: 'INV-70091', contact: 'Gayon (Linda Unit)', period: 'Fixed Monthly', rent: 3500, share: 1750, occupants: 1, water: 400, remitted: 3900, paymentMethod: 'Cash', referenceNum: 'N/A' }
];

// Merged Date Expense Ledger State (Spec 10)
let expenseLedger = [
  {
    date: '2026-08-01',
    items: [
      { supplier: 'Wilcon Depot (bh)', area: 'BH', amount: 2500, catId: '8', catName: 'Repairs & Maintenance' },
      { supplier: 'Electricbill (May26)', area: 'BH', amount: 14964, catId: '7', catName: 'Comm, Light, Water' },
      { supplier: 'Electricbill (May26)', area: 'MainHouse', amount: 5688, catId: '7', catName: 'Comm, Light, Water' }
    ]
  }
];

let supplierItemCount = 0;

document.addEventListener('DOMContentLoaded', () => {
  renderPublicRooms('all', 'all');
  initFilterChips();
  renderAdminMatrix();
  populateIncomeUnitSelect();
  renderIncomeLedger();
  initSupplierForm();
  renderExpenseLedger();
});

// TICKETING HOVER MODAL DISPATCH SPECS (FLOATS ON TOP)
function openTicketHoverModal(ticketId) {
  const ticket = TICKETS_DATA[ticketId];
  if (!ticket) return;

  const modal = document.getElementById('ticket-detail-hover-modal');
  const title = document.getElementById('ticket-hover-title');
  const body = document.getElementById('ticket-hover-body');
  if (!modal || !body) return;

  title.textContent = `📋 [ HOVER SPECS — TICKET ROOM ${ticket.room} ]`;

  body.innerHTML = `
    <div style="border-bottom: 1px dashed #000; padding-bottom: 0.75rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-family: var(--font-mono); font-size: 1.1rem; font-weight: bold;">ROOM ${ticket.room} — ${ticket.issue}</div>
        <div style="font-size: 0.8rem; color: var(--bw-text-muted);">Reported Date: <code>${ticket.date}</code> • Priority: <strong>${ticket.priority}</strong></div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.85rem; margin-bottom: 1rem;">
      <div style="border: 1px solid #000; padding: 0.75rem; background: var(--bw-box-bg);">
        <strong style="font-family: var(--font-mono);">👤 TENANT CONTACT INFO:</strong>
        <div style="margin-top: 0.35rem; line-height: 1.5;">
          <strong>Name:</strong> ${ticket.tenant}<br>
          <strong>Mobile:</strong> ${ticket.phone}<br>
          <strong>Assigned Tech:</strong> ${ticket.technician}
        </div>
      </div>

      <div style="border: 1px solid #000; padding: 0.75rem; background: #fff; text-align: center;">
        <strong style="font-family: var(--font-mono); font-size: 0.8rem;">📷 ATTACHED TICKET PHOTO:</strong>
        <div style="height: 80px; border: 1px dashed #000; margin-top: 0.35rem; display: flex; align-items: center; justify-content: center; background: var(--bw-box-bg); flex-direction: column;">
          <span>📷</span>
          <code style="font-size: 0.7rem;">${ticket.photo}</code>
        </div>
      </div>
    </div>

    <div style="border: 1px dashed #000; padding: 0.75rem; font-size: 0.85rem; background: #fff;">
      <strong>FULL ISSUE DESCRIPTION:</strong>
      <p style="margin-top: 0.35rem; font-style: italic;">"${ticket.desc}"</p>
    </div>
  `;

  modal.classList.add('open');
}

function closeTicketHoverModal() {
  const modal = document.getElementById('ticket-detail-hover-modal');
  if (modal) modal.classList.remove('open');
}

// IN-PLACE RESOLVED TAG REPLACEMENT
function handleCloseTicket(btnElement) {
  if (!btnElement) return;
  const parentTd = btnElement.parentElement;
  if (!parentTd) return;

  parentTd.innerHTML = `<span class="wf-tag" style="background: #000; color: #fff; font-weight: bold; font-size: 0.75rem; padding: 0.35rem 0.6rem;">[ ✅ RESOLVED ]</span>`;
}

function toggleExpandTicket(ticketId) {
  openTicketHoverModal(ticketId);
}

// Sidebar Navigation Switcher Function
function switchSidebarSection(sectionId) {
  const sections = document.querySelectorAll('.view-section');
  const links = document.querySelectorAll('.sidebar-link');

  sections.forEach(s => s.classList.remove('active'));
  links.forEach(l => l.classList.remove('active'));

  const targetSection = document.getElementById(sectionId);
  if (targetSection) targetSection.classList.add('active');

  const activeLink = document.querySelector(`.sidebar-link[data-section="${sectionId}"]`);
  if (activeLink) activeLink.classList.add('active');
}

// ADMIN EDIT UNIT INFORMATION & PHOTO MODAL HANDLERS
function openAdminEditUnitModal(roomNum) {
  const room = ROOMS.find(r => r.num === roomNum);
  if (!room) return;

  document.getElementById('admin-edit-unit-title').textContent = `⚙️ [ ADMIN: EDIT ROOM ${room.num} INFORMATION & PHOTO ]`;
  document.getElementById('edit-unit-num-hidden').value = room.num;
  document.getElementById('edit-unit-type').value = room.type;
  document.getElementById('edit-unit-price').value = room.price;
  document.getElementById('edit-unit-occupants-max').value = room.maxOccupants || 3;
  document.getElementById('edit-unit-status').value = room.status;
  document.getElementById('edit-unit-desc').value = room.desc;

  const photoUrlInput = document.getElementById('edit-unit-photo-url');
  const previewBox = document.getElementById('unit-photo-preview-box');

  const currentPhoto = room.photo || `room${room.num}_photo.jpg`;
  if (photoUrlInput) photoUrlInput.value = currentPhoto;
  if (previewBox) previewBox.innerHTML = `📷<br><code>${currentPhoto}</code>`;

  document.getElementById('admin-edit-unit-modal').classList.add('open');
}

function previewUnitPhotoFile(input) {
  const previewBox = document.getElementById('unit-photo-preview-box');
  const urlInput = document.getElementById('edit-unit-photo-url');

  if (input.files && input.files[0]) {
    const file = input.files[0];
    if (urlInput) urlInput.value = file.name;

    const reader = new FileReader();
    reader.onload = function(e) {
      if (previewBox) {
        previewBox.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">`;
      }
    };
    reader.readAsDataURL(file);
  }
}

function closeAdminEditUnitModal() {
  document.getElementById('admin-edit-unit-modal').classList.remove('open');
}

function handleAdminSaveUnit(e) {
  e.preventDefault();
  const roomNum = document.getElementById('edit-unit-num-hidden').value;
  const room = ROOMS.find(r => r.num === roomNum);
  if (!room) return;

  room.type = document.getElementById('edit-unit-type').value;
  room.price = parseFloat(document.getElementById('edit-unit-price').value);
  room.maxOccupants = parseInt(document.getElementById('edit-unit-occupants-max').value);
  room.status = document.getElementById('edit-unit-status').value;
  room.desc = document.getElementById('edit-unit-desc').value;
  room.photo = document.getElementById('edit-unit-photo-url').value.trim() || `room${room.num}_photo.jpg`;

  closeAdminEditUnitModal();
  renderPublicRooms('all', 'all');
  renderAdminMatrix();
  alert(`[ ROOM ${room.num} SPECS & PHOTO SAVED ]\nUnit specs, rate (₱${room.price.toLocaleString()}), status, and Photo (${room.photo}) updated successfully.`);
}

// FLOATING TOP-RIGHT CHATHEAD INBOX WIDGET HANDLERS
function toggleFloatingChathead() {
  const widget = document.getElementById('floating-chathead-widget');
  if (!widget) return;

  const isHidden = widget.style.display === 'none' || !widget.style.display;
  if (isHidden) {
    widget.style.display = 'block';
    renderInquirersList();
    renderChatheadHistory();
  } else {
    widget.style.display = 'none';
  }
}

function renderInquirersList() {
  const container = document.getElementById('inquirers-list-container');
  const badge = document.getElementById('chat-unread-badge');
  if (!container) return;

  container.innerHTML = '';
  let unreadCount = 0;

  activeInquirers.forEach(inq => {
    if (inq.unread) unreadCount++;

    const item = document.createElement('div');
    item.className = `inquirer-item ${inq.id === selectedInquirerId ? 'active' : ''}`;
    item.onclick = () => selectInquirer(inq.id);

    item.innerHTML = `
      <div style="font-weight: bold;">👤 ${inq.name}</div>
      <div style="font-size: 0.65rem;">Room ${inq.room} (${inq.type})</div>
      ${inq.unread ? '<span style="background: red; color: #fff; padding: 0 4px; font-size: 0.6rem; border-radius: 2px;">NEW</span>' : ''}
    `;

    container.appendChild(item);
  });

  if (badge) {
    badge.textContent = unreadCount > 0 ? `${unreadCount} New` : '0 Unread';
  }
}

function selectInquirer(inqId) {
  selectedInquirerId = inqId;
  const inq = activeInquirers.find(i => i.id === inqId);
  if (inq) inq.unread = false;

  renderInquirersList();
  renderChatheadHistory();
}

function renderChatheadHistory() {
  const box = document.getElementById('chathead-history-box');
  const subject = document.getElementById('active-chathead-subject');
  if (!box || !subject) return;

  const inq = activeInquirers.find(i => i.id === selectedInquirerId);
  if (!inq) return;

  subject.innerHTML = `💬 <strong>${inq.name}</strong> (Inquiring Room ${inq.room} — ₱${inq.price.toLocaleString()}/mo)`;

  box.innerHTML = '';
  inq.messages.forEach(msg => {
    const isInquirer = msg.sender === 'Inquirer';
    const div = document.createElement('div');
    div.style.marginBottom = '0.5rem';
    div.style.textAlign = isInquirer ? 'left' : 'right';

    div.innerHTML = `
      <div style="display: inline-block; max-width: 85%; border: 1px solid #000; padding: 0.35rem 0.6rem; background: ${isInquirer ? '#fff' : '#000'}; color: ${isInquirer ? '#000' : '#fff'}; font-family: var(--font-sans);">
        <div style="font-family: var(--font-mono); font-size: 0.65rem; margin-bottom: 0.15rem; text-transform: uppercase;">
          ${isInquirer ? '👤 ' + inq.name : '👵 Mrs. Fe Galang Da Silva'} • ${msg.time}
        </div>
        <div>${msg.text}</div>
      </div>
    `;
    box.appendChild(div);
  });

  box.scrollTop = box.scrollHeight;
}

function handleSendChatheadMessage(e) {
  e.preventDefault();
  const input = document.getElementById('chathead-input-text');
  const text = input.value.trim();
  if (!text) return;

  const inq = activeInquirers.find(i => i.id === selectedInquirerId);
  if (!inq) return;

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  inq.messages.push({
    sender: 'Landlady',
    time: now,
    text: text
  });

  input.value = '';
  renderChatheadHistory();
}

// Automatic Quick Test Login Functions
function autoLoginAdmin() {
  document.getElementById('admin-username').value = 'admin';
  document.getElementById('admin-password').value = 'admin123';
  currentUser = {
    name: 'Fe Galang Da Silva',
    role: 'admin'
  };
  updateNavigationState();
  switchSidebarSection('overview-section');
}

function autoLoginTenant() {
  document.getElementById('modal-tenant-username').value = '204';
  document.getElementById('modal-tenant-password').value = 'tenant123';
  currentUser = {
    name: 'Juan Dela Cruz',
    role: 'tenant',
    room: '204'
  };
  closeTenantModal();
  updateNavigationState();
  switchSidebarSection('payment-section');
}

function autoLoginGuest() {
  document.getElementById('modal-guest-name').value = 'Maria Santos';
  currentUser = {
    name: 'Maria Santos',
    role: 'guest'
  };
  const inquiryNameInput = document.getElementById('inquiry-visitor-name');
  if (inquiryNameInput) inquiryNameInput.value = 'Maria Santos';
  closeGuestModal();
  updateNavigationState();
  switchSidebarSection('booking-section');
}

// Dynamic Supplier Item Row Form Handler
function initSupplierForm() {
  const container = document.getElementById('supplier-items-container');
  if (!container) return;
  container.innerHTML = '';
  supplierItemCount = 0;
  addSupplierItemRow('Wilcon Depot (bh)', 'BH', 2500, '8');
}

function addSupplierItemRow(defSupplier = '', defArea = 'BH', defAmount = '', defCat = '7') {
  const container = document.getElementById('supplier-items-container');
  if (!container) return;

  supplierItemCount++;
  const rowId = `supplier-row-${supplierItemCount}`;

  const itemDiv = document.createElement('div');
  itemDiv.className = 'supplier-item-card';
  itemDiv.id = rowId;
  itemDiv.style.cssText = 'border: 1px solid #000; padding: 0.75rem; background: var(--bw-box-bg); margin-bottom: 0.75rem; position: relative;';

  itemDiv.innerHTML = `
    <div style="font-family: var(--font-mono); font-size: 0.75rem; font-weight: bold; margin-bottom: 0.5rem; display: flex; justify-content: space-between;">
      <span>🧾 SUPPLIER / RECEIPT RECEIPT #${supplierItemCount}:</span>
      ${supplierItemCount > 1 ? `<button type="button" onclick="removeSupplierItemRow('${rowId}')" style="background:none; border:none; color:red; cursor:pointer; font-weight:bold;">[ X Remove ]</button>` : ''}
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;">
      <div>
        <label class="form-label">OR / Supplier Description:</label>
        <input type="text" class="form-control supplier-desc" placeholder="e.g. Wilcon Depot (bh)" value="${defSupplier}" required>
      </div>
      <div>
        <label class="form-label">Property Area Allocation:</label>
        <select class="form-control supplier-area" required>
          <option value="BH" ${defArea === 'BH' ? 'selected' : ''}>Boarding House Expenses</option>
          <option value="MainHouse" ${defArea === 'MainHouse' ? 'selected' : ''}>Main House Expenses</option>
          <option value="Front" ${defArea === 'Front' ? 'selected' : ''}>Front Apartment Expenses</option>
          <option value="Back" ${defArea === 'Back' ? 'selected' : ''}>Back Apartment Expenses</option>
          <option value="Other" ${defArea === 'Other' ? 'selected' : ''}>Other Expenses / Personal</option>
        </select>
      </div>
      <div>
        <label class="form-label">Amount (₱):</label>
        <input type="number" class="form-control supplier-amount" placeholder="1500" value="${defAmount}" required>
      </div>
      <div>
        <label class="form-label">Category ID (10 Categories):</label>
        <select class="form-control supplier-cat" required>
          <option value="1" ${defCat === '1' ? 'selected' : ''}>1 - Supplies</option>
          <option value="2" ${defCat === '2' ? 'selected' : ''}>2 - Taxes and Licenses</option>
          <option value="3" ${defCat === '3' ? 'selected' : ''}>3 - Janitorial & Messengerial</option>
          <option value="4" ${defCat === '4' ? 'selected' : ''}>4 - Depreciation</option>
          <option value="5" ${defCat === '5' ? 'selected' : ''}>5 - Professional Fees</option>
          <option value="6" ${defCat === '6' ? 'selected' : ''}>6 - Salaries: Michelle</option>
          <option value="7" ${defCat === '7' ? 'selected' : ''}>7 - Communication, Light, Water</option>
          <option value="8" ${defCat === '8' ? 'selected' : ''}>8 - Repairs and Maintenance</option>
          <option value="9" ${defCat === '9' ? 'selected' : ''}>9 - Fuel and Oil</option>
          <option value="10" ${defCat === '10' ? 'selected' : ''}>10 - Others</option>
        </select>
      </div>
    </div>
  `;

  container.appendChild(itemDiv);
}

function removeSupplierItemRow(rowId) {
  const el = document.getElementById(rowId);
  if (el) el.remove();
}

function handleExpenseEntrySubmit(e) {
  e.preventDefault();
  const dateVal = document.getElementById('expense-date').value;

  const itemCards = document.querySelectorAll('.supplier-item-card');
  if (itemCards.length === 0) return;

  const catNames = {
    '1': 'Supplies', '2': 'Taxes & Licenses', '3': 'Janitorial', '4': 'Depreciation',
    '5': 'Professional Fees', '6': 'Salaries: Michelle', '7': 'Comm, Light, Water',
    '8': 'Repairs & Maintenance', '9': 'Fuel & Oil', '10': 'Others'
  };

  const newItems = [];
  itemCards.forEach(card => {
    const desc = card.querySelector('.supplier-desc').value.trim();
    const area = card.querySelector('.supplier-area').value;
    const amount = parseFloat(card.querySelector('.supplier-amount').value) || 0;
    const catId = card.querySelector('.supplier-cat').value;

    if (desc && amount > 0) {
      newItems.push({
        supplier: desc,
        area: area,
        amount: amount,
        catId: catId,
        catName: catNames[catId] || 'Others'
      });
    }
  });

  if (newItems.length === 0) return;

  let existingDateEntry = expenseLedger.find(entry => entry.date === dateVal);

  if (existingDateEntry) {
    existingDateEntry.items.push(...newItems);
  } else {
    expenseLedger.unshift({
      date: dateVal,
      items: newItems
    });
  }

  initSupplierForm();
  renderExpenseLedger();

  alert(`[ EXPENSES LOGGED FOR DATE ${dateVal} ]\nLogged ${newItems.length} supplier receipt(s) under merged date ${dateVal}.`);
}

function renderExpenseLedger() {
  const tbody = document.getElementById('expense-ledger-rows');
  if (!tbody) return;

  tbody.innerHTML = '';

  expenseLedger.forEach(entry => {
    const rowCount = entry.items.length;

    entry.items.forEach((item, i) => {
      const tr = document.createElement('tr');

      let dateTdHTML = '';
      if (i === 0) {
        dateTdHTML = `<td rowspan="${rowCount}" style="vertical-align: top; background: var(--bw-box-bg); border-right: 2px solid #000;">
          <strong style="font-family: var(--font-mono); font-size: 0.95rem;"><code>${entry.date}</code></strong><br>
          <span style="font-size: 0.7rem; color: var(--bw-text-muted);">[ ${rowCount} Receipts Merged ]</span>
        </td>`;
      }

      tr.innerHTML = `
        ${dateTdHTML}
        <td><strong>${item.supplier}</strong></td>
        <td>${item.area === 'BH' ? '₱' + item.amount.toLocaleString() : '-'}</td>
        <td>${item.area === 'MainHouse' ? '₱' + item.amount.toLocaleString() : '-'}</td>
        <td>${item.area === 'Front' ? '₱' + item.amount.toLocaleString() : '-'}</td>
        <td>${item.area === 'Back' ? '₱' + item.amount.toLocaleString() : '-'}</td>
        <td>${item.area === 'Other' ? '₱' + item.amount.toLocaleString() : '-'}</td>
        <td><span class="wf-tag">Cat ${item.catId}</span></td>
        <td><strong>₱${item.amount.toLocaleString()}</strong></td>
      `;

      tbody.appendChild(tr);
    });
  });
}

function handleAdminLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('admin-username').value.trim().toLowerCase();
  const passwordInput = document.getElementById('admin-password').value;

  if ((usernameInput === 'admin' || usernameInput === 'staff') && passwordInput === 'admin123') {
    const isSuperAdmin = usernameInput === 'admin';
    currentUser = {
      name: isSuperAdmin ? 'Fe Galang Da Silva' : 'Staff User',
      role: isSuperAdmin ? 'admin' : 'staff'
    };

    updateNavigationState();
    switchSidebarSection('overview-section');
  } else {
    alert('Invalid credentials! Please use "admin" or "staff" with password "admin123".');
  }
}

function openTenantModal() {
  document.getElementById('tenant-login-modal').classList.add('open');
}

function closeTenantModal() {
  document.getElementById('tenant-login-modal').classList.remove('open');
}

function openGuestModal() {
  document.getElementById('guest-entry-modal').classList.add('open');
}

function closeGuestModal() {
  document.getElementById('guest-entry-modal').classList.remove('open');
}

function openOnsitePaymentRecordModal() {
  switchSidebarSection('payment-section');
}

function closeOnsitePaymentRecordModal() {
  document.getElementById('onsite-payment-modal').classList.remove('open');
}

function handleOnsitePaymentSubmit(e) {
  e.preventDefault();
  alert('[ ON-SITE CASH PAYMENT RECORDED ]\nCash payment collected in-person by landlady has been logged.');
  closeOnsitePaymentRecordModal();
}

function handleModalTenantLogin(e) {
  e.preventDefault();
  const tenantUser = document.getElementById('modal-tenant-username').value.trim().toLowerCase();
  const passwordInput = document.getElementById('modal-tenant-password').value;

  if ((tenantUser === '204' || tenantUser === 'juan') && passwordInput === 'tenant123') {
    currentUser = {
      name: 'Juan Dela Cruz',
      role: 'tenant',
      room: '204'
    };

    closeTenantModal();
    updateNavigationState();
    switchSidebarSection('payment-section');
  } else {
    alert('Invalid Tenant Credentials! Demo: Room "204" and Password "tenant123".');
  }
}

function handleModalGuestEntry(e) {
  e.preventDefault();
  const guestName = document.getElementById('modal-guest-name').value.trim();
  if (!guestName) return;

  currentUser = {
    name: guestName,
    role: 'guest'
  };

  const inquiryNameInput = document.getElementById('inquiry-visitor-name');
  if (inquiryNameInput) inquiryNameInput.value = guestName;

  closeGuestModal();
  updateNavigationState();
  switchSidebarSection('booking-section');
}

function handleLogout() {
  currentUser = null;
  document.getElementById('app-sidebar').style.display = 'none';
  document.getElementById('main-viewport').style.marginLeft = '0';
  document.getElementById('main-viewport').style.maxWidth = '100%';
  
  const adminForm = document.getElementById('admin-login-form');
  const modalTenantForm = document.getElementById('modal-tenant-login-form');
  const modalGuestForm = document.getElementById('modal-guest-entry-form');

  if (adminForm) adminForm.reset();
  if (modalTenantForm) modalTenantForm.reset();
  if (modalGuestForm) modalGuestForm.reset();
  
  switchSidebarSection('auth-view');
}

function updateNavigationState() {
  const sidebar = document.getElementById('app-sidebar');
  const viewport = document.getElementById('main-viewport');
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');

  const navTenantMgmt = document.getElementById('nav-item-tenant-mgmt');
  const navExpenses = document.getElementById('nav-item-expenses');
  const navSettings = document.getElementById('nav-item-settings');
  const navPayment = document.getElementById('nav-item-payment');

  const bookingHeaderTitle = document.getElementById('booking-header-title');
  const bookingHeaderDesc = document.getElementById('booking-header-desc');

  const tenantSubmitBox = document.getElementById('tenant-submit-ticket-box');
  const adminDispatchBox = document.getElementById('admin-dispatch-ticket-box');
  const ticketingGrid = document.getElementById('ticketing-grid-container');

  if (!currentUser) {
    sidebar.style.display = 'none';
    viewport.style.marginLeft = '0';
    viewport.style.maxWidth = '100%';
    return;
  }

  sidebar.style.display = 'flex';
  viewport.style.marginLeft = 'var(--sidebar-width)';
  viewport.style.maxWidth = 'calc(100vw - var(--sidebar-width))';

  nameEl.textContent = currentUser.name;
  roleEl.textContent = `Role: ${currentUser.role.toUpperCase()}`;

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'staff';

  if (bookingHeaderTitle && bookingHeaderDesc) {
    if (isAdmin) {
      bookingHeaderTitle.textContent = '⚙️ ROOM UNITS & INVENTORY CONTROL (ADMIN ROLE)';
      bookingHeaderDesc.innerHTML = 'Click any room unit below to <strong>Edit Unit Specs, Rates & Upload Photo</strong>.';
    } else {
      bookingHeaderTitle.textContent = '📅 BOOKING & ROOM SHOWCASE PORTAL';
      bookingHeaderDesc.innerHTML = 'Click any room below to view <strong>Full Specifications</strong>. Click <strong>[ Inquire Room ]</strong> to open a <strong>Direct Live Chat with the Landlady</strong>!';
    }
  }

  // Role-Based Ticketing Section Visibility Rules
  if (tenantSubmitBox && adminDispatchBox && ticketingGrid) {
    if (isAdmin) {
      tenantSubmitBox.style.display = 'none'; // Landlady sees Maintenance Dispatch Only!
      adminDispatchBox.style.display = 'block';
      ticketingGrid.style.gridTemplateColumns = '1fr';
    } else {
      tenantSubmitBox.style.display = 'block'; // Tenants see Submit Form + Dispatch
      adminDispatchBox.style.display = 'block';
      ticketingGrid.style.gridTemplateColumns = '1fr 1fr';
    }
  }

  // Role-Based Sidebar Item Visibility Rules
  if (isAdmin) {
    navTenantMgmt.style.display = 'block';
    navExpenses.style.display = 'block';
    navSettings.style.display = 'block';
    navPayment.style.display = 'block';
  } else if (currentUser.role === 'tenant') {
    navTenantMgmt.style.display = 'none';
    navExpenses.style.display = 'none';
    navSettings.style.display = 'block';
    navPayment.style.display = 'block';
  } else if (currentUser.role === 'guest') {
    navTenantMgmt.style.display = 'none';
    navExpenses.style.display = 'none';
    navSettings.style.display = 'none';
    navPayment.style.display = 'none';
  }

  renderPublicRooms('all', 'all');
}

// Render Public & Admin Wireframe Room Cards with Unit Photos
function renderPublicRooms(floorFilter, statusFilter) {
  const container = document.getElementById('public-room-grid');
  if (!container) return;

  container.innerHTML = '';

  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'staff');

  const filtered = ROOMS.filter(r => {
    const matchFloor = (floorFilter === 'all' || r.floor.toString() === floorFilter);
    const matchStatus = (statusFilter === 'all' || (statusFilter === 'available' && r.status === 'available'));
    return matchFloor && matchStatus;
  });

  filtered.forEach(room => {
    const card = document.createElement('div');
    card.className = 'room-card';
    card.style.cursor = 'pointer';

    if (isAdmin) {
      card.onclick = () => openAdminEditUnitModal(room.num);
    } else {
      card.onclick = () => openRoomDetailModal(room.num);
    }

    const isAvailable = room.status === 'available';
    const badgeText = isAvailable ? '[ AVAILABLE ]' : '[ OCCUPIED ]';
    const roomPhotoName = room.photo || `room${room.num}_photo.jpg`;

    let actionButtonHTML = '';
    if (isAdmin) {
      actionButtonHTML = `<button class="btn-primary btn-sm" onclick="event.stopPropagation(); openAdminEditUnitModal('${room.num}')">⚙️ [ Edit Unit Info & Photo ]</button>`;
    } else if (isAvailable) {
      actionButtonHTML = `<button class="btn-primary btn-sm" onclick="event.stopPropagation(); openRoomDetailModal('${room.num}')">[ View Specs & Inquire ]</button>`;
    } else {
      actionButtonHTML = `<button class="btn-secondary btn-sm" disabled style="opacity: 0.5;">[ Occupied ]</button>`;
    }

    card.innerHTML = `
      <div class="room-image-placeholder" style="flex-direction: column; text-align: center; justify-content: center; gap: 0.25rem;">
        <span style="font-size: 1.2rem;">📷</span>
        <strong style="font-size: 0.75rem;">[ ${roomPhotoName} ]</strong>
        <span style="font-size: 0.65rem; color: #666;">${isAdmin ? '(Click to Change Photo)' : '(Unit Photo)'}</span>
      </div>
      <div style="font-family: var(--font-mono); font-size: 0.75rem; font-weight: bold; margin-bottom: 0.25rem;">
        FLOOR ${room.floor} • ROOM ${room.num}
      </div>
      <h3 class="room-title">${room.type} Unit</h3>
      <div class="room-price">₱${room.price.toLocaleString()} <span style="font-size: 0.75rem; font-weight: normal;">/ month</span></div>
      <div style="font-size: 0.75rem; font-family: var(--font-mono); margin-bottom: 0.75rem;">
        Status: ${badgeText}<br>
        Max Occ: ${room.maxOccupants || 3} Persons | Water: ₱200/head
      </div>
      ${actionButtonHTML}
    `;
    container.appendChild(card);
  });
}

function initFilterChips() {
  const floorChips = document.querySelectorAll('.filter-chip[data-floor]');
  const statusChips = document.querySelectorAll('.filter-chip[data-status]');

  let currentFloor = 'all';
  let currentStatus = 'all';

  floorChips.forEach(chip => {
    chip.addEventListener('click', () => {
      floorChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFloor = chip.getAttribute('data-floor');
      renderPublicRooms(currentFloor, currentStatus);
    });
  });

  statusChips.forEach(chip => {
    chip.addEventListener('click', () => {
      statusChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentStatus = chip.getAttribute('data-status');
      renderPublicRooms(currentFloor, currentStatus);
    });
  });
}

function renderAdminMatrix() {
  const f1 = document.getElementById('admin-matrix-f1');
  const f2 = document.getElementById('admin-matrix-f2');
  const f3 = document.getElementById('admin-matrix-f3');

  if (!f1 || !f2 || !f3) return;

  f1.innerHTML = ''; f2.innerHTML = ''; f3.innerHTML = '';

  ROOMS.forEach(room => {
    const box = document.createElement('div');
    box.className = `matrix-room-box status-${getAdminStatusClass(room.status)}`;
    box.onclick = () => {
      switchSidebarSection('payment-section');
      selectPaymentUnit(room.num);
    };

    box.innerHTML = `
      <div class="matrix-room-num">Rm ${room.num}</div>
      <div class="matrix-room-type">${room.type}</div>
    `;

    if (room.floor === 1) f1.appendChild(box);
    else if (room.floor === 2) f2.appendChild(box);
    else if (room.floor === 3) f3.appendChild(box);
  });
}

function getAdminStatusClass(status) {
  if (status === 'occupied') return 'paid';
  if (status === 'pending') return 'pending';
  if (status === 'overdue') return 'overdue';
  return 'vacant';
}

function selectPaymentUnit(unitNum) {
  const select = document.getElementById('income-unit-select');
  if (select) {
    select.value = unitNum;
    onIncomeUnitChange(unitNum);
  }
}

function populateIncomeUnitSelect() {
  const select = document.getElementById('income-unit-select');
  if (!select) return;

  const clusters = [
    { group: 'BH (Main Rooms)', units: ['1a', '1b', '1c', '1d', '1e', '1f', '1g', '1h', '2a', '2b', '2c', '2d', '2e', '2f', '2g', '3a', '3b', '3c', '3d', '3e', '3f', '3g', '101', '102', '103', '104', '105', '106', '107', '108', '109', '110', '201', '202', '203', '204', '205', '206', '207', '208', '209', '210', '211', '301', '302', '303', '304', '305', '306', '307', '308', '309', '310', '311'] },
    { group: 'Back Apartment', units: ['B1F', 'B2F', 'B2B', 'B3F', 'B3B'] },
    { group: 'Penthouse', units: ['PH'] },
    { group: 'Front Apartment', units: ['F1', 'F2F', 'F2B'] },
    { group: 'Linda Units', units: ['LF', 'LB'] }
  ];

  select.innerHTML = '';
  clusters.forEach(c => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = `[ CLUSTER: ${c.group} ]`;
    c.units.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = `Unit ${u}`;
      if (u === '204') opt.selected = true;
      optgroup.appendChild(opt);
    });
    select.appendChild(optgroup);
  });
}

function onIncomeUnitChange(unitVal) {
  const matchingRoom = ROOMS.find(r => r.num === unitVal);
  if (matchingRoom) {
    document.getElementById('income-tenant-name').value = matchingRoom.tenant || 'Vacant Tenant';
    document.getElementById('income-rent-amount').value = matchingRoom.price;
    document.getElementById('income-occupants').value = matchingRoom.occupants || 1;
  }

  if (unitVal === 'LF' || unitVal === 'LB') {
    document.getElementById('income-rent-amount').value = 3500;
    document.getElementById('income-occupants').value = 1;
    document.getElementById('income-water').value = (unitVal === 'LF' ? 400 : 200);
  }

  calculateIncomeAmounts();
}

function calculateIncomeAmounts() {
  const rent = parseFloat(document.getElementById('income-rent-amount').value) || 0;
  const occupants = parseInt(document.getElementById('income-occupants').value) || 0;
  const unitVal = document.getElementById('income-unit-select').value;
  
  let water = occupants * 200;
  if (unitVal === 'LF') water = 400;
  else if (unitVal === 'LB') water = 200;

  document.getElementById('income-water').value = water;

  const share50 = rent / 2;
  const remitted = rent + water;

  document.getElementById('calc-50-share').textContent = `₱${share50.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
  document.getElementById('calc-remitted').textContent = `₱${remitted.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
}

function toggleIncomePaymentMethod() {
  const methodSelect = document.getElementById('income-payment-method');
  const refContainer = document.getElementById('income-ref-container');
  const refInput = document.getElementById('income-reference-num');

  if (!methodSelect || !refContainer || !refInput) return;

  if (methodSelect.value === 'Online') {
    refContainer.style.display = 'block';
    refInput.required = true;
  } else {
    refContainer.style.display = 'none';
    refInput.required = false;
    refInput.value = '';
  }
}

function handleIncomeEntrySubmit(e) {
  e.preventDefault();
  const unit = document.getElementById('income-unit-select').value;
  const date = document.getElementById('income-date-paid').value;
  const invoiceNum = document.getElementById('income-invoice-num').value.trim();
  const contact = document.getElementById('income-tenant-name').value.trim();
  const rent = parseFloat(document.getElementById('income-rent-amount').value);
  const occupants = parseInt(document.getElementById('income-occupants').value);
  const water = parseFloat(document.getElementById('income-water').value);
  const paymentMethod = document.getElementById('income-payment-method').value;
  const refInputVal = document.getElementById('income-reference-num').value.trim();

  if (paymentMethod === 'Online' && !refInputVal) {
    alert('[ REFERENCE NUMBER REQUIRED ]\nLandlady must enter a Reference Number when Payment Method is Online.');
    return;
  }

  const referenceNum = paymentMethod === 'Online' ? refInputVal : 'N/A';

  if (unit !== 'LF' && unit !== 'LB' && water !== occupants * 200) {
    if (!confirm(`[ WATER BILLING MISMATCH WARNING (BR-036) ]\nExpected ₱${occupants * 200} (Occupants ${occupants} × ₱200). You entered ₱${water}.\nDo you want to proceed anyway?`)) {
      return;
    }
  }

  incomeLedger.unshift({
    unit,
    date,
    invoiceNum,
    contact,
    period: 'Aug.1-Aug.31/26',
    rent,
    share: rent / 2,
    occupants,
    water,
    remitted: rent + water,
    paymentMethod,
    referenceNum
  });

  const matchingRoom = ROOMS.find(r => r.num === unit);
  if (matchingRoom) {
    matchingRoom.paid = true;
    matchingRoom.status = 'occupied';
    matchingRoom.balance = 0;
  }

  renderIncomeLedger();
  renderAdminMatrix();

  alert(`[ MONTHLY PAYMENT RECORDED & REFLECTED ]\nUnit ${unit} payment recorded with Invoice #${invoiceNum}.\nPayment Method: ${paymentMethod}${paymentMethod === 'Online' ? ` (Ref #${referenceNum})` : ''}\nRemitted Amount: ₱${(rent + water).toLocaleString()} added to the Monthly Income Report table at the bottom.`);
}

function renderIncomeLedger() {
  const tbody = document.getElementById('income-ledger-rows');
  if (!tbody) return;

  tbody.innerHTML = '';
  incomeLedger.forEach(row => {
    const tr = document.createElement('tr');
    const isOnline = row.paymentMethod === 'Online';
    const methodBadge = isOnline
      ? '<span class="wf-tag" style="background: #000; color: #fff;">ONLINE</span>'
      : '<span class="wf-tag" style="background: #e0e0e0; color: #000;">CASH</span>';
    const refDisplay = isOnline && row.referenceNum && row.referenceNum !== 'N/A'
      ? `<code>${row.referenceNum}</code>`
      : '<span style="color: var(--bw-text-muted);">N/A</span>';

    tr.innerHTML = `
      <td><strong>Unit ${row.unit}</strong></td>
      <td><code>${row.date}</code></td>
      <td><strong>${row.contact}</strong></td>
      <td><span class="wf-tag" style="background: #000; color: #fff;">${row.invoiceNum || 'INV-1001'}</span></td>
      <td><small>${row.period}</small></td>
      <td>₱${row.rent.toLocaleString()}</td>
      <td>₱${row.share.toLocaleString()}</td>
      <td>${row.occupants}</td>
      <td>₱${row.water.toLocaleString()}</td>
      <td><strong>₱${row.remitted.toLocaleString()}</strong></td>
      <td>${methodBadge}</td>
      <td>${refDisplay}</td>
    `;
    tbody.appendChild(tr);
  });
}

function exportIncomeReportExcel() {
  alert('[ EXCEL REPORT EXPORTED (BR-049 / FR-044) ]\nMonthly Income Report spreadsheet downloaded in canonical cluster format (BH, Back, Penthouse, Front, Linda).');
}

function exportExpensesReportExcel() {
  alert('[ EXCEL EXPENSES LEDGER EXPORTED (BR-049 / FR-044) ]\nMonthly Expenses Ledger spreadsheet downloaded with 5 Property Area columns and running year-to-date category totals.');
}

function openRoomDetailModal(roomNum) {
  const room = ROOMS.find(r => r.num === roomNum);
  if (!room) return;

  const modal = document.getElementById('room-detail-modal');
  const title = document.getElementById('detail-room-title');
  const body = document.getElementById('detail-room-body');
  const btnInquire = document.getElementById('btn-detail-inquire');

  title.textContent = `[ FULL SPECIFICATIONS — ROOM ${room.num} (${room.type.toUpperCase()}) ]`;

  const isAvailable = room.status === 'available';
  const statusBadge = isAvailable 
    ? '<span class="wf-tag" style="background: #000; color: #fff;">[ AVAILABLE FOR LEASE ]</span>'
    : '<span class="wf-tag" style="background: #eee;">[ CURRENTLY OCCUPIED ]</span>';

  body.innerHTML = `
    <div style="border-bottom: 1px dashed #000; padding-bottom: 0.75rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-family: var(--font-mono); font-size: 1.2rem; font-weight: bold;">ROOM ${room.num} (${room.type} Unit)</div>
        <div style="font-size: 0.85rem;"><strong>Location:</strong> ${room.floor}nd Floor, Fe Galang Da Silva Boarding House</div>
      </div>
      <div>${statusBadge}</div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.85rem; margin-bottom: 1rem;">
      <div style="border: 1px solid #000; padding: 0.75rem; background: var(--bw-box-bg);">
        <strong style="font-family: var(--font-mono);">💰 FINANCIAL RATES:</strong>
        <div class="bill-line" style="margin-top: 0.35rem;">
          <span>Monthly Base Rent:</span>
          <strong>₱${room.price.toLocaleString()}/mo</strong>
        </div>
        <div class="bill-line">
          <span>Water Rate (BR-014):</span>
          <span>₱200/head</span>
        </div>
        <div class="bill-line">
          <span>Electricity Metering:</span>
          <span>Private Sub-meter</span>
        </div>
        <div class="bill-line">
          <span>Move-In Deposit:</span>
          <span>1 Month Rent (₱${room.price.toLocaleString()})</span>
        </div>
      </div>

      <div style="border: 1px solid #000; padding: 0.75rem; background: var(--bw-box-bg);">
        <strong style="font-family: var(--font-mono);">🏢 UNIT SPECIFICATIONS:</strong>
        <ul style="padding-left: 1.25rem; margin-top: 0.35rem; line-height: 1.5;">
          <li><strong>Occupants Limit:</strong> Up to ${room.maxOccupants} Persons</li>
          <li><strong>Current Tenant:</strong> ${room.tenant || 'Vacant Unit'}</li>
          <li><strong>Bathroom:</strong> Private en-suite bathroom</li>
          <li><strong>Unit Photo:</strong> ${room.photo || 'room_default.jpg'}</li>
        </ul>
      </div>
    </div>

    <div style="border: 1px dashed #000; padding: 0.75rem; font-size: 0.85rem; background: #fff;">
      <strong>DESCRIPTION & NOTES:</strong><br>
      <p style="margin-top: 0.25rem; font-style: italic;">"${room.desc}"</p>
    </div>
  `;

  btnInquire.onclick = () => {
    closeRoomDetailModal();
    toggleFloatingChathead();
  };

  modal.classList.add('open');
}

function closeRoomDetailModal() {
  document.getElementById('room-detail-modal').classList.remove('open');
}

function openInquiryModal(roomNum) {
  if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'staff')) {
    openAdminEditUnitModal(roomNum);
  } else {
    openRoomDetailModal(roomNum);
  }
}

function closeInquiryModal() {
  closeRoomDetailModal();
}

function openPaymentModal() {
  document.getElementById('payment-modal').classList.add('open');
}

function closePaymentModal() {
  document.getElementById('payment-modal').classList.remove('open');
}

function confirmPaymentSimulation() {
  alert('[ OPTIONAL GCASH PAYMENT SUBMITTED ]\n₱6,900.00 payment reference sent to Admin for verification.');
  closePaymentModal();
}

function handleIssueSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('issue-title').value;
  alert(`[ TICKET SUBMITTED ]\nTicket "${title}" sent to Administrator.`);
  document.getElementById('tenant-issue-form').reset();
}
