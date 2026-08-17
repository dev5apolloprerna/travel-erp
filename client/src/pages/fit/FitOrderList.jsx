import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Table, EmptyRow, Badge, RowActions } from '../../components/ui';
import { useNavigate } from 'react-router-dom';

export default function SocietyOrderList() {
  const [orders, setOrders] = useState([]);
  const confirm = useConfirm();
  const nav = useNavigate();

  const load = () => api.get('/fit/orders').then((r) => setOrders(r.data));
  useEffect(() => { load(); }, []);

  const del = async (o) => {
    if (await confirm({ title: 'Delete order?', message: `${o.orderNo} will be removed.` }))
      { await api.delete(`/fit/orders/${o._id}`); load(); }
  };

  return (
    <div>
      <PageHeader eyebrow="Society" title="Society Orders"
        actions={<Link to="/app/fit/orders/new" className="btn-primary">New booking</Link>} />

      <Table head={['Order', 'Type', 'Passenger', 'Division', 'Services', 'Invoice', 'Date', 'Actions']}>
        {orders.length === 0 && <EmptyRow span={8} text="No Society orders yet." />}
        {orders.map((o) => (
          <tr key={o._id}>
            <td className="td font-mono font-medium text-ink">{o.orderNo}</td>
            <td className="td"><Badge>{o.invoiceType || 'DOMESTIC'}</Badge></td>
            <td className="td">{o.societyPassenger?.name ? `${o.societyPassenger.drCode} — ${o.societyPassenger.name}` : '—'}</td>
            <td className="td">{o.societyPassenger?.divisionName || '—'}</td>
            <td className="td">{o.services?.map((s) => s.serviceType).join(', ')}</td>
            <td className="td">
              {o.invoiceGenerated
                ? <button onClick={() => nav(`/app/invoices/${o._id}/generate`)} className="font-mono text-brand hover:underline">{o.invoiceNo}</button>
                : <button onClick={() => nav(`/app/invoices/${o._id}/generate`)} className="btn-ghost btn-sm">Generate</button>}
            </td>
            <td className="td">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
            <td className="td"><RowActions onDelete={() => del(o)} /></td>
          </tr>
        ))}
      </Table>
      <p className="mt-3 text-xs text-ink-muted">Orders capture booking details. Pricing and invoices are handled at invoice generation.</p>
    </div>
  );
}
