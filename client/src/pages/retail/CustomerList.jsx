import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Table, EmptyRow, Input } from '../../components/ui';
import { useConfirm } from '../../components/ui/ConfirmDialog';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const nav = useNavigate();
  const confirm = useConfirm();

  const load = () => api.get('/retail/customers', { params: { search } }).then((r) => setCustomers(r.data));
  const del = async (c) => { if (await confirm({ title: 'Delete customer?', message: `${c.name} will be removed.` })) { await api.delete(`/retail/customers/${c._id}`); load(); } };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div>
      <PageHeader eyebrow="Retail" title="Customers"
        actions={<Link to="/app/retail/customers/new" className="btn-primary">New customer</Link>} />

      <div className="mb-4 flex gap-2">
        <Input placeholder="Search by name…" value={search}
          onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <button onClick={load} className="btn-ghost">Search</button>
      </div>

      <Table head={['Customer', 'Mobile', 'Email', 'City / State', 'Actions']}>
        {customers.length === 0 && <EmptyRow span={5} text="No customers yet. Create your first one." />}
        {customers.map((c) => (
          <tr key={c._id} className="hover:bg-canvas">
            <td className="td font-medium text-ink">{c.name}</td>
            <td className="td">{c.mobile || '—'}</td>
            <td className="td">{c.email}</td>
            <td className="td">{[c.city, c.state].filter(Boolean).join(', ') || '—'}</td>
            <td className="td">
              <div className="flex gap-2">
                <button onClick={() => nav(`/app/retail/orders/new?customer=${c._id}`)} className="btn-accent btn-sm">Book now</button>
                <button onClick={() => nav(`/app/retail/orders?customer=${c._id}`)} className="btn-ghost btn-sm">Orders</button>
                <button onClick={() => nav(`/app/retail/customers/${c._id}/edit`)} className="btn-ghost btn-sm">Edit</button>
                <button onClick={() => del(c)} className="btn-danger btn-sm">Delete</button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
      <p className="mt-3 text-xs text-ink-muted">“Book now” starts a booking with this customer already selected — no dropdown search needed.</p>
    </div>
  );
}
