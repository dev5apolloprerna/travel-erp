import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import UserMenu from '../../components/layout/UserMenu';   // shared header dropdown (req #1)

// Dedicated Company Owner shell — two-level sidebar (menu group → master items),
// styled to the wireframe. Collapses to an off-canvas drawer on mobile (#13).
export default function OwnerLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [groups, setGroups] = useState({});
  const [open, setOpen] = useState({});
  const [drawer, setDrawer] = useState(false);   // mobile sidebar open?
  // Desktop collapse preference — shares the same key as the Super Admin / Employee shell.
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === '1'; } catch { return false; }
  });
  const toggleCollapse = () => setCollapsed((c) => {
    const next = !c;
    try { localStorage.setItem('sidebarCollapsed', next ? '1' : '0'); } catch { /* non-critical */ }
    return next;
  });

  useEffect(() => {
    api.get('/owner/masters').then((r) => {
      const g = {};
      for (const m of r.data) { (g[m.menu] = g[m.menu] || []).push(m); }
      setGroups(g);
      const first = Object.keys(g)[0];
      if (first) setOpen({ [first]: true });
    });
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setDrawer(false); }, [pathname]);

  const doLogout = () => { logout(); nav('/login/companyowner'); };

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {drawer && <div className="fixed inset-0 z-30 bg-ink/40 md:hidden" onClick={() => setDrawer(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[264px] min-w-[264px] flex-col border-r border-line bg-white transition-all md:sticky md:top-0 md:translate-x-0 ${drawer ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'md:w-16 md:min-w-[64px]' : 'md:w-[264px] md:min-w-[264px]'}`}>
        {/* Brand — full (mobile always; desktop expanded) */}
        <div className={`flex items-center gap-2.5 border-b border-subtle px-[18px] pb-4 pt-5 ${collapsed ? 'md:hidden' : ''}`}>
          <img src="/logo.png" alt="360 Travel Concierge" className="h-[50px] w-[250px] flex-none rounded-[10px] object-contain" />
        </div>
        {/* Brand — compact (desktop collapsed) */}
        <div className={`hidden items-center justify-center border-b border-subtle py-4 ${collapsed ? 'md:flex' : ''}`}>
          <img src="/logo.png" alt="360" className="h-8 w-8 rounded-md object-contain" />
        </div>

        <div className={`px-[18px] pb-1.5 pt-3.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted/70 ${collapsed ? 'md:hidden' : ''}`}>
          Company Owner
        </div>

        {/* Full nav — mobile always; desktop expanded */}
        <nav className={`flex-1 overflow-y-auto pb-2 ${collapsed ? 'md:hidden' : ''}`}>
          <NavLink to="/owner" end className={({ isActive }) =>
            `mx-2 mb-0.5 block rounded-lg px-[18px] py-2.5 text-[13.5px] transition ${
              isActive ? 'bg-brand-light font-bold text-brand-dark' : 'font-medium text-ink-soft hover:bg-faint'
            }`}>
            Dashboard
          </NavLink>

          {Object.entries(groups).map(([menu, items]) => {
            const isOpen = !!open[menu];
            return (
              <div key={menu}>
                <button onClick={() => setOpen((o) => ({ ...o, [menu]: !o[menu] }))}
                  className="mx-2 mt-0.5 flex w-[calc(100%-16px)] items-center justify-between rounded-lg px-[18px] py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted hover:bg-faint">
                  <span>{menu}</span>
                  <span className={`text-[11px] text-ink-muted/60 transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                </button>
                <div className={`overflow-hidden transition-all ${isOpen ? 'max-h-[1600px]' : 'max-h-0'}`}>
                  {items.map((m) => (
                    <NavLink key={m.key} to={`/owner/${m.key}`}
                      className={({ isActive }) =>
                        `mx-2 block rounded-lg py-2.5 pl-[30px] pr-[18px] text-[13px] transition ${
                          isActive ? 'bg-brand-light font-bold text-brand-dark' : 'font-medium text-ink-soft hover:bg-faint'
                        }`}>
                      {m.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Collapsed icon rail — desktop collapsed only. Dashboard + one icon per master with a
            tooltip (title) showing the master name; active highlight preserved. */}
        <nav className={`hidden flex-1 flex-col items-center gap-1 overflow-y-auto px-2 pb-6 pt-2 ${collapsed ? 'md:flex' : ''}`}>
          <NavLink to="/owner" end title="Dashboard" aria-label="Dashboard"
            className={({ isActive }) => `grid h-10 w-10 place-items-center rounded-lg text-[18px] leading-none transition ${
              isActive ? 'bg-brand-light text-brand-dark ring-1 ring-brand/30' : 'text-ink-soft hover:bg-faint'}`}>
            <span aria-hidden="true">🏠</span>
          </NavLink>
          {Object.values(groups).flat().map((m) => (
            <NavLink key={m.key} to={`/owner/${m.key}`} title={m.label} aria-label={m.label}
              className={({ isActive }) => `grid h-10 w-10 place-items-center rounded-lg text-[17px] leading-none transition ${
                isActive ? 'bg-brand-light text-brand-dark ring-1 ring-brand/30' : 'text-ink-soft hover:bg-faint'}`}>
              <span aria-hidden="true">📋</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer — signed-in name (logout lives in the shared header dropdown). */}
        <div className="border-t border-subtle px-[18px] pb-4 pt-3.5">
          <div className={`truncate text-[10.5px] font-bold uppercase tracking-wide text-ink-muted/70 ${collapsed ? 'md:hidden' : ''}`}>{user?.name || 'Company Owner'}</div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header bar — hamburger (mobile) on the left, shared user dropdown on the right so the
            Company Owner gets the same name + Log out menu as Super Admin / Employee (req #1). */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-white/80 px-4 py-3 backdrop-blur sm:px-6 md:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setDrawer(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-soft md:hidden" aria-label="Open menu">
              <span className="text-lg leading-none">☰</span>
            </button>
            {/* Collapse/expand toggle — desktop only (same behavior as the other shells). */}
            <button type="button" onClick={toggleCollapse}
              className="hidden h-9 w-9 place-items-center rounded-lg border border-line text-ink-soft transition hover:bg-faint focus:outline-none focus:ring-2 focus:ring-brand/40 md:grid"
              aria-label={collapsed ? 'Show sidebar' : 'Hide sidebar'} aria-pressed={collapsed}
              title={collapsed ? 'Show sidebar' : 'Hide sidebar'}>
              {collapsed
                ? <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden="true">
                    <line x1="3" y1="5.5" x2="12" y2="5.5" strokeLinecap="round" />
                    <line x1="3" y1="10" x2="12" y2="10" strokeLinecap="round" />
                    <line x1="3" y1="14.5" x2="12" y2="14.5" strokeLinecap="round" />
                    <path d="M15 7l2.5 3-2.5 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                : <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden="true">
                    <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
                    <line x1="7.5" y1="3.5" x2="7.5" y2="16.5" />
                    <path d="M13.5 7.5L11 10l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>}
            </button>
          </div>
          <UserMenu user={user} roleLabel="Company Owner" onLogout={doLogout} />
        </header>

        <main className="min-w-0 flex-1 px-4 pb-16 pt-6 sm:px-6 md:px-10 md:pt-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
