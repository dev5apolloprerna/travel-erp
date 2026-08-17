import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Card, Table, Badge } from '../../components/ui';
import { formFor, isHotelLike } from '../shared/serviceForms';

export default function OrderDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => { api.get(`/retail/orders/${id}`).then((r) => setData(r.data)); }, [id]);

  if (!data) return <div className="text-ink-muted">Loading…</div>;
  const { order } = data;

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Retail" title={`Order ${order.orderNo}`}
        actions={<Badge>{order.invoiceType || 'DOMESTIC'}</Badge>} />

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

      <div className="mt-4">
        <button onClick={() => nav('/app/retail/orders')} className="btn-ghost">Back to orders</button>
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
