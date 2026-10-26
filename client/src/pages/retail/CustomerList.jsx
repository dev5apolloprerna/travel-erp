import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Table, EmptyRow, Input } from '../../components/ui';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useShellBase } from '../../hooks/useShellBase';

const MENU = 'retail-customers';   // permission key for customer CRUD
const ORDER_MENU = 'retail-orders'; // order actions respect the Orders permission, not customer access

export default function CustomerList() {
  const { can } = useAuth();
  const canCreate = can(MENU, 'CREATE'), canEdit = can(MENU, 'EDIT'), canDelete = can(MENU, 'DELETE');
  // Order-creation / order-viewing actions are gated by the Orders permission, independently of
  // whether the Orders menu is visible (the button must check the real permission directly).
  const canBookOrder = can(ORDER_MENU, 'CREATE');
  const canViewOrders = can(ORDER_MENU, 'READ') || can(ORDER_MENU, 'SELECT');
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const nav = useNavigate();
  const confirm = useConfirm();
  const base = useShellBase();

  const load = () => api.get('/retail/customers', { params: { search } }).then((r) => setCustomers(r.data));
  const del = async (c) => {
    setError('');
    if (await confirm({ title: 'Delete customer?', message: `${c.name} will be removed.` })) {
      try { await api.delete(`/retail/customers/${c._id}`); load(); }
      catch (err) { setError(err.response?.data?.message || 'Could not delete the customer.'); }
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div>
      <PageHeader eyebrow="Retail" title="Customers"
        actions={canCreate ? <Link to={`${base}/retail/customers/new`} className="btn-primary">New customer</Link> : null} />

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

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
                {canBookOrder && <button onClick={() => nav(`${base}/retail/orders/new?customer=${c._id}`)} className="btn-accent btn-sm">Book now</button>}
                {canViewOrders && <button onClick={() => nav(`${base}/retail/orders?customer=${c._id}`)} className="btn-ghost btn-sm">Orders</button>}
                {canEdit && <button onClick={() => nav(`${base}/retail/customers/${c._id}/edit`)} className="btn-ghost btn-sm">Edit</button>}
                {canDelete && <button onClick={() => del(c)} className="btn-danger btn-sm">Delete</button>}
              </div>
            </td>
          </tr>
        ))}
      </Table>
      <p className="mt-3 text-xs text-ink-muted">“Book now” starts a booking with this customer already selected — no dropdown search needed.</p>
    </div>
  );
}
