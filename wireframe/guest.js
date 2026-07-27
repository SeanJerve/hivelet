// Hivelet Guest Portal Logic (Standalone Booking, Auth, Filters, Rich Unit Showcase & Live Chat Notifications)

const ROOM_IMAGES = {
  'Studio': [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=700&q=80'
  ],
  '1-Bedroom': [
    'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=700&q=80'
  ],
  '2-Bedroom': [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=700&q=80'
  ],
  '3-Bedroom': [
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=700&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=700&q=80'
  ]
};

const UNIT_SLIDESHOWS = {
  'Studio': [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
  ],
  '1-Bedroom': [
    'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80'
  ],
  '2-Bedroom': [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80'
  ],
  '3-Bedroom': [
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80'
  ]
};

const GUEST_ROOMS = [
  // Floor 1
  { id: '101', floor: 1, num: '101', type: 'Studio', price: 5000, maxOcc: 2, size: '20', perk: '✨ Cozy Studio', status: 'occupied', amenities: ['🚿 Private Bathroom', '⚡ Electric Sub-meter', '🛏️ Single Bed Frame', '🛜 WiFi Access', '🔒 Gated Key Access'] },
  { id: '102', floor: 1, num: '102', type: 'Studio', price: 5000, maxOcc: 2, size: '22', perk: '🔥 Popular Choice', status: 'available', amenities: ['🚿 Private Bathroom', '⚡ Electric Sub-meter', '🪟 Large Window', '🛜 WiFi Access', '🛏️ Bed Frame Included'] },
  { id: '103', floor: 1, num: '103', type: '1-Bedroom', price: 6500, maxOcc: 3, size: '30', perk: '🍳 Kitchen Area', status: 'occupied', amenities: ['🚿 Private Bathroom', '⚡ Electric Sub-meter', '🍳 Separate Kitchenette', '🛜 WiFi Access', '📚 Study Desk'] },
  { id: '104', floor: 1, num: '104', type: '1-Bedroom', price: 6500, maxOcc: 3, size: '32', perk: '✨ Newly Renovated', status: 'available', amenities: ['🚿 Private Bathroom', '⚡ Electric Sub-meter', '💨 Cross Ventilation', '🛜 WiFi Access', '🍳 Separate Kitchen'] },
  { id: '105', floor: 1, num: '105', type: '2-Bedroom', price: 8500, maxOcc: 4, size: '45', perk: '👨‍👩‍👧 Family Unit', status: 'occupied', amenities: ['🚿 Private Bathroom', '⚡ Electric Sub-meter', '❄️ Aircon Provision', '🛜 WiFi Access', '🚪 Double Closet'] },
  { id: '106', floor: 1, num: '106', type: 'Studio', price: 5000, maxOcc: 2, size: '20', perk: '⚡ Ground Floor', status: 'occupied', amenities: ['🚿 Private Bathroom', '⚡ Electric Sub-meter', '🛏️ Bed Frame Included', '🛜 WiFi Access'] },
  
  // Floor 2
  { id: '201', floor: 2, num: '201', type: 'Studio', price: 5200, maxOcc: 2, size: '22', perk: '🤫 Quiet Corridor', status: 'occupied', amenities: ['🚿 Private Bathroom', '⚡ Electric Sub-meter', '🤫 Quiet Corridor View', '🛜 WiFi Access'] },
  { id: '202', floor: 2, num: '202', type: '1-Bedroom', price: 6500, maxOcc: 3, size: '32', perk: '🌅 Balcony View', status: 'available', amenities: ['🚿 Private Bathroom', '⚡ Electric Sub-meter', '🌅 Private Balcony Window', '🛜 WiFi Access', '🍳 Kitchen Area'] },
  { id: '203', floor: 2, num: '203', type: '1-Bedroom', price: 6500, maxOcc: 3, size: '30', perk: '📚 Study Nook', status: 'occupied', amenities: ['🚿 Private Bathroom', '⚡ Electric Sub-meter', '📚 Study Desk', '🛜 WiFi Access', '👕 Built-in Wardrobe'] },
  { id: '204', floor: 2, num: '204', type: '1-Bedroom', price: 6500, maxOcc: 3, size: '34', perk: '⭐ Featured Unit', status: 'available', amenities: ['🚿 Private Bathroom', '⚡ Electric Sub-meter', '🎨 Fresh Paint & Fixtures', '🛜 WiFi Access', '🍳 Kitchen Area'] },
  { id: '205', floor: 2, num: '205', type: '2-Bedroom', price: 8800, maxOcc: 4, size: '48', perk: '❄️ Aircon Ready', status: 'occupied', amenities: ['🚿 Private Bathroom', '⚡ Electric Sub-meter', '❄️ Split Aircon Provision', '🛜 WiFi Access', '🛋️ Spacious Living'] },
  { id: '211', floor: 2, num: '211', type: 'Studio', price: 5200, maxOcc: 2, size: '24', perk: '📐 Corner Studio', status: 'available', amenities: ['🚿 Private Bathroom', '⚡ Electric Sub-meter', '📐 Corner Floor Plan', '🛜 WiFi Access', '🛏️ Bed Frame'] },

  // Floor 3
  { id: '301', floor: 3, num: '301', type: 'Studio', price: 5400, maxOcc: 2, size: '24', perk: '🌬️ High Ceiling', status: 'occupied', amenities: ['🚿 Private Bathroom', '⚡ Electric Sub-meter', '🌬️ High Ceiling Airflow', '🛜 WiFi Access'] },
  { id: '303', floor: 3, num: '303', type: '1-Bedroom', price: 6800, maxOcc: 3, size: '34', perk: '🏙️ Skyline View', status: 'available', amenities: ['🚿 Private Bathroom', '⚡ Electric Sub-meter', '🏙️ Top Floor City Skyline', '🛜 WiFi Access', '✨ Fresh Bath Fixtures'] },
  { id: '304', floor: 3, num: '304', type: '2-Bedroom', price: 9000, maxOcc: 4, size: '50', perk: ' Top Floor', status: 'occupied', amenities: ['🚿 Private Bathroom', '⚡ Electric Sub-meter', '❄️ Aircon Ready', '🛜 WiFi Access', '🚪 Double Closet'] },
  { id: '310', floor: 3, num: '310', type: '3-Bedroom', price: 12000, maxOcc: 5, size: '65', perk: '👑 Penthouse Suite', status: 'occupied', amenities: ['🚿 En-Suite Master Bath', '⚡ Electric Sub-meter', '🏢 Penthouse Suite', '🛜 WiFi Access', '🌅 Balcony View'] }
];

const TICKER_HIGHLIGHTS = [
  '📍 Bulacan Prime Location',
  '★ 4.9 Star Tenant Rating',
  '⚡ Private Sub-Metered Electricity',
  '🚿 En-Suite Bathroom in Every Unit',
  '💬 Direct Landlady Instant Chat',
  '🔐 24/7 Gated Security & CCTV',
  '💸 Affordable Units From ₱5,000/mo',
  '💧 Standard Water Rate ₱200/head',
  '📶 High-Speed Internet Ready',
  '🛋️ Clean & Move-In Ready Units',
  '🔑 Simple 1-Month Deposit Terms',
  '🌿 Quiet & Safe Residential Neighborhood'
];

let loggedInGuest = null;
let pendingInquiryUnit = null;

let activeFilters = {
  floors: ['all'],
  types: ['all'],
  status: 'all'
};

// SLIDESHOW ENGINE STATE
let currentSlides = [];
let currentSlideIndex = 0;

// NOTIFICATION STATE
let unreadMessagesCount = 0;
let guestNotificationsList = [];

document.addEventListener('DOMContentLoaded', () => {
  renderRooms();
  initSmoothScrollAndActiveNav();
  initTickerHighlights();

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notif-dropdown');
    const bellBtn = document.getElementById('btn-notif-bell');
    if (dropdown && !dropdown.contains(e.target) && bellBtn && !bellBtn.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });
});

function initTickerHighlights() {
  const track = document.getElementById('ticker-track');
  if (!track) return;

  const shuffled = [...TICKER_HIGHLIGHTS].sort(() => Math.random() - 0.5);
  const fullList = [...shuffled, ...shuffled, ...shuffled];
  
  track.innerHTML = fullList.map((text) => `
    <div class="ticker-item">
      <span>${text}</span>
      <span style="color: rgba(250, 204, 21, 0.8); font-weight: bold;">•</span>
    </div>
  `).join('');
}

function unlockWelcomeGate() {
  const gate = document.getElementById('welcome-gate');
  if (!gate) return;

  gate.classList.add('unlocked');
  document.body.classList.remove('gate-locked');

  setTimeout(() => {
    const hero = document.getElementById('hero');
    if (hero) {
      hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 200);
}

function initSmoothScrollAndActiveNav() {
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetEl = document.getElementById(targetId);

      if (targetEl) {
        const navHeight = document.querySelector('.navbar').offsetHeight || 70;
        const targetPosition = targetEl.getBoundingClientRect().top + window.pageYOffset - navHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  window.addEventListener('scroll', () => {
    let currentSection = '';
    const sections = document.querySelectorAll('section[id]');
    const navHeight = document.querySelector('.navbar').offsetHeight || 70;

    sections.forEach(sec => {
      const secTop = sec.offsetTop - navHeight - 100;
      if (window.pageYOffset >= secTop) {
        currentSection = sec.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSection}`) {
        link.classList.add('active');
      }
    });
  });
}

function toggleFilterChip(category, value, el) {
  if (category === 'floor') {
    if (value === 'all') {
      activeFilters.floors = ['all'];
      document.querySelectorAll('[data-filter-category="floor"]').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
    } else {
      document.querySelector('[data-filter-category="floor"][data-value="all"]').classList.remove('active');
      
      const index = activeFilters.floors.indexOf('all');
      if (index > -1) activeFilters.floors.splice(index, 1);

      if (el.classList.contains('active')) {
        el.classList.remove('active');
        const valIndex = activeFilters.floors.indexOf(value);
        if (valIndex > -1) activeFilters.floors.splice(valIndex, 1);
        
        if (activeFilters.floors.length === 0) {
          activeFilters.floors = ['all'];
          document.querySelector('[data-filter-category="floor"][data-value="all"]').classList.add('active');
        }
      } else {
        el.classList.add('active');
        activeFilters.floors.push(value);
      }
    }
  } else if (category === 'type') {
    if (value === 'all') {
      activeFilters.types = ['all'];
      document.querySelectorAll('[data-filter-category="type"]').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
    } else {
      document.querySelector('[data-filter-category="type"][data-value="all"]').classList.remove('active');
      
      const index = activeFilters.types.indexOf('all');
      if (index > -1) activeFilters.types.splice(index, 1);

      if (el.classList.contains('active')) {
        el.classList.remove('active');
        const valIndex = activeFilters.types.indexOf(value);
        if (valIndex > -1) activeFilters.types.splice(valIndex, 1);

        if (activeFilters.types.length === 0) {
          activeFilters.types = ['all'];
          document.querySelector('[data-filter-category="type"][data-value="all"]').classList.add('active');
        }
      } else {
        el.classList.add('active');
        activeFilters.types.push(value);
      }
    }
  }

  renderRooms();
}

function toggleStatusFilter(value, el) {
  document.querySelectorAll('[data-filter-category="status"]').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  activeFilters.status = value;
  renderRooms();
}

function renderRooms() {
  const container = document.getElementById('guest-room-grid');
  if (!container) return;

  container.innerHTML = '';

  const filtered = GUEST_ROOMS.filter(room => {
    const matchFloor = activeFilters.floors.includes('all') || activeFilters.floors.includes(room.floor.toString());
    const matchType = activeFilters.types.includes('all') || activeFilters.types.includes(room.type);
    const matchStatus = activeFilters.status === 'all' || (activeFilters.status === 'available' && room.status === 'available');

    return matchFloor && matchType && matchStatus;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1rem; background: #FFF; border-radius: 16px; border: 1px dashed var(--border-light);">
        <div style="font-size: 2.8rem; margin-bottom: 0.5rem;">🔍</div>
        <h3 style="font-family: var(--font-display); font-weight: 800; margin-bottom: 0.25rem;">No Units Match Filter Combination</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Try selecting additional floors or room types from the filter bar above.</p>
      </div>
    `;
    return;
  }

  filtered.forEach((room, idx) => {
    const isAvail = room.status === 'available';
    const card = document.createElement('div');
    card.className = 'room-card';

    const imagesForType = ROOM_IMAGES[room.type] || ROOM_IMAGES['Studio'];
    const imgUrl = imagesForType[idx % imagesForType.length];

    const amenitiesHTML = room.amenities 
      ? room.amenities.map(a => `<span class="amenity-chip">${a}</span>`).join('')
      : `<span class="amenity-chip">🚿 Private Bath</span><span class="amenity-chip">⚡ Sub-meter</span>`;

    card.innerHTML = `
      <div class="room-image-wrap">
        <img src="${imgUrl}" alt="${room.type} Room ${room.num}" class="room-card-img" />
        <div class="room-img-overlay"></div>
        <div class="room-badge-status ${isAvail ? 'badge-available' : 'badge-occupied'}">
          ${isAvail ? '● Available for Move-in' : 'Occupied'}
        </div>
        ${room.perk ? `<div class="room-perk-badge">${room.perk}</div>` : ''}
        <div class="room-floor-tag">Floor ${room.floor} • Unit ${room.num}</div>
      </div>

      <div class="room-content">
        <div class="room-header-row">
          <h3 class="room-title">${room.type} Unit</h3>
          <div class="room-price-box">
            <span class="room-price">₱${room.price.toLocaleString()}</span>
            <span class="room-price-sub">/ month</span>
          </div>
        </div>

        <div class="room-size-specs">
          <span>📐 ${room.size || '22'} m²</span>
          <span>👥 Max ${room.maxOcc} Guests</span>
          <span>⚡ Metered</span>
        </div>

        <div class="room-amenities-wrap">
          ${amenitiesHTML}
        </div>

        ${isAvail 
          ? `<button class="btn-yellow room-action-btn" onclick="openInquiryModal('${room.num}', '${room.type}', ${room.price})">Inquire Unit ${room.num} →</button>` 
          : `<button class="btn-dark room-action-btn disabled-btn" disabled>Currently Occupied</button>`
        }
      </div>
    `;

    container.appendChild(card);
  });
}

function openGuestAuthModal(mode = 'signup', notice = null) {
  const modal = document.getElementById('auth-modal');
  const noticeBox = document.getElementById('auth-modal-notice');

  if (notice && noticeBox) {
    noticeBox.textContent = notice;
    noticeBox.style.display = 'block';
  } else if (noticeBox) {
    noticeBox.style.display = 'none';
  }

  switchAuthTab(mode);
  if (modal) modal.classList.add('open');
}

function closeGuestAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('open');
}

function switchAuthTab(tab) {
  const btnLogin = document.getElementById('tab-btn-login');
  const btnSignup = document.getElementById('tab-btn-signup');
  const formLogin = document.getElementById('auth-form-login');
  const formSignup = document.getElementById('auth-form-signup');

  if (tab === 'login') {
    btnLogin.classList.add('active');
    btnSignup.classList.remove('active');
    formLogin.style.display = 'block';
    formSignup.style.display = 'none';
  } else {
    btnSignup.classList.add('active');
    btnLogin.classList.remove('active');
    formSignup.style.display = 'block';
    formLogin.style.display = 'none';
  }
}

function handleGuestSignUp(e) {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const contact = document.getElementById('signup-contact').value;

  loggedInGuest = { name, contact };
  updateGuestNavAuth();

  alert(`Account Created!\nWelcome ${name}. You are now logged in to your guest account.`);
  closeGuestAuthModal();

  if (pendingInquiryUnit) {
    const { roomNum, roomType, price } = pendingInquiryUnit;
    pendingInquiryUnit = null;
    openInquiryModal(roomNum, roomType, price);
  }
}

function handleGuestLogin(e) {
  e.preventDefault();
  const contact = document.getElementById('login-contact').value;
  const name = contact.includes('@') ? contact.split('@')[0] : 'Maria Santos';

  loggedInGuest = { name, contact };
  updateGuestNavAuth();

  alert(`Welcome back, ${name}!\nYou are logged in to your guest account.`);
  closeGuestAuthModal();

  if (pendingInquiryUnit) {
    const { roomNum, roomType, price } = pendingInquiryUnit;
    pendingInquiryUnit = null;
    openInquiryModal(roomNum, roomType, price);
  }
}

function updateGuestNavAuth() {
  const authContainer = document.getElementById('nav-auth-container');
  if (!authContainer) return;

  if (loggedInGuest) {
    authContainer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        
        <!-- NOTIFICATION BELL WITH UNREAD COUNTER -->
        <div style="position: relative;">
          <button type="button" class="btn-icon-bell" id="btn-notif-bell" onclick="toggleNavNotifDropdown(event)">
            🔔
            <span class="nav-bell-badge" id="nav-bell-badge" style="${unreadMessagesCount > 0 ? 'display: flex;' : 'display: none;'}">${unreadMessagesCount}</span>
          </button>

          <!-- NOTIFICATION DROPDOWN POPOVER -->
          <div class="notif-dropdown" id="notif-dropdown">
            <div class="notif-header">
              <span>🔔 Notifications</span>
              <span style="font-size: 0.75rem; color: #CBD5E1;">Mrs. Fe Galang Replies</span>
            </div>
            <div class="notif-list" id="notif-items-list">
              <div style="padding: 1.5rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                No notifications yet.
              </div>
            </div>
          </div>
        </div>

        <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">👤 ${loggedInGuest.name}</span>
        <button class="btn-link" style="color: #EF4444; font-size: 0.8rem;" onclick="handleGuestLogout()">[ Log out ]</button>
      </div>
    `;
    renderNavNotifItems();
  }
}

function handleGuestLogout() {
  loggedInGuest = null;
  const authContainer = document.getElementById('nav-auth-container');
  if (authContainer) {
    authContainer.innerHTML = `<button class="btn-yellow" onclick="openGuestAuthModal('login')">Log in / Sign up</button>`;
  }
}

function toggleNavNotifDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('notif-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('open');
  }
}

function renderNavNotifItems() {
  const listEl = document.getElementById('notif-items-list');
  if (!listEl) return;

  if (guestNotificationsList.length === 0) {
    listEl.innerHTML = `
      <div style="padding: 1.5rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        No notifications yet.
      </div>
    `;
    return;
  }

  listEl.innerHTML = guestNotificationsList.map(n => `
    <div class="notif-item ${n.unread ? 'unread' : ''}" onclick="openChatFromNotif('${n.roomNum}', '${n.roomType}')">
      <div class="notif-item-title">${n.title}</div>
      <div style="color: var(--text-muted);">${n.body}</div>
      <div class="notif-item-time">${n.time}</div>
    </div>
  `).join('');
}

function openChatFromNotif(roomNum, roomType) {
  document.getElementById('notif-dropdown').classList.remove('open');
  toggleLandladyChatModal();
}

/* ====================================================================
   HIGH-END 2-COLUMN INQUIRY MODAL & PHOTO SLIDESHOW ENGINE
   ==================================================================== */
function openInquiryModal(roomNum = 'General', roomType = 'Boarding Room', price = 0) {
  if (!loggedInGuest) {
    pendingInquiryUnit = { roomNum, roomType, price };
    openGuestAuthModal('signup', `🔒 Account Required: Please log in or create an account to inquire about Room ${roomNum}.`);
    return;
  }

  const modal = document.getElementById('inquiry-modal');
  const title = document.getElementById('modal-room-title');
  const priceDisplay = document.getElementById('modal-unit-price-display');
  const badgeWrap = document.getElementById('modal-unit-badge-wrap');
  const specsPills = document.getElementById('modal-specs-pills');
  const hiddenRoom = document.getElementById('modal-hidden-room');
  const hiddenType = document.getElementById('modal-hidden-type');

  const unitData = GUEST_ROOMS.find(r => r.num === roomNum) || { type: roomType, price: price, num: roomNum, floor: 1, size: '24', amenities: ['🚿 Private Bathroom', '⚡ Electric Sub-meter', '🛜 WiFi Access'] };

  if (title) {
    title.textContent = roomNum !== 'General' ? `Room ${roomNum} (${unitData.type})` : 'Hivelet Boarding House';
  }
  if (priceDisplay) {
    priceDisplay.innerHTML = `₱${unitData.price.toLocaleString()} <span>/ month • Water ₱200/head</span>`;
  }
  if (badgeWrap) {
    badgeWrap.innerHTML = `<span class="badge-tag" style="background: var(--accent-yellow); color: #0F172A; font-weight: 800;">Floor ${unitData.floor} • Unit ${unitData.num}</span>`;
  }
  if (specsPills) {
    specsPills.innerHTML = (unitData.amenities || []).map(a => `<span class="amenity-chip">${a}</span>`).join('');
  }

  if (hiddenRoom) hiddenRoom.value = roomNum;
  if (hiddenType) hiddenType.value = unitData.type;

  const nameInput = document.getElementById('inquiry-name');
  if (nameInput) nameInput.value = loggedInGuest.name;

  currentSlides = UNIT_SLIDESHOWS[unitData.type] || UNIT_SLIDESHOWS['Studio'];
  currentSlideIndex = 0;
  updateSlideDisplay();

  modal.classList.add('open');
}

function updateSlideDisplay() {
  const img = document.getElementById('slideshow-img');
  const counter = document.getElementById('slideshow-counter');

  if (img && currentSlides.length > 0) {
    img.style.opacity = '0.3';
    setTimeout(() => {
      img.src = currentSlides[currentSlideIndex];
      img.style.opacity = '1';
    }, 150);
  }

  if (counter) {
    counter.textContent = `Photo ${currentSlideIndex + 1} of ${currentSlides.length}`;
  }
}

function nextSlide() {
  if (currentSlides.length === 0) return;
  currentSlideIndex = (currentSlideIndex + 1) % currentSlides.length;
  updateSlideDisplay();
}

function prevSlide() {
  if (currentSlides.length === 0) return;
  currentSlideIndex = (currentSlideIndex - 1 + currentSlides.length) % currentSlides.length;
  updateSlideDisplay();
}

function closeInquiryModal() {
  document.getElementById('inquiry-modal').classList.remove('open');
}

function submitGuestInquiry(e) {
  e.preventDefault();
  const name = document.getElementById('inquiry-name').value;
  const roomNum = document.getElementById('modal-hidden-room').value;
  const roomType = document.getElementById('modal-hidden-type').value || 'Unit';
  const msgText = document.getElementById('inquiry-msg').value || 'Hello Mrs. Fe! I am interested in viewing this unit.';

  closeInquiryModal();
  document.getElementById('inquiry-form').reset();

  openLandladyChatModal(name, roomNum, roomType, msgText);
}

/* ====================================================================
   LIVE CHAT & REAL-TIME LANDLADY REPLY NOTIFICATION SYSTEM
   ==================================================================== */
function openLandladyChatModal(guestName, roomNum, roomType, initialMessage) {
  const modal = document.getElementById('chat-modal');
  const messagesArea = document.getElementById('chat-messages-list');
  if (!modal || !messagesArea) return;

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  messagesArea.innerHTML = `
    <div style="text-align: center; font-size: 0.75rem; color: var(--text-muted); margin: 0.5rem 0;">
      💬 Live Chat Started regarding <strong>Room ${roomNum} (${roomType})</strong>
    </div>

    <div class="chat-bubble bubble-guest">
      <div>${initialMessage}</div>
      <span class="chat-time">${currentTime} • Sent</span>
    </div>
  `;

  modal.classList.add('open');
  clearUnreadNotifications();

  // SIMULATE LANDLADY TYPING & REPLY
  setTimeout(() => {
    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'landlady-typing';
    typingIndicator.style.cssText = 'font-size: 0.75rem; color: #16A34A; font-style: italic; margin-left: 0.5rem;';
    typingIndicator.textContent = 'Mrs. Fe Galang is typing reply...';
    messagesArea.appendChild(typingIndicator);
    messagesArea.scrollTop = messagesArea.scrollHeight;

    setTimeout(() => {
      const typingEl = document.getElementById('landlady-typing');
      if (typingEl) typingEl.remove();

      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const replyText = `Hello ${guestName}! 👋 Thank you for inquiring about Room ${roomNum} (${roomType}). It is clean, private sub-metered, and available for move-in! When would you like to schedule a viewing?`;

      const landladyBubble = document.createElement('div');
      landladyBubble.className = 'chat-bubble bubble-landlady';
      landladyBubble.innerHTML = `
        <div>${replyText}</div>
        <span class="chat-time">${replyTime} • Mrs. Fe Galang</span>
      `;
      messagesArea.appendChild(landladyBubble);
      messagesArea.scrollTop = messagesArea.scrollHeight;

      // Trigger notifications if chat is closed
      if (!modal.classList.contains('open')) {
        triggerNewReplyNotification('Mrs. Fe Galang', roomNum, roomType, replyText, replyTime);
      }
    }, 1200);
  }, 400);
}

function toggleLandladyChatModal() {
  const modal = document.getElementById('chat-modal');
  if (!modal) return;

  if (modal.classList.contains('open')) {
    modal.classList.remove('open');
  } else {
    modal.classList.add('open');
    clearUnreadNotifications();
  }
}

function closeLandladyChatModal() {
  document.getElementById('chat-modal').classList.remove('open');
}

function sendFollowupChatMessage(e) {
  e.preventDefault();
  const input = document.getElementById('chat-user-input');
  const messagesArea = document.getElementById('chat-messages-list');
  if (!input || !messagesArea || !input.value.trim()) return;

  const text = input.value.trim();
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const guestBubble = document.createElement('div');
  guestBubble.className = 'chat-bubble bubble-guest';
  guestBubble.innerHTML = `
    <div>${text}</div>
    <span class="chat-time">${currentTime} • Sent</span>
  `;
  messagesArea.appendChild(guestBubble);
  input.value = '';
  messagesArea.scrollTop = messagesArea.scrollHeight;

  setTimeout(() => {
    const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const replyText = 'Noted! I have logged your message. I am at the boarding house on Floor 1 every morning. Feel free to message me anytime!';
    
    const replyBubble = document.createElement('div');
    replyBubble.className = 'chat-bubble bubble-landlady';
    replyBubble.innerHTML = `
      <div>${replyText}</div>
      <span class="chat-time">${replyTime} • Mrs. Fe Galang</span>
    `;
    messagesArea.appendChild(replyBubble);
    messagesArea.scrollTop = messagesArea.scrollHeight;

    const modal = document.getElementById('chat-modal');
    if (!modal.classList.contains('open')) {
      triggerNewReplyNotification('Mrs. Fe Galang', 'Unit', 'Boarding Room', replyText, replyTime);
    }
  }, 1400);
}

/* TRIGGER NOTIFICATIONS FOR LANDLADY REPLIES */
function triggerNewReplyNotification(senderName, roomNum, roomType, bodyText, timeStr) {
  unreadMessagesCount++;

  // Update floating chathead badge
  const chatHeadBadge = document.getElementById('chat-head-unread-badge');
  const chatHead = document.getElementById('floating-chat-head');

  if (chatHeadBadge) {
    chatHeadBadge.textContent = unreadMessagesCount;
    chatHeadBadge.style.display = 'block';
  }
  if (chatHead) {
    chatHead.classList.add('has-unread');
  }

  // Update navbar notification bell badge
  const navBadge = document.getElementById('nav-bell-badge');
  if (navBadge) {
    navBadge.textContent = unreadMessagesCount;
    navBadge.style.display = 'flex';
  }

  // Add to notification list
  guestNotificationsList.unshift({
    title: `💬 ${senderName} replied regarding Room ${roomNum}`,
    body: `"${bodyText.substring(0, 50)}..."`,
    time: timeStr,
    roomNum,
    roomType,
    unread: true
  });
  renderNavNotifItems();

  // Show Toast Notification
  showToastNotification(`💬 New Reply from ${senderName}`, `"${bodyText.substring(0, 65)}..."`);
}

function clearUnreadNotifications() {
  unreadMessagesCount = 0;

  const chatHeadBadge = document.getElementById('chat-head-unread-badge');
  const chatHead = document.getElementById('floating-chat-head');
  const navBadge = document.getElementById('nav-bell-badge');

  if (chatHeadBadge) chatHeadBadge.style.display = 'none';
  if (chatHead) chatHead.classList.remove('has-unread');
  if (navBadge) navBadge.style.display = 'none';

  guestNotificationsList.forEach(n => n.unread = false);
  renderNavNotifItems();
}

function showToastNotification(title, body) {
  const toast = document.getElementById('guest-toast-notification');
  const titleEl = document.getElementById('toast-title');
  const bodyEl = document.getElementById('toast-body');

  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.textContent = body;

  if (toast) {
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4500);
  }
}

function closeToastNotification() {
  const toast = document.getElementById('guest-toast-notification');
  if (toast) toast.classList.remove('show');
}
