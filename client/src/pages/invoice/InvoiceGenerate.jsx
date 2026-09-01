import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Card, Field, Input, money } from '../../components/ui';
import { formFor } from '../shared/serviceForms';
import { chargeCalc, hotelCalc } from './invoiceCalc';

const FOOTER = [
  ['discountAmount', 'Discount Amount', '-'],
  ['tdsAmount', 'TDS Amount', '-'],
  ['tcsAmount', 'TCS Amount', '-'],
  ['govtTaxAmount', 'Govt Tax Amount', '+'],
];
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export default function InvoiceGenerate() {
  const { orderId } = useParams();
  const nav = useNavigate();

  const [order, setOrder] = useState(null);
  const [party, setParty] = useState(null);
  const [calc, setCalc] = useState(null);           // { serviceType, isHotel, charges[], markups[], labels{} }
  const [charges, setCharges] = useState({});        // charge-head values
  const [rooms, setRooms] = useState([]);            // hotel rooms
  const [footer, setFooter] = useState(Object.fromEntries(FOOTER.map(([k]) => [k, ''])));
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    api.get(`/invoices/${orderId}`).then((r) => {
      setOrder(r.data.order);
      setParty(r.data.party);
      setCalc(r.data.calc);
      const o = r.data.order;
      // Pre-fill charge heads if regenerating.
      if (o.invoiceGenerated && o.invoiceCharges) {
        setCharges(o.invoiceCharges);
        setFooter({
          discountAmount: o.discountAmount || '', tdsAmount: o.tdsAmount || '',
          tcsAmount: o.tcsAmount || '', govtTaxAmount: o.govtTaxAmount || '',
        });
        if (o.invoiceDate) setInvoiceDate(String(o.invoiceDate).slice(0, 10));
        setNotes(o.invoiceNotes || '');
      }
      // Hotel: seed rooms from booking (or previously-saved invoice rooms).
      if (r.data.calc?.isHotel) {
        const src = (o.invoiceRooms?.length ? o.invoiceRooms : o.services?.[0]?.rooms) || [];
        setRooms(src.map((rm) => ({
          roomType: rm.roomType || '', roomCount: rm.roomCount || rm.rooms || '',
          rate: rm.rate || '', taxPercent: rm.taxPercent || '',
        })));
      }
    }).catch(() => setError('Could not load this order.'));
  }, [orderId]);

  // Live totals — service-wise.
  const result = useMemo(() => {
    if (!calc) return null;
    return calc.isHotel ? hotelCalc(rooms, footer) : chargeCalc(calc.serviceType, charges, footer);
  }, [calc, charges, rooms, footer]);

  const generate = async () => {
    setError(''); setSaving(true);
    try {
      const body = {
        discountAmount: n(footer.discountAmount), tdsAmount: n(footer.tdsAmount),
        tcsAmount: n(footer.tcsAmount), govtTaxAmount: n(footer.govtTaxAmount),
        invoiceDate, invoiceNotes: notes,
      };
      if (calc.isHotel) body.rooms = rooms;
      else body.charges = Object.fromEntries((calc.charges.concat(calc.markups)).map((k) => [k, n(charges[k])]));
      const res = await api.post(`/invoices/${orderId}/generate`, body);
      setDone(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate the invoice.');
    } finally { setSaving(false); }
  };

  const downloadPdf = async () => {
    const res = await api.get(`/invoices/${orderId}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${done?.invoiceNo || 'invoice'}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const setRoom = (i, k, v) => setRooms((rs) => rs.map((r, x) => (x === i ? { ...r, [k]: v } : r)));
  const addRoom = () => setRooms((rs) => [...rs, { roomType: '', roomCount: '', rate: '', taxPercent: '' }]);
  const removeRoom = (i) => setRooms((rs) => rs.filter((_, x) => x !== i));

  if (!order || !calc) return <div className="text-ink-muted">{error || 'Loading…'}</div>;

  const line = order.services?.[0] || {};
  const backTo = order.module === 'B2B'
    ? (order.companyId ? `/app/b2b/companies/${order.companyId}?tab=orders` : '/app/b2b/companies')
    : order.module === 'FIT' ? '/app/fit/orders' : '/app/retail/orders';

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow={`${order.module === 'FIT' ? 'Society' : order.module} · ${order.orderNo}`}
        title={`Generate invoice — ${calc.serviceType}`} />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      {done ? (
        <Card>
          <div className="rounded-lg bg-accent-light px-4 py-3 text-sm text-accent-dark">
            Invoice <b>{done.invoiceNo}</b> generated. Net amount <b>{money(done.netInvoiceAmount)}</b>.
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={downloadPdf} className="btn-primary">Download PDF</button>
            <button onClick={() => nav(backTo)} className="btn-ghost">Back to orders</button>
          </div>
        </Card>
      ) : (
        <>
          <Card title="Invoice details" className="mb-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Bill to"><Input value={party?.name || '—'} disabled /></Field>
              <Field label="Service"><Input value={order.services?.length > 1 ? `${calc.serviceType} (${order.services.length} entries)` : calc.serviceType} disabled /></Field>
              <Field label="Invoice date"><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></Field>
            </div>
          </Card>

          {calc.isHotel ? (
            <Card title="Rooms" className="mb-0">
              <div className="mb-2 hidden gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted sm:grid sm:grid-cols-[1.4fr_0.8fr_0.9fr_0.8fr_1fr_1fr_auto]">
                <span>Room Type</span><span>Rooms</span><span>Rate</span><span>Tax %</span><span>Room Amt</span><span>Tax Amt</span><span></span>
              </div>
              {rooms.map((r, i) => {
                const amt = n(r.rate) * n(r.roomCount);
                const tax = amt * (n(r.taxPercent) / 100);
                return (
                  <div key={i} className="mb-2 grid items-center gap-2 sm:grid-cols-[1.4fr_0.8fr_0.9fr_0.8fr_1fr_1fr_auto]">
                    <Input placeholder="Room Type" value={r.roomType} onChange={(e) => setRoom(i, 'roomType', e.target.value)} />
                    <Input type="number" placeholder="Rooms" value={r.roomCount} onChange={(e) => setRoom(i, 'roomCount', e.target.value)} />
                    <Input type="number" placeholder="Rate" value={r.rate} onChange={(e) => setRoom(i, 'rate', e.target.value)} />
                    <Input type="number" placeholder="Tax %" value={r.taxPercent} onChange={(e) => setRoom(i, 'taxPercent', e.target.value)} />
                    <div className="text-right text-sm text-ink-soft">{money(amt)}</div>
                    <div className="text-right text-sm text-ink-soft">{money(tax)}</div>
                    <button type="button" onClick={() => removeRoom(i)} className="btn-ghost btn-sm">Remove</button>
                  </div>
                );
              })}
              <button type="button" onClick={addRoom} className="btn-ghost btn-sm">+ Add room</button>
            </Card>
          ) : (
            <Card title="Charges">
              <div className="grid gap-x-8 gap-y-2 lg:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Charges</div>
                  {calc.charges.map((k) => (
                    <div key={k} className="grid grid-cols-[1fr_130px] items-center gap-2">
                      <span className="text-sm text-ink-soft">{calc.labels[k] || k}</span>
                      <Input type="number" value={charges[k] ?? ''} onChange={(e) => setCharges({ ...charges, [k]: e.target.value })} placeholder="0" />
                    </div>
                  ))}
                </div>
                {calc.markups.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Markup</div>
                    {calc.markups.map((k) => (
                      <div key={k} className="grid grid-cols-[1fr_130px] items-center gap-2">
                        <span className="text-sm text-ink-soft">{calc.labels[k] || k}</span>
                        <Input type="number" value={charges[k] ?? ''} onChange={(e) => setCharges({ ...charges, [k]: e.target.value })} placeholder="0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card title="Totals">
              <div className="space-y-2">
                {calc.isHotel ? (
                  <>
                    <Row label="Total Room Amount" value={money(result.totalRoomAmount)} />
                    <Row label="Total Hotel Tax" value={money(result.totalHotelTax)} />
                  </>
                ) : (
                  <>
                    <Row label="Charges Total" value={money(result.chargesTotal)} />
                    {calc.markups.length > 0 && <Row label="Markup Total" value={money(result.markupTotal)} />}
                  </>
                )}
                <div className="grid grid-cols-[1fr_130px] items-center gap-2 border-t border-line pt-2">
                  <span className="text-sm font-semibold text-ink">Gross Total</span>
                  <div className="text-right font-semibold text-ink">{money(result.grossTotal)}</div>
                </div>
              </div>
            </Card>

            <Card title="Net">
              <div className="space-y-2">
                {FOOTER.map(([k, label, sign]) => (
                  <div key={k} className="grid grid-cols-[1fr_130px] items-center gap-2">
                    <span className="text-sm text-ink-soft">{label} <span className="text-ink-muted">({sign})</span></span>
                    <Input type="number" value={footer[k]} onChange={(e) => setFooter({ ...footer, [k]: e.target.value })} placeholder="0" />
                  </div>
                ))}
                <div className="mt-2 grid grid-cols-[1fr_130px] items-center gap-2 border-t border-line pt-3">
                  <span className="text-sm font-bold text-ink">Net Invoice Amount</span>
                  <div className="text-right text-lg font-bold text-brand">{money(result.netInvoiceAmount)}</div>
                </div>
                <p className="pt-1 text-xs text-ink-muted">Net = Gross − Discount − TDS − TCS + Govt Tax</p>
              </div>
            </Card>
          </div>

          <Card title="Notes (optional)" className="mt-4">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any note to print on the invoice" />
          </Card>

          <div className="mt-4 flex gap-2">
            <button onClick={generate} disabled={saving} className="btn-primary">
              {saving ? 'Generating…' : order.invoiceGenerated ? 'Regenerate invoice' : 'Generate invoice'}
            </button>
            <button onClick={() => nav(backTo)} className="btn-ghost">Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="grid grid-cols-[1fr_130px] items-center gap-2">
      <span className="text-sm text-ink-soft">{label}</span>
      <div className="text-right text-sm text-ink">{value}</div>
    </div>
  );
}
