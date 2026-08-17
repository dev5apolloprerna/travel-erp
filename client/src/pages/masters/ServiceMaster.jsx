import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Card, Field, Input, Select, Table, EmptyRow, RowActions, Badge } from '../../components/ui';

export default function ServiceMaster() {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', type: 'DOMESTIC', hsnCode: '', invoicePrefix: '' });
  const [editId, setEditId] = useState(null);

  const load = () => api.get('/services').then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.name.trim()) return;
    if (editId) await api.put(`/services/${editId}`, form);
    else await api.post('/services', form);
    setForm({ name: '', type: 'DOMESTIC', hsnCode: '', invoicePrefix: '' }); setEditId(null); load();
  };
  const edit = (it) => { setForm({ name: it.name, type: it.type, hsnCode: it.hsnCode || '', invoicePrefix: it.invoicePrefix || '' }); setEditId(it._id); };
  const del = async (it) => {
    if (await confirm({ title: 'Delete service?', message: `“${it.name} (${it.type})” will be removed.` }))
      { await api.delete(`/services/${it._id}`); load(); }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Administration" title="Service Master" />
      <Card title={editId ? 'Edit service' : 'Add service'} className="mb-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1"><Field label="Service name"><Input placeholder="Flight, Hotel, Visa…" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div>
          <div className="w-48"><Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="DOMESTIC">Domestic</option>
              <option value="INTERNATIONAL">International</option>
            </Select>
          </Field></div>
          <div className="w-36"><Field label="Invoice prefix">
            <Input value={form.invoicePrefix} maxLength={6}
              onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value.toUpperCase() })}
              placeholder="FLT" />
          </Field></div>
          <div className="w-32"><Field label="HSN / SAC">
            <Input value={form.hsnCode} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} />
          </Field></div>
          <button onClick={submit} className="btn-primary">{editId ? 'Update' : 'Add'}</button>
          {editId && <button onClick={() => { setEditId(null); setForm({ name: '', type: 'DOMESTIC', hsnCode: '', invoicePrefix: '' }); }} className="btn-ghost">Cancel</button>}
        </div>
      </Card>
      <Table head={['Service', 'Type', 'Invoice prefix', 'HSN/SAC', 'Actions']}>
        {items.length === 0 && <EmptyRow span={5} />}
        {items.map((it) => (
          <tr key={it._id}>
            <td className="td font-medium text-ink">{it.name}</td>
            <td className="td"><Badge>{it.type === 'DOMESTIC' ? 'Domestic' : 'International'}</Badge></td>
            <td className="td font-mono text-ink">{it.invoicePrefix ? `${it.invoicePrefix}-000001` : <span className="text-ink-muted">Not set</span>}</td>
            <td className="td">{it.hsnCode || '—'}</td>
            <td className="td"><RowActions onEdit={() => edit(it)} onDelete={() => del(it)} /></td>
          </tr>
        ))}
      </Table>
      <p className="mt-3 text-xs text-ink-muted">
        The invoice prefix numbers every invoice for that service, each with its own sequence —
        Flight becomes FLT-000001, FLT-000002, while Hotel runs separately from HTL-000001.
        Tax is not set here — it is entered manually when the invoice is generated.
      </p>
    </div>
  );
}
