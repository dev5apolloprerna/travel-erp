import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Field, Input, Table, EmptyRow, RowActions, Badge, Modal } from '../../components/ui';

const blank = { name: '', gstNumber: '', email: '', phone: '', state: '', stateCode: '', address: '', isActive: true };

/** Main Companies (suppliers) that invoice the 360 agency. Level-1 of the 3-layer flow. */
export default function MainCompanies() {
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/org/main').then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError('');
    if (!form.name.trim()) return setError('Company name is required.');
    try {
      if (editId) await api.put(`/org/main/${editId}`, form);
      else await api.post('/org/main', form);
      setForm(null); setEditId(null); load();
    } catch (err) { setError(err.response?.data?.message || 'Could not save.'); }
  };
  const del = async (row) => {
    if (!(await confirm({ title: 'Delete Main Company?', message: `${row.name} will be removed.` }))) return;
    await api.delete(`/org/main/${row._id}`); load();
  };

  return (
    <div>
      <PageHeader eyebrow="Organizations" title="Main Companies (Suppliers)"
        actions={<button onClick={() => { setForm({ ...blank }); setEditId(null); setError(''); }} className="btn-primary">Add Main Company</button>} />

      <div className="-mx-1 overflow-x-auto"><div className="min-w-[640px] px-1">
        <Table head={['Name', 'GSTIN', 'State', 'Email', 'Status', 'Actions']}>
          {rows.length === 0 && <EmptyRow span={6} text="No Main Companies yet. Add a supplier that invoices your 360 agency." />}
          {rows.map((r) => (
            <tr key={r._id} className="hover:bg-faint">
              <td className="td font-medium text-ink">{r.name}</td>
              <td className="td">{r.gstNumber || '—'}</td>
              <td className="td">{r.state || '—'}</td>
              <td className="td">{r.email || '—'}</td>
              <td className="td"><Badge status={r.isActive ? 'PAID' : 'UNPAID'}>{r.isActive ? 'Active' : 'Inactive'}</Badge></td>
              <td className="td"><RowActions onEdit={() => { setForm({ ...blank, ...r }); setEditId(r._id); setError(''); }} onDelete={() => del(r)} /></td>
            </tr>
          ))}
        </Table>
      </div></div>

      {form && (
        <Modal title={editId ? `Edit ${form.name}` : 'Add Main Company'} onClose={() => setForm(null)} maxWidth="max-w-2xl">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Company name *"><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="GSTIN"><Input value={form.gstNumber} onChange={(e) => set('gstNumber', e.target.value)} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
            <Field label="State"><Input value={form.state} onChange={(e) => set('state', e.target.value)} /></Field>
            <Field label="State code"><Input value={form.stateCode} onChange={(e) => set('stateCode', e.target.value)} /></Field>
            <div className="sm:col-span-2"><Field label="Address"><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></Field></div>
            <label className="flex items-center gap-2 text-sm text-ink-soft"><input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Active</label>
          </div>
          <div className="mt-4 flex justify-end gap-2"><button onClick={() => setForm(null)} className="btn-ghost">Cancel</button><button onClick={save} className="btn-primary">{editId ? 'Save' : 'Add'}</button></div>
        </Modal>
      )}
    </div>
  );
}
