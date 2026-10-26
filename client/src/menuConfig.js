// Central menu definition. `key` is used for employee menu-rights filtering.
// `module` (if set) also gates by employee.modules.
// `area` groups the section under one of the four landing sections (req #5):
//   website | booking | account | master. Groups with area null (Dashboard) show in every area.
export const AREAS = [
  { key: 'website', label: 'Website', desc: 'Destinations, packages, website content & enquiries' },
  { key: 'booking', label: 'Booking', desc: 'Retail, B2B and Society orders & bookings' },
  { key: 'account', label: 'Account', desc: 'Invoices, credit notes & accounting' },
  { key: 'master', label: 'Master', desc: 'Services, society masters, team & settings' },
  // v60: Reports area. Visible to Super Admin only (see note on `reports` keys below).
  { key: 'reports', label: 'Reports', desc: 'Pre-designed & user-designed business reports' },
];

export const MENU = [
  { section: null, items: [{ key: 'dashboard', label: 'Dashboard', to: '/app', end: true }] },
  // Super Admin → Company Owner management (list/create/edit). This opens the management
  // page INSIDE the Super Admin panel — it no longer links to the Company Owner dashboard (#1).
  { section: 'Company Owner', items: [{ key: 'admin-company-owners', label: 'Company Owners', to: '/app/admin/company-owners' }] },
  {
    section: 'Retail', module: 'RETAIL',
    items: [
      { key: 'retail-customers', label: 'Customers', to: '/app/retail/customers' },
      { key: 'retail-orders', label: 'Orders', to: '/app/retail/orders' },
    ],
  },
  {
    section: 'B2B', module: 'B2B',
    items: [{ key: 'b2b-companies', label: 'Companies', to: '/app/b2b/companies' }],
  },
  {
    section: 'Society', module: 'FIT',
    items: [
      { key: 'fit-dashboard', label: 'Society Dashboard', to: '/app/fit', end: true },
      { key: 'fit-doctors', label: 'Passenger', to: '/app/fit/doctors' },
      { key: 'fit-employees', label: 'Society Members', to: '/app/fit/employees' },
      { key: 'fit-orders', label: 'Society Orders', to: '/app/fit/orders' },
    ],
  },
  {
    section: 'Society Masters', module: 'FIT',
    items: [
      { key: 'cms-categories', label: 'Destination Categories', to: '/app/cms/categories' },
      { key: 'cms-destinations', label: 'Destinations', to: '/app/cms/destinations' },
      { key: 'cms-packages', label: 'Tour Packages', to: '/app/cms/packages' },
      { key: 'cms-content', label: 'FAQ & Testimonials', to: '/app/cms/content' },
      { key: 'cms-banners', label: 'Banner Master', to: '/app/cms/banners' },
      { key: 'cms-videos', label: 'Video Gallery', to: '/app/cms/videos' },
      { key: 'cms-team', label: 'Our Team', to: '/app/cms/team' },
      { key: 'cms-travel-inspiration', label: 'Travel Inspiration', to: '/app/cms/travel-inspiration' },
      { key: 'cms-customize-trip', label: 'Customize Trip', to: '/app/cms/customize-trip' },
      { key: 'cms-bookings', label: 'Website Bookings', to: '/app/cms/bookings' },
      { key: 'cms-other-pages', label: 'Other Pages', to: '/app/cms/other-pages' },
      { key: 'cms-inquiries', label: 'Inquiries', to: '/app/cms/inquiries' },
      { key: 'master-cluster', label: 'Cluster', to: '/app/masters/clusters' },
      { key: 'master-division', label: 'Division', to: '/app/masters/divisions' },
      { key: 'master-grade', label: 'Grade', to: '/app/masters/grades' },
      { key: 'master-department', label: 'Department', to: '/app/masters/departments' },

    ],
  },
  {
    section: 'HR',
    items: [
      { key: 'hr-holidays', label: 'Holiday Master', to: '/app/hr/holidays' },
      { key: 'hr-leaves', label: 'Leave Requests', to: '/app/hr/leaves' },
      { key: 'hr-my-leave', label: 'My Leave', to: '/app/hr/my-leave' },
      { key: 'hr-salary', label: 'Salary Slips', to: '/app/hr/salary-slips' },
      { key: 'hr-my-salary', label: 'My Salary Slips', to: '/app/hr/my-salary-slips' },
    ],
  },
  {
    section: 'Website',
    items: [
      { key: 'cms-categories', label: 'Destination Categories', to: '/app/cms/categories' },
      { key: 'cms-destinations', label: 'Destinations', to: '/app/cms/destinations' },
      { key: 'cms-packages', label: 'Tour Packages', to: '/app/cms/packages' },
      { key: 'cms-content', label: 'FAQ & Testimonials', to: '/app/cms/content' },
      { key: 'cms-bookings', label: 'Website Bookings', to: '/app/cms/bookings' },
      { key: 'cms-inquiries', label: 'Inquiries', to: '/app/cms/inquiries' },
    ],
  },
  {
    section: 'Administration',
    items: [
      { key: 'admin-services', label: 'Service Master', to: '/app/masters/services' },
      { key: 'admin-employees', label: 'Team / Employees', to: '/app/admin/employees' },
      { key: 'admin-main-companies', label: 'Main Companies', to: '/app/org/main-companies' },
      { key: 'admin-supplier-invoices', label: 'Supplier Invoices', to: '/app/org/supplier-invoices' },
      { key: 'admin-settings', label: 'Company Profile', to: '/app/settings/company' },
    ],
  },
  {
    section: 'Account',
    items: [
      { key: 'my-profile', label: 'My Profile', to: '/app/account/profile' },
      { key: 'change-password', label: 'Change Password', to: '/app/account/password' },
    ],
  },

  // ---- Reports (v60) ----
  // Super-Admin only for now. The `reports-hub` key is NOT in ALWAYS_ALLOWED or
  // CO_ALLOWED and is never seeded into any user's `menus`, so visibleMenu() only
  // surfaces it when `all` (SUPER_ADMIN) is true. Future per-user report rights
  // (backend keyed `reports.<id>`) can grant this entry to other roles later.
  {
    section: 'Reports', area: 'reports',
    items: [
      { key: 'reports-hub', label: 'All Reports', to: '/app/reports', end: true },
    ],
  },
];

// Per-menu icon used by the collapsed (icon-only) sidebar rail — req (v50 Task 1). Kept as a lookup
// so the MENU array above stays unchanged; unknown keys fall back to a neutral document glyph.
const MENU_ICONS = {
  dashboard: '🏠',
  'retail-customers': '👤', 'retail-orders': '🧾',
  'b2b-companies': '🏢',
  'fit-dashboard': '📊', 'fit-doctors': '🧍', 'fit-employees': '👥', 'fit-orders': '🧾',
  'cms-categories': '🗂️', 'cms-destinations': '📍', 'cms-packages': '🧳', 'cms-content': '💬',
  'cms-banners': '🖼️', 'cms-videos': '🎬', 'cms-team': '👔', 'cms-travel-inspiration': '💡',
  'cms-customize-trip': '✏️', 'cms-bookings': '🌐', 'cms-other-pages': '📄', 'cms-inquiries': '📩',
  'admin-supplier-invoices': '📥', 'admin-credit-notes': '🧾', 'admin-settings': '🏷️',
  'my-profile': '👤', 'change-password': '🔑',
  'admin-company-owners': '👑', 'admin-services': '🧩', 'admin-employees': '👥',
  'admin-main-companies': '🏢', 'admin-activity-logs': '📜', 'admin-company-masters': '🗂️',
  'master-cluster': '🏷️', 'master-division': '🏷️', 'master-grade': '🏷️', 'master-department': '🏷️',
  'hr-holidays': '📅', 'hr-leaves': '📝', 'hr-my-leave': '📝', 'hr-salary': '💰', 'hr-my-salary': '💰',
  'reports-hub': '📊',
};
export const iconFor = (key) => MENU_ICONS[key] || '📄';

// Menus every logged-in staff user can reach regardless of granted rights.
const ALWAYS_ALLOWED = ['dashboard', 'my-profile', 'change-password', 'hr-my-leave', 'hr-my-salary'];
// The Company Owner runs entirely in its own /owner shell (not /app), so this list is only a
// safety fallback. Main Companies / Supplier Invoices are intentionally excluded (req #4/#6).
const CO_ALLOWED = ['retail-customers', 'retail-orders', 'b2b-companies', 'admin-employees'];

// Given a user, return menu with only the sections/items they may see.
export function visibleMenu(user) {
  if (!user) return [];
  const all = user.role === 'SUPER_ADMIN' || (user.menus || []).includes('ALL');
  const isCO = user.role === 'COMPANY_OWNER';
  // Company Owner may use the Retail and B2B modules (Society/FIT excluded, per decision).
  const canModule = (m) => !m || all || (isCO && (m === 'RETAIL' || m === 'B2B')) || (user.modules || []).includes(m);
  const canItem = (key) => all || ALWAYS_ALLOWED.includes(key) || (isCO && CO_ALLOWED.includes(key)) || (user.menus || []).includes(key);

  return MENU
    .map((group) => {
      if (!canModule(group.module)) return null;
      const items = group.items.filter((it) => canItem(it.key));
      return items.length ? { ...group, items } : null;
    })
    .filter(Boolean);
}
