import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useArea } from '../../context/AreaContext';
import { visibleMenu, availableAreas, iconFor } from '../../menuConfig';
import api from '../../api/client';
import ReportsNav from './ReportsNav';

const STORAGE_KEY = 'sidebarOpenSections';

export default function Sidebar({ drawer = false, collapsed = false, onClose }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const groups = visibleMenu(user);
  const areas = availableAreas(user);

  // Active section is driven by the header selector (req #3), shared via AreaContext.
  const { activeArea } = useArea();
  const resolvedArea = areas.some((a) => a.key === activeArea) ? activeArea : (areas[0]?.key ?? null);

  const [open, setOpen] = useState(() => {
    try { const s = window.sessionStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });

  // req #5: Super Admin gets the SAME grouped master menu as the Company Owner, rendered inside
  // its own panel. Fetch the master catalog once and group it by category; each item links to
  // /app/master-data/:key so navigation stays in the Super Admin shell (never redirects to /owner).
  const isSA = user?.role === 'SUPER_ADMIN';
  const [masterSections, setMasterSections] = useState([]);
  useEffect(() => {
    if (!isSA) { setMasterSections([]); return; }
    let alive = true;
    api.get('/owner/masters').then((r) => {
      if (!alive) return;
      const byMenu = {};
      for (const m of r.data) {
        if (m.virtual) continue;   // skip operational shortcuts (not master collections)
        (byMenu[m.menu] = byMenu[m.menu] || []).push({ key: m.key, label: m.label, to: `/app/master-data/${m.key}` });
      }
      setMasterSections(Object.entries(byMenu).map(([menu, items]) => ({ section: `Master · ${menu}`, area: 'master', items })));
    }).catch(() => { if (alive) setMasterSections([]); });
    return () => { alive = false; };
  }, [isSA]);
  useEffect(() => {
    const active = groups.find((g) => g.section && g.items.some((it) => (it.end ? pathname === it.to : pathname.startsWith(it.to))));
    if (active && !open[active.section]) setOpen((p) => ({ ...p, [active.section]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user]);
  useEffect(() => { try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(open)); } catch { /* ok */ } }, [open]);
  const toggle = (section) => setOpen((p) => ({ ...p, [section]: !p[section] }));

  const topLinks = groups.filter((g) => !g.section);          // Home
  // Static menu groups for the active area, plus (for Super Admin in the Master area) the dynamic
  // grouped master catalog so the full master structure shows in the Super Admin panel (req #5).
  const areaGroups = [
    ...groups.filter((g) => g.section && g.area === resolvedArea),
    ...(resolvedArea === 'master' ? masterSections : []),
  ];

  // Flat list used by the collapsed icon rail (all visible items for the active area + Home).
  const railItems = [
    ...topLinks.flatMap((g) => g.items),
    ...areaGroups.flatMap((g) => g.items),
  ];

  const linkClass = ({ isActive }) =>
    `block rounded-lg px-[18px] py-2.5 text-[13.5px] transition ${
      isActive ? 'bg-brand-light font-bold text-brand-dark' : 'font-medium text-ink-soft hover:bg-faint'}`;

  // Collapsed state is a DESKTOP concept only. On mobile the sidebar is always the full off-canvas
  // drawer, so the icon-rail classes are all `md:` — the base (mobile) layout stays fully expanded.
  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[264px] min-w-[264px] flex-col border-r border-line bg-white transition-all md:static md:translate-x-0 ${drawer ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'md:w-16 md:min-w-[64px]' : 'md:w-[264px] md:min-w-[264px]'}`}>
      {/* Brand — full (mobile always; desktop when expanded) */}
      <div className={`flex items-center gap-2.5 border-b border-subtle px-[18px] pb-4 pt-5 ${collapsed ? 'md:hidden' : ''}`}>
        <img src="/logo.png" alt="360 Travel Concierge" className="h-10 w-auto object-contain" />
      </div>
      {/* Brand — compact (desktop collapsed only) */}
      <div className={`hidden items-center justify-center border-b border-subtle py-4 ${collapsed ? 'md:flex' : ''}`}>
        <img src="/logo.png" alt="360" className="h-8 w-8 rounded-md object-contain" />
      </div>

      {/* Full menu — mobile always; desktop when expanded */}
      <nav className={`flex-1 overflow-y-auto px-3 pb-6 ${collapsed ? 'md:hidden' : ''}`}>
        {topLinks.map((group, gi) => (
          <div key={`top${gi}`}>
            {group.items.map((it) => (
              <NavLink key={it.key} to={it.to} end={it.end} className={linkClass}>{it.label}</NavLink>
            ))}
          </div>
        ))}

        {/* Reports area (v60.1): render the report catalog as expandable category
            submenus with in-menu search, instead of the generic section list. */}
        {resolvedArea === 'reports' && <ReportsNav />}

        {/* Section is chosen from the compact selector in the header (req #3). */}
        {resolvedArea !== 'reports' && (
        <div className="mt-3 border-t border-subtle pt-2">
          {areaGroups.map((group, gi) => {
            const isOpen = !!open[group.section];
            const hasActive = group.items.some((it) => (it.end ? pathname === it.to : pathname.startsWith(it.to)));
            return (
              <div key={gi} className="mt-1">
                <button type="button" onClick={() => toggle(group.section)} aria-expanded={isOpen}
                  className={`mt-0.5 flex w-full items-center justify-between rounded-lg px-[18px] py-2.5 text-[10.5px] font-bold uppercase tracking-wider transition ${
                    hasActive ? 'text-brand' : 'text-ink-muted hover:bg-faint'}`}>
                  <span>{group.section}</span>
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`h-3 w-3 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} aria-hidden="true">
                    <path d="M7 5l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="mt-0.5">
                    {group.items.map((it) => (
                      <NavLink key={it.key} to={it.to} end={it.end}
                        className={({ isActive }) =>
                          `block rounded-lg py-2.5 pl-[30px] pr-[18px] text-[13px] transition ${
                            isActive ? 'bg-brand-light font-bold text-brand-dark' : 'font-medium text-ink-soft hover:bg-faint'}`}>
                        {it.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </nav>

      {/* Collapsed icon rail — desktop collapsed only. Icons with native tooltips (title) + aria-label;
          active highlighting preserved; navigation works without a refresh (NavLink). */}
      <nav className={`hidden flex-1 flex-col items-center gap-1 overflow-y-auto px-2 pb-6 pt-2 ${collapsed ? 'md:flex' : ''}`}>
        {railItems.map((it) => (
          <NavLink key={it.key} to={it.to} end={it.end} title={it.label} aria-label={it.label}
            className={({ isActive }) =>
              `grid h-10 w-10 place-items-center rounded-lg text-[18px] leading-none transition ${
                isActive ? 'bg-brand-light text-brand-dark ring-1 ring-brand/30' : 'text-ink-soft hover:bg-faint'}`}>
            <span aria-hidden="true">{iconFor(it.key)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer — avatar always; the name text hides on the collapsed desktop rail */}
      <div className={`flex items-center gap-2 border-t border-line px-4 py-3 ${collapsed ? 'md:justify-center md:px-2' : ''}`}>
        <Avatar user={user} />
        <div className={`min-w-0 text-xs text-ink-muted ${collapsed ? 'md:hidden' : ''}`}>
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
