import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Card, Field, Input, money } from '../../components/ui';
import { formFor } from '../shared/serviceForms';

// Charge heads from the ePrompt air-ticket invoice. Unused stay 0 for other services.
const CHARGE_HEADS = [
  ['basic', 'Basic'],
  ['yqTax', 'YQ Tax'],
  ['yrTax', 'YR Tax'],
  ['k3Tax', 'K3 Tax'],
  ['ocTax', 'OC Tax'],
  ['otherTax', 'Other Tax'],
  ['processingCharges', 'Processing Charges'],
  ['otherCharges', 'Other Charges'],
  ['markup', 'Markup'],
];

const FOOTER = [
  ['discountAmount', 'Discount Amount', '-'],
  ['tdsAmount', 'TDS Amount', '-'],
  ['tcsAmount', 'TCS Amount', '-'],
  ['govtTaxAmount', "Govt Tax Amount", '+'],
];

const n = (v) => (Number(v) || 0);

export default function InvoiceGenerate() {
  const { orderId } = useParams();
  const nav = useNavigate();

  const [order, setOrder] = useState(null);
  const [party, setParty] = useState(null);
  const [charges, setCharges] = useState(Object.fromEntries(CHARGE_HEADS.map(([k]) => [k, ''])));
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
      // Pre-fill if an invoice was already generated (edit/regenerate).
      const o = r.data.order;
      if (o.invoiceGenerated && o.invoiceCharges) {
        setCharges(Object.fromEntries(CHARGE_HEADS.map(([k]) => [k, o.invoiceCharges[k] || ''])));
        setFooter({
          discountAmount: o.discountAmount || '', tdsAmount: o.tdsAmount || '',
          tcsAmount: o.tcsAmount || '', govtTaxAmount: o.govtTaxAmount || '',
        });
        if (o.invoiceDate) setInvoiceDate(String(o.invoiceDate).slice(0, 10));
        setNotes(o.invoiceNotes || '');
      }
    }).catch(() => setError('Could not load this order.'));
  }, [orderId]);

  const grossTotal = useMemo(() => CHARGE_HEADS.reduce((s, [k]) => s + n(charges[k]), 0), [charges]);
  const netAmount = useMemo(
    () => grossTotal - n(footer.discountAmount) - n(footer.tdsAmount) - n(footer.tcsAmount) + n(footer.govtTaxAmount),
    [grossTotal, footer]
  );

  const generate = async () => {
    setError(''); setSaving(true);
    try {
      const res = await api.post(`/invoices/${orderId}/generate`, {
        charges: Object.fromEntries(CHARGE_HEADS.map(([k]) => [k, n(charges[k])])),
        discountAmount: n(footer.discountAmount),
        tdsAmount: n(footer.tdsAmount),
        tcsAmount: n(footer.tcsAmount),
        govtTaxAmount: n(footer.govtTaxAmount),
        invoiceDate, invoiceNotes: notes,
      });
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

  if (!order) return <div className="text-ink-muted">{error || 'Loading…'}</div>;

  const line = order.services?.[0] || {};
  const fields = formFor(line.serviceType);
  const shownDetails = fields.filter(([k]) => line[k] !== undefined && line[k] !== '');

  const backTo = order.module === 'B2B'
    ? (order.companyId ? `/app/b2b/companies/${order.companyId}?tab=orders` : '/app/b2b/companies')
    : order.module === 'FIT' ? '/app/fit/orders' : '/app/retail/orders';

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow={`${order.module === 'FIT' ? 'Society' : order.module} · ${order.orderNo}`} title="Generate invoice" />
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
              <Field label="Service"><Input value={order.services?.length > 1 ? `${line.serviceType} (${order.services.length} entries)` : (line.serviceType || '—')} disabled /></Field>
              <Field label="Invoice date"><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></Field>
            </div>
            {shownDetails.length > 0 && (
              <div className="mt-3 grid gap-x-6 gap-y-1 rounded-lg bg-canvas p-3 text-sm sm:grid-cols-2">
                {shownDetails.map(([k, label]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <span className="text-ink-muted">{label}</span>
                    <span className="font-medium text-ink">{String(line[k])}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Charges">
              <div className="space-y-2">
                {CHARGE_HEADS.map(([k, label]) => (
                  <div key={k} className="grid grid-cols-[1fr_130px] items-center gap-2">
                    <span className="text-sm text-ink-soft">{label}</span>
                    <Input type="number" value={charges[k]} onChange={(e) => setCharges({ ...charges, [k]: e.target.value })} placeholder="0" />
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Totals">
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_130px] items-center gap-2">
                  <span className="text-sm font-semibold text-ink">Gross Total</span>
                  <div className="text-right font-semibold text-ink">{money(grossTotal)}</div>
                </div>
                {FOOTER.map(([k, label, sign]) => (
                  <div key={k} className="grid grid-cols-[1fr_130px] items-center gap-2">
                    <span className="text-sm text-ink-soft">{label} <span className="text-ink-muted">({sign})</span></span>
                    <Input type="number" value={footer[k]} onChange={(e) => setFooter({ ...footer, [k]: e.target.value })} placeholder="0" />
                  </div>
                ))}
                <div className="mt-2 grid grid-cols-[1fr_130px] items-center gap-2 border-t border-line pt-3">
                  <span className="text-sm font-bold text-ink">Net Invoice Amount</span>
                  <div className="text-right text-lg font-bold text-brand">{money(netAmount)}</div>
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
