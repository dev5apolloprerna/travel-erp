import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { PageHeader, StatCard, Card, money } from '../components/ui';

export default function EmployeeDashboard() {
  const [stats, setStats] = useState({ customers: 0, orders: 0, companies: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/retail/customers').catch(() => ({ data: [] })),
      api.get('/retail/orders').catch(() => ({ data: [] })),
      api.get('/b2b/companies').catch(() => ({ data: [] })),
    ]).then(([c, o, co]) => {
      const due = o.data.reduce((s, x) => s + (x.totalAmount - x.paidAmount), 0);
      setStats({ customers: c.data.length, orders: o.data.length, companies: co.data.length, due });
    });
  }, []);

  return (
    <div>
      <PageHeader eyebrow="Overview" title="Dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={stats.customers} label="Retail Customers" />
        <StatCard value={stats.orders} label="Retail Orders" />
        <StatCard value={stats.companies} label="B2B Companies" />
        <StatCard value={money(stats.due || 0)} label="Retail Pending" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card title="Retail">
          <p className="mb-4 text-sm text-ink-muted">Create customers and book flights, hotels, transfers and packages.</p>
          <div className="flex flex-wrap gap-2">
            <Link to="/app/retail/customers/new" className="btn-primary btn-sm">New customer</Link>
            <Link to="/app/retail/orders" className="btn-ghost btn-sm">View orders</Link>
          </div>
        </Card>
        <Card title="B2B">
          <p className="mb-4 text-sm text-ink-muted">Manage companies, members and lump-sum account payments.</p>
          <Link to="/app/b2b/companies" className="btn-ghost btn-sm">Companies</Link>
        </Card>
        <Card title="Society">
          <p className="mb-4 text-sm text-ink-muted">Clusters, grades, DR &amp; employee masters and bookings.</p>
          <Link to="/app/fit" className="btn-ghost btn-sm">Society dashboard</Link>
        </Card>
      </div>
    </div>
  );
}
