import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Card, Table, Badge } from '../../components/ui';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { formFor, isHotelLike } from '../shared/serviceForms';
import { useShellBase } from '../../hooks/useShellBase';

export default function OrderDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const base = useShellBase();
  const confirm = useConfirm();
  const [data, setData] = useState(null);

  const load = () => api.get(`/retail/orders/${id}`).then((r) => setData(r.data));
  useEffect(() => { load(); }, [id]);

  if (!data) return <div className="text-ink-muted">Loading…</div>;
  const { order } = data;

  // req #2: cancellation only after the invoice is generated (backend re-validates).
  const cancel = async () => {
    if (await confirm({ title: 'Cancel order?', message: `Order ${order.orderNo} will be marked as cancelled. This cannot be undone.` })) {
      await api.put(`/retail/orders/${order._id}/cancel`); load();
    }
  };
  // req #1: hold / release (pre-invoice).
  const hold = async () => {
    if (await confirm({ title: 'Put order on hold?', message: `Order ${order.orderNo} will be placed on hold and cannot be invoiced until released.` })) {
      await api.put(`/retail/orders/${order._id}/hold`); load();
    }
  };
  const release = async () => { await api.put(`/retail/orders/${order._id}/release`); load(); };

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Retail" title={`Order ${order.orderNo}`}
        actions={<div className="flex items-center gap-2">
          {order.cancelled && <Badge status="UNPAID">Cancelled</Badge>}
          {order.invoiceCancelled && !order.cancelled && <Badge status="UNPAID">Invoice cancelled</Badge>}
          {order.onHold && !order.cancelled && <Badge status="PARTIAL">On hold</Badge>}
          {order.invoiceGenerated && !order.cancelled && !order.invoiceCancelled && <Badge status="PAID">Invoiced</Badge>}
          <Badge>{order.invoiceType || 'DOMESTIC'}</Badge>
        </div>} />

      {order.services.map((s, i) => (
        <Card key={i} title={order.services.length > 1 ? `${s.serviceType} — Entry ${String(i + 1).padStart(3, '0')}` : `${s.serviceType} — booking details`} className="mb-4">
          <BookingDetails service={s} />
          {s.passengers?.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Passengers</div>
              <div className="text-sm text-ink">{s.passengers.map((p) => p.name).join(', ')}</div>
            </div>
          )}
        </Card>
      ))}

      <div className="rounded-lg border border-line bg-canvas px-4 py-3 text-sm text-ink-muted">
        Pricing, tax and the invoice for this order are handled at invoice generation.
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => nav(`${base}/retail/orders`)} className="btn-ghost">Back to orders</button>
        {/* req #1/#2: same gating as the listing — Edit before invoice, Cancel after. */}
        {!order.invoiceGenerated && !order.cancelled && (
          <button onClick={() => nav(`${base}/retail/orders/${order._id}/edit`)} className="btn-primary">Edit order</button>
        )}
        {!order.invoiceGenerated && !order.cancelled && !order.onHold && (
          <button onClick={hold} className="btn-ghost">Hold order</button>
        )}
        {order.onHold && !order.cancelled && (
          <button onClick={release} className="btn-ghost">Release hold</button>
        )}
        {order.invoiceGenerated && !order.cancelled && (
          <button onClick={cancel} className="btn-danger">Cancel order</button>
        )}
      </div>
    </div>
  );
}

// Render whatever booking fields the service captured, using the per-service form definition for labels.
function BookingDetails({ service }) {
  const fields = formFor(service.serviceType);
  const shown = fields.filter(([k]) => service[k] !== undefined && service[k] !== '');

  return (
    <>
      <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {shown.length === 0 && <span className="text-ink-muted">No details captured.</span>}
        {shown.map(([k, label]) => (
          <div key={k} className="flex justify-between gap-3">
            <span className="text-ink-muted">{label}</span>
            <span className="text-right font-medium text-ink">{String(service[k])}</span>
          </div>
        ))}
      </div>

      {isHotelLike(service.serviceType) && service.rooms?.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Rooms</div>
          <Table head={['Room Type', 'Meal Plan', 'Rooms', 'Persons']}>
            {service.rooms.map((r, i) => (
              <tr key={i}>
                <td className="td">{r.roomType || '—'}</td>
                <td className="td">{r.mealPlan || '—'}</td>
                <td className="td">{r.roomCount || '—'}</td>
                <td className="td">{r.persons || '—'}</td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </>
  );
}
