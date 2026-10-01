// Every frame the video uses, and the page it comes from.
// `steps` run in order; each step with `snap` saves a still.

export const SHOTS = [
  // Public site
  { name: 'public-home', role: 'public', route: '/public' },
  { name: 'public-two-bedroom', role: 'public', route: '/category/two-bedroom' },
  {
    name: 'public-inquire', role: 'public', route: '/inquire',
    steps: [
      { snap: 'empty' },
      { fill: ['input[autocomplete="name"], form input[type="text"]', 'Kaye Ordoñez'] },
      { fill: ['input[type="tel"]', '0918 555 0142'] },
      { fill: ['form textarea', 'Good day! Is the two-bedroom in the back apartment still available? Could we view it this Saturday?'], snap: 'filled' },
    ],
  },

  // The owner's workspace
  { name: 'admin-overview', route: '/admin/overview' },
  { name: 'admin-directory', route: '/admin/directory' },
  { name: 'admin-tenants', route: '/admin/tenants' },
  {
    name: 'admin-income', route: '/admin/income',
    steps: [
      { snap: '' },
      { eval: () => document.querySelector('[role="tablist"], h2')?.scrollIntoView(), scroll: 1040, snap: 'ledger' },
      { scroll: 0, clickRole: ['button', 'Record payment'], wait: 700, snap: 'record' },
      { clickRole: ['combobox', 'Unit'], wait: 400 },
      { clickRole: ['option', /^2B,/], wait: 600 },
      { fill: ['#onsite-payment-form input.font-mono', '5120'], wait: 500, snap: 'record-filled' },
      // Submitting only opens the confirmation, which carries the warning. Nothing
      // is recorded unless that is confirmed, and every request is answered here.
      { click: 'button[form="onsite-payment-form"]', wait: 900, snap: 'record-warning' },
    ],
  },
  { name: 'admin-expenses', route: '/admin/expenses' },
  { name: 'admin-tickets', route: '/admin/tickets' },
  {
    name: 'admin-bell', route: '/admin/tickets',
    steps: [{ click: 'header button[aria-label^="Notification"], header button[aria-label*="otification"]', wait: 700, snap: '' }],
  },
  { name: 'admin-inquiries', route: '/admin/inquiries' },

  // The tenant, on a phone
  { name: 'tenant-overview', role: 'tenant', route: '/tenant', device: 'phone' },
  {
    name: 'tenant-tickets', role: 'tenant', route: '/tenant/tickets', device: 'phone',
    steps: [
      { snap: 'empty' },
      { fill: ['input[placeholder^="e.g."]', 'Kitchen faucet keeps dripping'] },
      { fill: ['textarea', 'Under the kitchen sink. It started this morning and drips even when closed.'], wait: 400, snap: 'filled' },
    ],
  },
];
