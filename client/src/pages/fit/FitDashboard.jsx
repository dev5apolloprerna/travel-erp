import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, StatCard, Card } from '../../components/ui';

export default function FitDashboard() {
  const [counts, setCounts] = useState({ doctors: 0, employees: 0, clusters: 0 });
  useEffect(() => {
    Promise.all([
      api.get('/fit/doctors').catch(() => ({ data: [] })),
      api.get('/fit/employees').catch(() => ({ data: [] })),
      api.get('/fit/clusters').catch(() => ({ data: [] })),
    ]).then(([d, e, c]) => setCounts({ doctors: d.data.length, employees: e.data.length, clusters: c.data.length }));
  }, []);

  return (
    <div>
      <PageHeader eyebrow="Society" title="Society Dashboard"
        actions={<Link to="/app/fit/orders/new" className="btn-primary">New booking</Link>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard value={counts.doctors} label="Total DRs" />
        <StatCard value={counts.employees} label="Total Employees" />
        <StatCard value={counts.clusters} label="Clusters" />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card title="Passenger"><Link to="/app/fit/doctors" className="btn-ghost btn-sm">Passenger list</Link></Card>
        <Card title="Members"><Link to="/app/fit/employees" className="btn-ghost btn-sm">Member list</Link></Card>
        <Card title="Orders"><Link to="/app/fit/orders" className="btn-ghost btn-sm">Society orders</Link></Card>
        <Card title="Masters"><p className="mb-3 text-sm text-ink-muted">Cluster, Division, Grade & Department are in the sidebar under FIT Masters.</p></Card>
      </div>
      <p className="mt-4 text-xs text-ink-muted">FIT orders arrive by email (DR or Employee) and are booked by travel desk staff.</p>
    </div>
  );
}
