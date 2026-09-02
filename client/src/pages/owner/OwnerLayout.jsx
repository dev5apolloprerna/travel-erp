import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// Dedicated Company Owner shell — two-level sidebar (menu group → master items),
// styled to the wireframe. Collapses to an off-canvas drawer on mobile (#13).
export default function OwnerLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [groups, setGroups] = useState({});
  const [open, setOpen] = useState({});
  const [drawer, setDrawer] = useState(false);   // mobile sidebar open?

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

      <aside className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[264px] min-w-[264px] flex-col border-r border-line bg-white transition-transform md:sticky md:top-0 md:translate-x-0 ${drawer ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Brand */}
        <div className="flex items-center gap-2.5 border-b border-subtle px-[18px] pb-4 pt-5">
          <img src="/logo.png" alt="360 Travel Concierge" className="h-[50px] w-[250px] flex-none rounded-[10px] object-contain" />
          
        </div>

        <div className="px-[18px] pb-1.5 pt-3.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted/70">
          Company Owner
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto pb-2">
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

        {/* Footer */}
        <div className="border-t border-subtle px-[18px] pb-4 pt-3.5">
          <div className="mb-2 truncate text-[10.5px] font-bold uppercase tracking-wide text-ink-muted/70">{user?.name || 'Company Owner'}</div>
          <button onClick={doLogout} className="btn-ghost btn-sm w-full">Log out</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar with hamburger */}
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white px-4 py-3 md:hidden">
          <button onClick={() => setDrawer(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-soft" aria-label="Open menu">
            <span className="text-lg leading-none">☰</span>
          </button>
          <img src="/logo.png" alt="360" className="h-7 w-7 rounded-md object-contain" />
          <span className="text-sm font-bold text-ink">Company Owner</span>
        </div>

        <main className="min-w-0 flex-1 px-4 pb-16 pt-6 sm:px-6 md:px-10 md:pt-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
