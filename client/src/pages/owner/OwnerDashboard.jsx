import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Card } from '../../components/ui';

export default function OwnerDashboard() {
  const [masters, setMasters] = useState([]);
  useEffect(() => { api.get('/owner/masters').then((r) => setMasters(r.data)); }, []);

  const byMenu = {};
  for (const m of masters) (byMenu[m.menu] = byMenu[m.menu] || []).push(m);

  return (
    <div>
      <PageHeader eyebrow="Company Owner" title="Masters" />
      <p className="mb-5 text-sm text-ink-soft">All master data for your company. Choose a master to view, add, edit or delete its records.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(byMenu).map(([menu, items]) => (
          <Card key={menu} title={menu}>
            <div className="space-y-1">
              {items.map((m) => (
                <Link key={m.key} to={`/owner/${m.key}`} className="block rounded-lg px-2 py-1.5 text-sm text-ink-soft hover:bg-canvas hover:text-brand">
                  {m.label}
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
