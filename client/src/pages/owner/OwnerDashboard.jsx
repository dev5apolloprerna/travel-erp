import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Card } from '../../components/ui';

export default function OwnerDashboard() {
  const [masters, setMasters] = useState([]);
  const [counts, setCounts] = useState({});   // { key: totalRecords } — req #4
  useEffect(() => {
    api.get('/owner/masters').then((r) => setMasters(r.data));
    api.get('/owner/masters/counts').then((r) => setCounts(r.data || {})).catch(() => setCounts({}));
  }, []);

  // Order & Invoices and Employees are reached from the Company menu in the sidebar, not from
  // dashboard buttons (req #1/#2), so the operational (virtual) entries are left out of the cards.
  const byMenu = {};
  for (const m of masters) if (!m.virtual) (byMenu[m.menu] = byMenu[m.menu] || []).push(m);

  return (
    <div>
      <PageHeader eyebrow="Company Owner" title="Masters" />
      <p className="mb-5 text-sm text-ink-soft">All master data for your company. Choose a master to view, add, edit or delete its records. Use the <strong>Company</strong> menu for Order &amp; Invoices and Employees.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(byMenu).map(([menu, items]) => (
          <Card key={menu} title={menu}>
            <div className="space-y-1">
              {items.map((m) => (
                <Link key={m.key} to={`/owner/${m.key}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-soft hover:bg-canvas hover:text-brand">
                  <span>{m.label}</span>
                  <span className="shrink-0 rounded-full bg-faint px-2 py-0.5 text-[11px] font-bold text-ink-muted">{counts[m.key] ?? 0}</span>
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
