import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Field, Input, Select, Table, EmptyRow, RowActions, Modal, money } from '../../components/ui';

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const r2 = (v) => Math.round(n(v) * 100) / 100;
const blankForm = () => ({ mainCompanyId: '', invoiceDate: new Date().toISOString().slice(0, 10), lines: [{ description: '', amount: '' }], discountAmount: '', tdsAmount: '', tcsAmount: '', govtTaxAmount: '', notes: '' });

/** Level-1 invoices: Main Company (supplier) -> 360 agency. Separate from customer invoices. */
export default function SupplierInvoices() {
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [mains, setMains] = useState([]);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/supplier-invoices').then((r) => setRows(r.data));
  useEffect(() => { load(); api.get('/org/main').then((r) => setMains(r.data)); }, []);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setLine = (i, k, v) => set('lines', form.lines.map((l, x) => (x === i ? { ...l, [k]: v } : l)));
  const addLine = () => set('lines', [...form.lines, { description: '', amount: '' }]);
  const delLine = (i) => set('lines', form.lines.filter((_, x) => x !== i));

  const totals = useMemo(() => {
    if (!form) return { gross: 0, net: 0 };
    const gross = r2((form.lines || []).reduce((s, l) => s + n(l.amount), 0));
    const net = r2(gross - n(form.discountAmount) - n(form.tdsAmount) - n(form.tcsAmount) + n(form.govtTaxAmount));
    return { gross, net };
  }, [form]);

  const save = async () => {
    setError('');
    if (!form.mainCompanyId) return setError('Select a Main Company.');
    try {
      if (editId) await api.put(`/supplier-invoices/${editId}`, form);
      else await api.post('/supplier-invoices', form);
      setForm(null); setEditId(null); load();
    } catch (err) { setError(err.response?.data?.message || 'Could not save.'); }
  };
  const del = async (row) => {
    if (!(await confirm({ title: 'Delete supplier invoice?', message: `${row.invoiceNo} will be removed.` }))) return;
    await api.delete(`/supplier-invoices/${row._id}`); load();
  };
  // req #5: download the supplier invoice PDF. Uses an authenticated blob request
  // (the axios client attaches the JWT) and reuses the server's existing invoice PDF.
  const download = async (row) => {
    const res = await api.get(`/supplier-invoices/${row._id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${row.invoiceNo || 'supplier-invoice'}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };
  const edit = async (row) => {
    const r = await api.get(`/supplier-invoices/${row._id}`);
    const d = r.data;
    setForm({
      mainCompanyId: d.mainCompanyId?._id || d.mainCompanyId, invoiceDate: String(d.invoiceDate).slice(0, 10),
      lines: d.lines?.length ? d.lines.map((l) => ({ description: l.description, amount: l.amount })) : [{ description: '', amount: '' }],
      discountAmount: d.discountAmount || '', tdsAmount: d.tdsAmount || '', tcsAmount: d.tcsAmount || '', govtTaxAmount: d.govtTaxAmount || '', notes: d.notes || '',
    });
    setEditId(row._id); setError('');
  };

  return (
    <div>
      <PageHeader eyebrow="3-Layer · Level 1" title="Supplier Invoices (Main Company → 360)"
        actions={<button onClick={() => { setForm(blankForm()); setEditId(null); setError(''); }} className="btn-primary">New supplier invoice</button>} />

      <div className="-mx-1 overflow-x-auto"><div className="min-w-[720px] px-1">
        <Table head={['Invoice No', 'Main Company', 'Date', 'Gross', 'Net', 'Actions']}>
          {rows.length === 0 && <EmptyRow span={6} text="No supplier invoices yet." />}
          {rows.map((r) => (
            <tr key={r._id} className="hover:bg-faint">
              <td className="td font-mono font-medium text-ink">{r.invoiceNo}</td>
              <td className="td">{r.mainCompanyId?.name || '—'}</td>
              <td className="td">{new Date(r.invoiceDate).toLocaleDateString('en-IN')}</td>
              <td className="td">{money(r.grossTotal)}</td>
              <td className="td font-medium">{money(r.netInvoiceAmount)}</td>
              <td className="td"><RowActions
                extra={<button onClick={() => download(r)} className="btn-ghost btn-sm">Download</button>}
                onEdit={() => edit(r)} onDelete={() => del(r)} /></td>
            </tr>
          ))}
        </Table>
      </div></div>

      {form && (
        <Modal title={editId ? 'Edit supplier invoice' : 'New supplier invoice'} onClose={() => setForm(null)} maxWidth="max-w-3xl">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Main Company *">
              <Select value={form.mainCompanyId} onChange={(e) => set('mainCompanyId', e.target.value)}>
                <option value="">Select…</option>
                {mains.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </Select>
            </Field>
            <Field label="Invoice date"><Input type="date" value={form.invoiceDate} onChange={(e) => set('invoiceDate', e.target.value)} /></Field>
          </div>

          <div className="mt-4 rounded-lg border border-line p-3">
            <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Line items</span><button onClick={addLine} className="btn-ghost btn-sm">+ Add line</button></div>
            {form.lines.map((l, i) => (
              <div key={i} className="mb-2 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                <Input placeholder="Description" value={l.description} onChange={(e) => setLine(i, 'description', e.target.value)} />
                <Input type="number" placeholder="Amount" value={l.amount} onChange={(e) => setLine(i, 'amount', e.target.value)} />
                {form.lines.length > 1 && <button onClick={() => delLine(i)} className="btn-ghost btn-sm">Remove</button>}
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Discount"><Input type="number" value={form.discountAmount} onChange={(e) => set('discountAmount', e.target.value)} /></Field>
            <Field label="TDS"><Input type="number" value={form.tdsAmount} onChange={(e) => set('tdsAmount', e.target.value)} /></Field>
            <Field label="TCS"><Input type="number" value={form.tcsAmount} onChange={(e) => set('tcsAmount', e.target.value)} /></Field>
            <Field label="Govt Tax"><Input type="number" value={form.govtTaxAmount} onChange={(e) => set('govtTaxAmount', e.target.value)} /></Field>
          </div>

          <div className="mt-3 rounded-lg bg-canvas p-3 text-sm">
            <div className="flex justify-between"><span className="text-ink-soft">Gross Total</span><span className="font-semibold">{money(totals.gross)}</span></div>
            <div className="mt-1 flex justify-between border-t border-line pt-1"><span className="font-bold text-ink">Net Invoice Amount</span><span className="text-lg font-bold text-brand">{money(totals.net)}</span></div>
            <p className="pt-1 text-xs text-ink-muted">Net = Gross − Discount − TDS − TCS + Govt Tax</p>
          </div>

          <div className="mt-4 flex justify-end gap-2"><button onClick={() => setForm(null)} className="btn-ghost">Cancel</button><button onClick={save} className="btn-primary">{editId ? 'Save' : 'Create'}</button></div>
        </Modal>
      )}
    </div>
  );
}
