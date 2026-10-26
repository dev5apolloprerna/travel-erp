import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import api from '../../api/client';

// v60.1 — Reports rendered directly in the sidebar as expandable category
// submenus. Reuses the same /api/reports catalog as the hub (one source of
// truth for permissions + LIVE/PLANNED status). Individual reports link
// straight to /app/reports/:id (existing ReportView), never via the hub.
//
// The hub (/app/reports) remains the bulk-export workspace (date range +
// multi-select PDF), reachable from the "Bulk export" link at the top here.

const OPEN_KEY = 'reportsOpenCats';

// Module-level cache so switching in/out of the Reports area doesn't refetch.
let CATALOG_CACHE = null;

export default function ReportsNav() {
  const { pathname } = useLocation();
  const [catalog, setCatalog] = useState(CATALOG_CACHE || []);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(() => {
    try { const s = window.sessionStorage.getItem(OPEN_KEY); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });

  useEffect(() => {
    if (CATALOG_CACHE) { setCatalog(CATALOG_CACHE); return; }
    let alive = true;
    api.get('/reports')
      .then((r) => { if (!alive) return; CATALOG_CACHE = r.data.catalog || []; setCatalog(CATALOG_CACHE); })
      .catch(() => { if (alive) setErr('Could not load reports.'); });
    return () => { alive = false; };
  }, []);

  useEffect(() => { try { window.sessionStorage.setItem(OPEN_KEY, JSON.stringify(open)); } catch { /* ok */ } }, [open]);

  // Flatten the catalog into ordered categories: one per (type, group). Reports
  // keep their `sub` as a label prefix, exactly like the hub.
  const categories = useMemo(() => {
    const out = [];
    for (const t of catalog) {
      for (const g of t.groups) {
        const reports = g.children.flatMap((c) => c.reports.map((r) => ({ ...r, sub: c.sub })));
        out.push({ key: `${t.type}:${g.group}`, type: t.type, typeLabel: t.typeLabel, group: g.group, reports });
      }
    }
    return out;
  }, [catalog]);

  const activeId = useMemo(() => {
    const m = pathname.match(/^\/app\/reports\/(.+)$/);
    return m ? m[1] : null;
  }, [pathname]);

  // Auto-open the category that owns the active report.
  useEffect(() => {
    if (!activeId || !categories.length) return;
    const cat = categories.find((c) => c.reports.some((r) => r.id === activeId));
    if (cat && !open[cat.key]) setOpen((p) => ({ ...p, [cat.key]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, categories]);

  const needle = q.trim().toLowerCase();
  const searching = needle.length > 0;
  const matchReport = (r, cat) =>
    !searching || [r.label, r.sub, cat.group, cat.typeLabel].filter(Boolean).some((s) => s.toLowerCase().includes(needle));

  const toggle = (key) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  let lastType = null;

  return (
    <div className="mt-3 border-t border-subtle pt-2">
      {/* Search + bulk workspace link */}
      <div className="px-2 pb-1">
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search reports…"
          className="w-full rounded-lg border border-line bg-faint px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-muted/60 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <NavLink to="/app/reports" end
          className={({ isActive }) =>
            `mt-1.5 flex items-center justify-between rounded-lg px-3 py-2 text-[12px] font-semibold transition ${
              isActive ? 'bg-brand-light text-brand-dark' : 'text-ink-muted hover:bg-faint'}`}>
          <span>Bulk export &amp; workspace</span>
          <span aria-hidden="true">⤓</span>
        </NavLink>
      </div>

      {err && <p className="px-3 py-2 text-[12px] text-red-600">{err}</p>}

      {categories.map((cat) => {
        const reports = cat.reports.filter((r) => matchReport(r, cat));
        if (!reports.length) return null;             // hide empties while searching
        const isOpen = searching || !!open[cat.key];
        const hasActive = reports.some((r) => r.id === activeId);

        // Lightweight design-type divider ("Pre Design" / "User Design").
        const divider = cat.typeLabel !== lastType ? cat.typeLabel : null;
        lastType = cat.typeLabel;

        return (
          <div key={cat.key}>
            {divider && (
              <div className="px-[18px] pb-0.5 pt-3 text-[9.5px] font-bold uppercase tracking-widest text-ink-muted/70">{divider}</div>
            )}
            <button type="button" onClick={() => toggle(cat.key)} aria-expanded={isOpen}
              className={`mt-0.5 flex w-full items-center justify-between rounded-lg px-[18px] py-2 text-[10.5px] font-bold uppercase tracking-wider transition ${
                hasActive ? 'text-brand' : 'text-ink-muted hover:bg-faint'}`}>
              <span className="truncate pr-2">{cat.group}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="text-[9px] font-semibold text-ink-muted/60">{reports.length}</span>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"
                  className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} aria-hidden="true">
                  <path d="M7 5l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
            {isOpen && (
              <div className="mt-0.5">
                {reports.map((r) => (
                  <NavLink key={r.id} to={`/app/reports/${r.id}`}
                    title={r.status === 'ready' ? 'Live report' : 'Planned — coming soon'}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-lg py-2 pl-[30px] pr-[14px] text-[12.5px] transition ${
                        isActive ? 'bg-brand-light font-bold text-brand-dark' : 'font-medium text-ink-soft hover:bg-faint'}`}>
                    <span aria-hidden="true"
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${r.status === 'ready' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="truncate">
                      {r.sub && <span className="text-ink-muted">{r.sub} · </span>}{r.label}
                    </span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="px-[18px] pb-2 pt-3 text-[10px] text-ink-muted/60">
        <span className="mr-2"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />Live</span>
        <span><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-slate-300 align-middle" />Planned</span>
      </div>
    </div>
  );
}
