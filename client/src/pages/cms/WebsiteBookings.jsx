import { useEffect, useState } from 'react';
import api from '../../api/client';
import { PageHeader, Card, Field, Input, Table, EmptyRow, Badge, Modal, StatCard, money } from '../../components/ui';

const payStatus = (s) => ({ PAID: 'PAID', PENDING: 'PARTIAL', FAILED: 'UNPAID', REFUNDED: 'UNPAID' }[s] || 'UNPAID');

/** Bookings made on the public website, with their linked ERP order. */
export default function WebsiteBookings() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ search: '', paymentStatus: '', status: '' });
  const [detail, setDetail] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = () => api.get('/cms/bookings', { params: filters }).then((r) => setRows(r.data));
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); /* eslint-disable-next-line */ },
    [filters.search, filters.paymentStatus, filters.status]);

  const open = async (row) => {
    const res = await api.get(`/cms/bookings/${row._id}`);
    setDetail(res.data); setMsg(null);
  };

  const saveDetail = async (patch) => {
    const res = await api.put(`/cms/bookings/${detail._id}`, patch);
    setDetail({ ...detail, ...res.data });
    load();
  };

  const fulfil = async () => {
    try {
      const res = await api.post(`/cms/bookings/${detail._id}/fulfil`);
      setMsg({ type: 'ok', text: res.data.message });
      open(detail); load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Could not create the order.' });
    }
  };

  const paid = rows.filter((r) => r.paymentStatus === 'PAID');
  const revenue = paid.reduce((s, r) => s + (r.totalAmount || 0), 0);

  return (
    <div>
      <PageHeader eyebrow="Website" title="Website Bookings" />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard value={rows.length} label="Bookings shown" />
        <StatCard value={paid.length} label="Paid" />
        <StatCard value={money(revenue)} label="Value of paid bookings" />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Search"><Input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Booking no., name, email, package" /></Field>
          <Field label="Payment">
            <select value={filters.paymentStatus} onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })} className="input">
              <option value="">All payments</option>
              {['PENDING', 'PAID', 'FAILED', 'REFUNDED'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Booking status">
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="input">
              <option value="">All statuses</option>
              {['NEW', 'CONFIRMED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      <Table head={['Booking no.', 'Package', 'Customer', 'Travellers', 'Amount', 'Gateway', 'Payment', 'ERP order', 'Date', '']}>
        {rows.length === 0 && <EmptyRow span={10} text="No website bookings yet." />}
        {rows.map((r) => (
          <tr key={r._id}>
            <td className="td font-mono font-medium text-ink">{r.bookingNo}</td>
            <td className="td">{r.packageName}</td>
            <td className="td">{r.customerName}<br /><span className="text-xs text-ink-muted">{r.customerEmail}</span></td>
            <td className="td">{r.adults}A / {r.children}C</td>
            <td className="td">{r.currency} {(r.totalAmount || 0).toLocaleString('en-IN')}</td>
            <td className="td">{r.gateway}</td>
            <td className="td"><Badge status={payStatus(r.paymentStatus)}>{r.paymentStatus}</Badge></td>
            <td className="td">{r.orderId?.orderNo || <span className="text-ink-muted">—</span>}</td>
            <td className="td">{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
            <td className="td"><button onClick={() => open(r)} className="btn-ghost btn-sm">View</button></td>
          </tr>
        ))}
      </Table>

      {detail && (
        <Modal title={`Booking ${detail.bookingNo}`} onClose={() => setDetail(null)} maxWidth="max-w-3xl">
          {msg && (
            <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${msg.type === 'ok' ? 'bg-accent-light text-accent-dark' : 'bg-red-50 text-red-600'}`}>
              {msg.text}
            </div>
          )}

          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            <Section title="Package">
              <Row label="Package" value={detail.packageName} />
              <Row label="Type" value={detail.packageType} />
              <Row label="Travel date" value={detail.travelDate ? new Date(detail.travelDate).toLocaleDateString('en-IN') : '—'} />
              <Row label="Travellers" value={`${detail.adults} adult(s), ${detail.children} child(ren)`} />
              {detail.passengers?.length > 0 && <Row label="Names" value={detail.passengers.join(', ')} />}
              {detail.specialRequest && <Row label="Special request" value={detail.specialRequest} />}
            </Section>

            <Section title="Customer">
              <Row label="Name" value={detail.customerName} />
              <Row label="Email" value={detail.customerEmail} />
              <Row label="Mobile" value={detail.customerMobile || '—'} />
              <Row label="Address" value={[detail.address, detail.city, detail.state, detail.country].filter(Boolean).join(', ') || '—'} />
            </Section>

            <Section title="Payment">
              <Row label="Per person" value={`${detail.currency} ${detail.pricePerPerson}`} />
              <Row label="Sub total" value={`${detail.currency} ${detail.subTotal}`} />
              <Row label={`GST (${detail.gstPercent}%)`} value={`${detail.currency} ${detail.gstAmount}`} />
              <Row label="Total" value={`${detail.currency} ${detail.totalAmount}`} />
              <Row label="Gateway" value={detail.gateway} />
              <Row label="Status" value={detail.paymentStatus} />
              <Row label="Gateway order id" value={detail.gatewayOrderId || '—'} />
              <Row label="Gateway payment id" value={detail.gatewayPaymentId || '—'} />
              {detail.paymentError && <Row label="Error" value={detail.paymentError} />}
            </Section>

            <Section title="Inside the ERP">
              <Row label="Order" value={detail.orderId?.orderNo || 'Not created yet'} />
              <Row label="Invoice" value={detail.orderId?.invoiceNo || '—'} />
              <Row label="Customer record" value={detail.customerId?.name || '—'} />
              {detail.paymentStatus === 'PAID' && !detail.orderId && (
                <button onClick={fulfil} className="btn-primary btn-sm mt-2">Create ERP order now</button>
              )}
            </Section>

            <Section title="Staff notes">
              <textarea rows={3} className="input w-full" value={detail.staffNotes || ''}
                onChange={(e) => setDetail({ ...detail, staffNotes: e.target.value })} />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select value={detail.status} onChange={(e) => setDetail({ ...detail, status: e.target.value })} className="input w-40">
                  {['NEW', 'CONFIRMED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => saveDetail({ status: detail.status, staffNotes: detail.staffNotes })} className="btn-primary btn-sm">
                  Save notes &amp; status
                </button>
              </div>
            </Section>
          </div>

          <div className="mt-4 text-right"><button onClick={() => setDetail(null)} className="btn-ghost">Close</button></div>
        </Modal>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</div>
      <div className="space-y-1 text-sm">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-ink-muted">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  );
}
