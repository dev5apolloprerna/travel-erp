import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Table, EmptyRow, Badge, money, Input } from '../../components/ui';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useShellBase } from '../../hooks/useShellBase';

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [params] = useSearchParams();
  const nav = useNavigate();
  const confirm = useConfirm();
  const base = useShellBase();
  const customerId = params.get('customer');

  const load = () => api.get('/retail/orders', { params: customerId ? { customerId } : {} }).then((r) => setOrders(r.data));
  useEffect(() => { load(); }, [customerId]);

  const del = async (e, o) => {
    e.stopPropagation();
    if (await confirm({ title: 'Delete order?', message: `${o.orderNo} will be removed.` })) {
      await api.delete(`/retail/orders/${o._id}`); load();
    }
  };

  // req #2: cancellation is only offered AFTER the invoice is generated (and the backend
  // re-validates). It is a soft cancel that keeps the record for invoice history.
  const cancel = async (e, o) => {
    e.stopPropagation();
    if (await confirm({ title: 'Cancel order?', message: `Order ${o.orderNo} will be marked as cancelled. This cannot be undone.` })) {
      await api.put(`/retail/orders/${o._id}/cancel`); load();
    }
  };

  // req #1: put on hold / release. A held order cannot be invoiced until released.
  const hold = async (e, o) => {
    e.stopPropagation();
    if (await confirm({ title: 'Put order on hold?', message: `Order ${o.orderNo} will be placed on hold and cannot be invoiced until released.` })) {
      await api.put(`/retail/orders/${o._id}/hold`); load();
    }
  };
  const release = async (e, o) => {
    e.stopPropagation();
    await api.put(`/retail/orders/${o._id}/release`); load();
  };

  return (
    <div>
      <PageHeader eyebrow="Retail" title="Orders"
        actions={<Link to={`${base}/retail/orders/new`} className="btn-primary">New order</Link>} />

      <Table head={['Order', 'Customer', 'Type', 'Services', 'Invoice', 'Net amount', 'Date', 'Actions']}>
        {orders.length === 0 && <EmptyRow span={8} text="No orders found." />}
        {orders.map((o) => (
          <tr key={o._id} className="hover:bg-canvas">
            <td className="td font-mono font-medium text-ink cursor-pointer" onClick={() => nav(`${base}/retail/orders/${o._id}`)}>{o.orderNo}</td>
            <td className="td">{o.customerId?.name || '—'}</td>
            <td className="td"><Badge>{o.invoiceType || 'DOMESTIC'}</Badge></td>
            <td className="td">{o.services?.map((s) => s.serviceType).join(', ')}</td>
            <td className="td">
              {o.cancelled
                ? <Badge status="UNPAID">Cancelled</Badge>
                : o.invoiceCancelled
                  ? <Badge status="UNPAID">Invoice cancelled</Badge>
                  : o.invoiceGenerated
                    ? <button onClick={() => nav(`${base}/invoices/${o._id}/generate`)} className="font-mono text-brand hover:underline">{o.invoiceNo}</button>
                    : o.onHold
                      ? <Badge status="PARTIAL">On hold</Badge>
                      : <button onClick={() => nav(`${base}/invoices/${o._id}/generate`)} className="btn-ghost btn-sm">Generate</button>}
            </td>
            <td className="td">{o.invoiceGenerated ? money(o.netInvoiceAmount) : '—'}</td>
            <td className="td">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
            <td className="td">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => nav(`${base}/retail/orders/${o._id}`)} className="btn-ghost btn-sm">View</button>
                {/* req #1: Edit only BEFORE an invoice exists (and not cancelled) */}
                {!o.invoiceGenerated && !o.cancelled && (
                  <button onClick={() => nav(`${base}/retail/orders/${o._id}/edit`)} className="btn-ghost btn-sm">Edit</button>
                )}
                {/* req #1: Hold (pre-invoice) / Release */}
                {!o.invoiceGenerated && !o.cancelled && !o.onHold && (
                  <button onClick={(e) => hold(e, o)} className="btn-ghost btn-sm">Hold</button>
                )}
                {o.onHold && !o.cancelled && (
                  <button onClick={(e) => release(e, o)} className="btn-ghost btn-sm">Release</button>
                )}
                {/* req #2: Cancel only AFTER an invoice exists (and not already cancelled) */}
                {o.invoiceGenerated && !o.cancelled && (
                  <button onClick={(e) => cancel(e, o)} className="btn-danger btn-sm">Cancel</button>
                )}
                {/* req #2: Delete hidden once an invoice exists or the order is cancelled */}
                {!o.invoiceGenerated && !o.cancelled && (
                  <button onClick={(e) => del(e, o)} className="btn-danger btn-sm">Delete</button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>
      <p className="mt-3 text-xs text-ink-muted">Employees see only orders they created; Admin/Manager roles see all. Pricing is entered at invoice generation.</p>
    </div>
  );
}
