import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Table, EmptyRow, Badge, money, Input } from '../../components/ui';
import { useConfirm } from '../../components/ui/ConfirmDialog';

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [params] = useSearchParams();
  const nav = useNavigate();
  const confirm = useConfirm();
  const customerId = params.get('customer');

  const load = () => api.get('/retail/orders', { params: customerId ? { customerId } : {} }).then((r) => setOrders(r.data));
  useEffect(() => { load(); }, [customerId]);

  const del = async (e, o) => {
    e.stopPropagation();
    if (await confirm({ title: 'Delete order?', message: `${o.orderNo} will be removed.` })) {
      await api.delete(`/retail/orders/${o._id}`); load();
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Retail" title="Orders"
        actions={<Link to="/app/retail/orders/new" className="btn-primary">New order</Link>} />

      <Table head={['Order', 'Customer', 'Type', 'Services', 'Invoice', 'Net amount', 'Date', 'Actions']}>
        {orders.length === 0 && <EmptyRow span={8} text="No orders found." />}
        {orders.map((o) => (
          <tr key={o._id} className="hover:bg-canvas">
            <td className="td font-mono font-medium text-ink cursor-pointer" onClick={() => nav(`/app/retail/orders/${o._id}`)}>{o.orderNo}</td>
            <td className="td">{o.customerId?.name || '—'}</td>
            <td className="td"><Badge>{o.invoiceType || 'DOMESTIC'}</Badge></td>
            <td className="td">{o.services?.map((s) => s.serviceType).join(', ')}</td>
            <td className="td">
              {o.invoiceGenerated
                ? <button onClick={() => nav(`/app/invoices/${o._id}/generate`)} className="font-mono text-brand hover:underline">{o.invoiceNo}</button>
                : <button onClick={() => nav(`/app/invoices/${o._id}/generate`)} className="btn-ghost btn-sm">Generate</button>}
            </td>
            <td className="td">{o.invoiceGenerated ? money(o.netInvoiceAmount) : '—'}</td>
            <td className="td">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
            <td className="td">
              <div className="flex gap-2">
                <button onClick={() => nav(`/app/retail/orders/${o._id}`)} className="btn-ghost btn-sm">View</button>
                <button onClick={(e) => del(e, o)} className="btn-danger btn-sm">Delete</button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
      <p className="mt-3 text-xs text-ink-muted">Employees see only orders they created; Admin/Manager roles see all. Pricing is entered at invoice generation.</p>
    </div>
  );
}
