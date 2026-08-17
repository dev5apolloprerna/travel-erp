// Central menu definition. `key` is used for employee menu-rights filtering.
// module (if set) also gates by employee.modules.
export const MENU = [
  { section: null, items: [{ key: 'dashboard', label: 'Dashboard', to: '/app', end: true }] },
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
    ],
  },
  {
    section: 'Administration',
    items: [
      { key: 'admin-services', label: 'Service Master', to: '/app/masters/services' },
      { key: 'admin-employees', label: 'Team / Employees', to: '/app/admin/employees' },
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
];

// Menus every logged-in staff user can reach regardless of granted rights.
const ALWAYS_ALLOWED = ['dashboard', 'my-profile', 'change-password', 'hr-my-leave', 'hr-my-salary'];

// Given a user, return menu with only the sections/items they may see.
export function visibleMenu(user) {
  if (!user) return [];
  const all = user.role === 'SUPER_ADMIN' || (user.menus || []).includes('ALL');
  const canModule = (m) => !m || all || (user.modules || []).includes(m);
  const canItem = (key) => all || ALWAYS_ALLOWED.includes(key) || (user.menus || []).includes(key);

  return MENU
    .map((group) => {
      if (!canModule(group.module)) return null;
      const items = group.items.filter((it) => canItem(it.key));
      return items.length ? { ...group, items } : null;
    })
    .filter(Boolean);
}
