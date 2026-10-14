import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader } from '../../components/ui';

// Super Admin "Master Data" hub (req #5). Shows the SAME master catalog the Company Owner has,
// grouped by menu category, each card opening its master management page INSIDE the Super Admin
// panel (/app/master-data/:key) — never redirecting to the Company Owner area.
// Reuses the existing /owner/masters catalog endpoint (open to SUPER_ADMIN).
const BASE = '/app/master-data';

export default function MasterHub() {
  const [groups, setGroups] = useState({});

  useEffect(() => {
    api.get('/owner/masters').then((r) => {
      const g = {};
      // Skip the "virtual" Company-menu shortcuts (they point at operational pages, not masters).
      for (const m of r.data) { if (m.virtual) continue; (g[m.menu] = g[m.menu] || []).push(m); }
      setGroups(g);
    }).catch(() => setGroups({}));
  }, []);

  const menus = Object.keys(groups);

  return (
    <div>
      <PageHeader eyebrow="Super Admin" title="Master Data" />
      <p className="-mt-3 mb-6 text-[13px] text-ink-muted">
        All company master modules — managed here within the Super Admin panel.
      </p>

      {menus.length === 0 && <div className="text-ink-muted">Loading master catalog…</div>}

      <div className="space-y-7">
        {menus.map((menu) => (
          <section key={menu}>
            <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{menu}</div>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {groups[menu].map((m) => (
                <Link key={m.key} to={`${BASE}/${m.key}`}
                  className="rounded-xl2 border border-line bg-white px-4 py-3 text-[13.5px] font-medium text-ink-soft shadow-card transition hover:border-brand hover:text-brand">
                  {m.label}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
