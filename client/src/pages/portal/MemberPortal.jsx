import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import ProfilePicUpload from '../../components/ui/ProfilePicUpload';
import { PageHeader, StatCard, Card, Table, Tabs, money } from '../../components/ui';
import ChangePassword from '../account/ChangePassword';

export default function MemberPortal() {
  const { user, setUser, logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState('orders');
  const [data, setData] = useState({ orders: [], company: null });

  useEffect(() => { api.get('/b2b/my-orders').then((r) => setData(r.data)); }, []);
  const outstanding = data.company ? data.company.totalBilled - data.company.totalPaid : 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <img src="/logo.png" alt="360 Travel Concierge" className="h-9 w-auto object-contain" />
        <button onClick={() => { logout(); nav('/login/b2b'); }} className="btn-ghost btn-sm">Sign out</button>
      </div>

      <PageHeader eyebrow="B2B Member" title={`${user.name}`} />
      <p className="-mt-3 mb-6 text-sm text-ink-muted">
        View-only portal. To request a booking, email your travel desk — they book on your behalf and record you as the requesting member. Members can’t book or pay.
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard value={data.orders.length} label="My orders" />
        <StatCard value={money(outstanding)} label="Company outstanding (read-only)" />
      </div>

      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'orders', label: 'My Orders' },
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

      {tab === 'orders' && (
      <Card title="My orders">
        <Table head={['Order', 'Services', 'Date', 'Amount']}>
          {data.orders.length === 0 && <tr><td className="td text-ink-muted" colSpan={4}>No orders yet.</td></tr>}
          {data.orders.map((o) => (
            <tr key={o._id}>
              <td className="td font-medium text-ink">{o.orderNo}</td>
              <td className="td">{o.services?.map((s) => s.serviceType).join(', ')}</td>
              <td className="td">{new Date(o.createdAt).toLocaleDateString()}</td>
              <td className="td">{money(o.totalAmount)}</td>
            </tr>
          ))}
        </Table>
      </Card>
      )}
    </div>
  );
}
