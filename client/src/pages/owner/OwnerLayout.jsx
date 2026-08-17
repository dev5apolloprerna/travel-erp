import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// Dedicated Company Owner shell — its own sidebar built from the master catalog,
// grouped by menu. Fully separate from the existing /app area.
export default function OwnerLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [groups, setGroups] = useState({});
  const [open, setOpen] = useState({});

  useEffect(() => {
    api.get('/owner/masters').then((r) => {
      const g = {};
      for (const m of r.data) { (g[m.menu] = g[m.menu] || []).push(m); }
      setGroups(g);
      // open the first group by default
      const first = Object.keys(g)[0];
      if (first) setOpen({ [first]: true });
    });
  }, []);

  const doLogout = () => { logout(); nav('/login/companyowner'); };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex h-screen w-64 flex-col border-r border-line bg-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <img src="/logo.png" alt="360 Travel Concierge" className="h-10 w-auto object-contain" />
        </div>
        <div className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-accent-dark">Company Owner</div>

        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          <NavLink to="/owner" end className={({ isActive }) =>
            `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-brand text-white font-semibold' : 'text-ink-soft hover:bg-canvas'}`}>
            Dashboard
          </NavLink>

          {Object.entries(groups).map(([menu, items]) => (
            <div key={menu} className="mt-3">
              <button onClick={() => setOpen((o) => ({ ...o, [menu]: !o[menu] }))}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-muted hover:bg-canvas">
                <span>{menu}</span>
                <span className={`transition-transform ${open[menu] ? 'rotate-90' : ''}`}>›</span>
              </button>
              {open[menu] && (
                <div className="mt-0.5 space-y-0.5 border-l border-line pl-2">
                  {items.map((m) => (
                    <NavLink key={m.key} to={`/owner/${m.key}`} className={({ isActive }) =>
                      `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-brand text-white font-semibold' : 'text-ink-soft hover:bg-canvas'}`}>
                      {m.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="border-t border-line px-4 py-3 text-xs text-ink-muted">
          <div className="mb-2 truncate font-semibold text-ink-soft">{user?.name}</div>
          <button onClick={doLogout} className="btn-ghost btn-sm w-full">Log out</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
