import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Card, Field, Input, Select, Table, EmptyRow, RowActions, Badge } from '../../components/ui';

const TYPES = ['PUBLIC', 'OPTIONAL', 'COMPANY'];
const blank = { name: '', date: '', type: 'PUBLIC', description: '' };

export default function HolidayMaster() {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);

  const load = () => api.get('/hr/holidays', { params: { year } }).then((r) => setItems(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [year]);

  const submit = async () => {
    if (!form.name.trim() || !form.date) return;
    if (editId) await api.put(`/hr/holidays/${editId}`, form);
    else await api.post('/hr/holidays', form);
    setForm(blank); setEditId(null); load();
  };
  const edit = (h) => {
    setForm({ name: h.name, date: h.date?.slice(0, 10), type: h.type, description: h.description || '' });
    setEditId(h._id);
  };
  const del = async (h) => {
    if (await confirm({ title: 'Delete holiday?', message: `“${h.name}” will be removed.` }))
      { await api.delete(`/hr/holidays/${h._id}`); load(); }
  };

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="HR" title="Holiday Master" />

      <Card title={editId ? 'Edit holiday' : 'Add holiday'} className="mb-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Holiday name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={submit} className="btn-primary">{editId ? 'Update holiday' : 'Add holiday'}</button>
          {editId && <button onClick={() => { setEditId(null); setForm(blank); }} className="btn-ghost">Cancel</button>}
        </div>
      </Card>

      <div className="mb-3 flex items-end gap-2">
        <div className="w-40"><Field label="Filter by year"><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} /></Field></div>
      </div>

      <Table head={['Holiday', 'Date', 'Day', 'Type', 'Description', 'Actions']}>
        {items.length === 0 && <EmptyRow span={6} text="No holidays for this year." />}
        {items.map((h) => (
          <tr key={h._id}>
            <td className="td font-medium text-ink">{h.name}</td>
            <td className="td">{new Date(h.date).toLocaleDateString('en-IN')}</td>
            <td className="td">{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long' })}</td>
            <td className="td"><Badge>{h.type}</Badge></td>
            <td className="td">{h.description || '—'}</td>
            <td className="td"><RowActions onEdit={() => edit(h)} onDelete={() => del(h)} /></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
