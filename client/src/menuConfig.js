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
  { section: null, area: null, items: [{ key: 'dashboard', label: 'Home', to: '/app', end: true }] },

  // ---- Booking ----
  {
    section: 'Retail', area: 'booking', module: 'RETAIL',
    items: [
      { key: 'retail-customers', label: 'Customers', to: '/app/retail/customers' },
      { key: 'retail-orders', label: 'Orders', to: '/app/retail/orders' },
    ],
  },
  {
    section: 'B2B', area: 'booking', module: 'B2B',
    items: [{ key: 'b2b-companies', label: 'Companies', to: '/app/b2b/companies' }],
  },
  {
    section: 'Society', area: 'booking', module: 'FIT',
    items: [
      { key: 'fit-dashboard', label: 'Society Dashboard', to: '/app/fit', end: true },
      { key: 'fit-doctors', label: 'Passenger', to: '/app/fit/doctors' },
      { key: 'fit-employees', label: 'Society Members', to: '/app/fit/employees' },
      { key: 'fit-orders', label: 'Society Orders', to: '/app/fit/orders' },
    ],
  },

  // ---- Website ----
  {
    section: 'Website', area: 'website',
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
    ],
  },

  // ---- Account (invoices / accounting) ----
  {
    section: 'Invoices & Accounting', area: 'account',
    items: [
      { key: 'admin-supplier-invoices', label: 'Supplier Invoices', to: '/app/org/supplier-invoices' },
      { key: 'admin-credit-notes', label: 'Credit Notes', to: '/app/invoices/credit-notes' },
      // v65: Super-Admin only (key not in any user's menus / CO_ALLOWED, so only SA sees it).
      { key: 'admin-club-invoices', label: 'Club Invoices', to: '/app/invoices/club' },
      { key: 'admin-settings', label: 'Company Profile', to: '/app/settings/company' },
    ],
  },
  {
    section: 'My Account', area: 'account',
    items: [
      { key: 'my-profile', label: 'My Profile', to: '/app/account/profile' },
      { key: 'change-password', label: 'Change Password', to: '/app/account/password' },
    ],
  },

  // ---- Master (master data / admin) ----
  {
    section: 'Company Owner', area: 'master',
    items: [{ key: 'admin-company-owners', label: 'Company Owners', to: '/app/admin/company-owners' }],
  },
  {
    section: 'Administration', area: 'master',
    items: [
      { key: 'admin-services', label: 'Service Master', to: '/app/masters/services' },
      { key: 'admin-employees', label: 'Team / Employees', to: '/app/admin/employees' },
      { key: 'admin-main-companies', label: 'Main Companies', to: '/app/org/main-companies' },
      { key: 'admin-activity-logs', label: 'Activity Logs', to: '/app/activity-logs' },
      // req #5: the Company master modules now open INSIDE the Super Admin panel (/app/master-data),
      // not the Company Owner area. This "Master Data" entry is the hub landing; the Sidebar also
      // renders the full grouped master menu (by category) below, so the Super Admin gets the same
      // practical structure as the Company Owner. Action authorization is unchanged.
      { key: 'admin-company-masters', label: 'Master Data', to: '/app/master-data' },
    ],
  },
  {
    section: 'Society Masters', area: 'master', module: 'FIT',
    items: [
      { key: 'master-cluster', label: 'Cluster', to: '/app/masters/clusters' },
      { key: 'master-division', label: 'Division', to: '/app/masters/divisions' },
      { key: 'master-grade', label: 'Grade', to: '/app/masters/grades' },
      { key: 'master-department', label: 'Department', to: '/app/masters/departments' },
    ],
  },
  {
    section: 'HR', area: 'master',
    items: [
      { key: 'hr-holidays', label: 'Holiday Master', to: '/app/hr/holidays' },
      { key: 'hr-leaves', label: 'Leave Requests', to: '/app/hr/leaves' },
      { key: 'hr-my-leave', label: 'My Leave', to: '/app/hr/my-leave' },
      { key: 'hr-salary', label: 'Salary Slips', to: '/app/hr/salary-slips' },
      { key: 'hr-my-salary', label: 'My Salary Slips', to: '/app/hr/my-salary-slips' },
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
  'admin-supplier-invoices': '📥', 'admin-credit-notes': '🧾', 'admin-club-invoices': '🔗', 'admin-settings': '🏷️',
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
// Menus a Company Owner may SEE (visibility only — backend action authorization is unchanged, so a
// visible menu never grants Create/Edit/Delete the role doesn't already have). The 360-level org
// administration menus (Company Owners, Main Companies, Supplier Invoices, Credit Notes, Activity
// Logs) and the Society/FIT module (not enabled for Company Owners) stay excluded by design.
const CO_ALLOWED = [
  'retail-customers', 'retail-orders', 'b2b-companies', 'admin-employees',
  'admin-services',   // Master → Service Master (read; create/edit still backend-restricted)
];

// Given a user, return menu groups with only the sections/items they may see (area preserved).
export function visibleMenu(user) {
  if (!user) return [];
  const all = user.role === 'SUPER_ADMIN' || (user.menus || []).includes('ALL');
  const isCO = user.role === 'COMPANY_OWNER';
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

// Which of the four areas the user can see (an area is available if it has ≥1 visible group).
export function availableAreas(user) {
  const groups = visibleMenu(user);
  return AREAS.filter((a) => groups.some((g) => g.area === a.key));
}

// Map a pathname to the area that owns it (longest matching menu item), or null.
export function areaForPath(pathname) {
  let best = null; let bestLen = -1;
  for (const group of MENU) {
    if (!group.area) continue;
    for (const it of group.items) {
      const match = it.end ? pathname === it.to : pathname.startsWith(it.to);
      if (match && it.to.length > bestLen) { best = group.area; bestLen = it.to.length; }
    }
  }
  return best;
}
