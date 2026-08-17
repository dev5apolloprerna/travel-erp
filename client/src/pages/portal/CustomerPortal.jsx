import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import ProfilePicUpload from '../../components/ui/ProfilePicUpload';
import { PageHeader, StatCard, Card, Table, Badge, Field, Input, Select, Tabs, money } from '../../components/ui';
import ChangePassword from '../account/ChangePassword';
import DocumentManager from '../../components/ui/DocumentManager';

export default function CustomerPortal() {
  const { user, setUser, logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState('bookings');
  const [orders, setOrders] = useState([]);
  const [active, setActive] = useState(null);
  const [pay, setPay] = useState({ amount: '', mode: 'ONLINE', type: 'PARTIAL' });

  const load = () => api.get('/retail/orders', { params: { customerId: user.customerId } }).then((r) => setOrders(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const due = orders.reduce((s, o) => s + (o.totalAmount - o.paidAmount), 0);

  const downloadInvoice = async (order) => {
    try {
      const res = await api.get(`/invoices/${order._id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${order.invoiceNo || order.orderNo}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const submitPayment = async () => {
    await api.post(`/retail/orders/${active._id}/payments`, { ...pay, amount: Number(pay.amount), paidByCustomer: true });
    setActive(null); setPay({ amount: '', mode: 'ONLINE', type: 'PARTIAL' }); load();
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <img src="/logo.png" alt="360 Travel Concierge" className="h-9 w-auto object-contain" />
        <button onClick={() => { logout(); nav('/login/retail'); }} className="btn-ghost btn-sm">Sign out</button>
      </div>

      <PageHeader eyebrow="My account" title={`Welcome, ${user.name}`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard value={orders.length} label="Total bookings" />
        <StatCard value={money(due)} label="Amount due" />
        <StatCard value={orders.filter((o) => o.status === 'PAID').length} label="Fully paid" />
      </div>

      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'bookings', label: 'My Bookings' },
        { key: 'profile', label: 'Profile' },
        { key: 'password', label: 'Change Password' },
      ]} />

      {tab === 'profile' && (
        <Card title="Profile picture">
          <ProfilePicUpload value={user?.profilePic} name={user?.name}
            onChange={(profilePic) => setUser?.((u) => ({ ...u, profilePic }))} />
        </Card>
      )}

      {tab === 'password' && <ChangePassword bare />}

      {tab === 'bookings' && (
      <Card title="My bookings & invoices">
        <Table head={['Order', 'Invoice', 'Services', 'Total', 'Due', 'Status', '']}>
          {orders.map((o) => (
            <tr key={o._id}>
              <td className="td font-medium text-ink">{o.orderNo}</td>
              <td className="td">
                <button onClick={() => downloadInvoice(o)} className="text-brand hover:underline">
                  {o.invoiceNo || 'Download'}
                </button>
              </td>
              <td className="td">{o.services?.map((s) => s.serviceType).join(', ')}</td>
              <td className="td">{money(o.totalAmount)}</td>
              <td className="td">{money(o.totalAmount - o.paidAmount)}</td>
              <td className="td"><Badge status={o.status} /></td>
              <td className="td">{o.status !== 'PAID' && <button onClick={() => setActive(o)} className="btn-accent btn-sm">Pay</button>}</td>
            </tr>
          ))}
        </Table>
      </Card>
      )}

      {active && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={() => setActive(null)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 text-xl font-bold">Pay {active.orderNo}</h2>
            <p className="mb-4 text-sm text-ink-muted">Balance {money(active.totalAmount - active.paidAmount)}</p>
            <div className="space-y-3">
              <Field label="Type"><Select value={pay.type} onChange={(e) => setPay({ ...pay, type: e.target.value })}><option value="PARTIAL">Partial</option><option value="FULL">Full</option></Select></Field>
              <Field label="Amount"><Input type="number" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Field>
              <Field label="Method"><Select value={pay.mode} onChange={(e) => setPay({ ...pay, mode: e.target.value })}><option>ONLINE</option><option>UPI</option><option>CARD</option></Select></Field>
              <button onClick={submitPayment} className="btn-accent w-full">Pay now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
