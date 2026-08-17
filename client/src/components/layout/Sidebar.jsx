import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { visibleMenu } from '../../menuConfig';
import api from '../../api/client';

const STORAGE_KEY = 'sidebarOpenSections';

export default function Sidebar() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const groups = visibleMenu(user);

  // Which accordion sections are expanded, remembered for the session.
  const [open, setOpen] = useState(() => {
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // The section holding the current page always opens.
  useEffect(() => {
    const active = groups.find(
      (g) => g.section && g.items.some((it) => (it.end ? pathname === it.to : pathname.startsWith(it.to)))
    );
    if (active && !open[active.section]) {
      setOpen((prev) => ({ ...prev, [active.section]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user]);

  useEffect(() => {
    try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(open)); } catch { /* non-critical */ }
  }, [open]);

  const toggle = (section) => setOpen((prev) => ({ ...prev, [section]: !prev[section] }));

  const linkClass = ({ isActive }) =>
    `block rounded-lg px-3 py-2 text-sm transition ${
      isActive ? 'bg-brand text-white font-semibold shadow-sm' : 'text-ink-soft hover:bg-canvas'
    }`;

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-line bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <img src="/logo.png" alt="360 Travel Concierge" className="h-10 w-auto object-contain" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {groups.map((group, gi) => {
          // Ungrouped items (Dashboard) sit at the top with no header.
          if (!group.section) {
            return (
              <div key={gi}>
                {group.items.map((it) => (
                  <NavLink key={it.key} to={it.to} end={it.end} className={linkClass}>
                    {it.label}
                  </NavLink>
                ))}
              </div>
            );
          }

          const isOpen = !!open[group.section];
          const hasActive = group.items.some((it) => (it.end ? pathname === it.to : pathname.startsWith(it.to)));

          return (
            <div key={gi} className="mt-3">
              <button
                type="button"
                onClick={() => toggle(group.section)}
                aria-expanded={isOpen}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-widest transition ${
                  hasActive ? 'text-brand' : 'text-ink-muted hover:bg-canvas'
                }`}
              >
                <span>{group.section}</span>
                <svg
                  viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"
                  className={`h-3 w-3 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                  aria-hidden="true"
                >
                  <path d="M7 5l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {isOpen && (
                <div className="mt-0.5 space-y-0.5 border-l border-line pl-2">
                  {group.items.map((it) => (
                    <NavLink key={it.key} to={it.to} end={it.end} className={linkClass}>
                      {it.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 border-t border-line px-4 py-3">
        <Avatar user={user} />
        <div className="min-w-0 text-xs text-ink-muted">
          Signed in as<br />
          <span className="block truncate font-semibold text-ink-soft">{user?.name}</span>
        </div>
      </div>
    </aside>
  );
}

function Avatar({ user }) {
  const apiBase = api.defaults.baseURL.replace(/\/api$/, '');
  const src = user?.profilePic
    ? (user.profilePic.startsWith('http') ? user.profilePic : `${apiBase}${user.profilePic}`)
    : '';
  const initials = (user?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-brand-light text-xs font-bold text-brand">
      {src ? <img src={src} alt={user?.name} className="h-full w-full object-cover" /> : initials}
    </div>
  );
}
