import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Card, Field, Input, Table, EmptyRow, RowActions, money } from '../../components/ui';

export default function GradeMaster() {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', amount: '' });
  const [editId, setEditId] = useState(null);

  const load = () => api.get('/fit/grades').then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.name.trim()) return;
    const payload = { name: form.name, amount: Number(form.amount) || 0 };
    if (editId) await api.put(`/fit/grades/${editId}`, payload);
    else await api.post('/fit/grades', payload);
    setForm({ name: '', amount: '' }); setEditId(null); load();
  };
  const edit = (it) => { setForm({ name: it.name, amount: it.amount }); setEditId(it._id); };
  const del = async (it) => {
    if (await confirm({ title: 'Delete grade?', message: `“${it.name}” will be removed.` }))
      { await api.delete(`/fit/grades/${it._id}`); load(); }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="FIT Masters" title="Grade Master" />
      <Card title={editId ? 'Edit grade' : 'Add grade'} className="mb-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1"><Field label="Grade name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div>
          <div className="w-40"><Field label="Amount (reference)"><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field></div>
          <button onClick={submit} className="btn-primary">{editId ? 'Update' : 'Add'}</button>
          {editId && <button onClick={() => { setEditId(null); setForm({ name: '', amount: '' }); }} className="btn-ghost">Cancel</button>}
        </div>
        <p className="mt-2 text-xs text-ink-muted">Amount is a reference spend limit shown during DR booking — not enforced.</p>
      </Card>
      <Table head={['Grade', 'Amount', 'Actions']}>
        {items.length === 0 && <EmptyRow span={3} />}
        {items.map((it) => (
          <tr key={it._id}>
            <td className="td font-medium text-ink">{it.name}</td>
            <td className="td">{money(it.amount)}</td>
            <td className="td"><RowActions onEdit={() => edit(it)} onDelete={() => del(it)} /></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
