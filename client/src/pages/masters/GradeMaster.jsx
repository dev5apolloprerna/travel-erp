import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Card, Field, Input, Table, EmptyRow, RowActions, money } from '../../components/ui';

const MENU = 'master-grade';   // permission key (req #4)

export default function GradeMaster() {
  const confirm = useConfirm();
  const { can } = useAuth();
  const canCreate = can(MENU, 'CREATE'), canEdit = can(MENU, 'EDIT'), canDelete = can(MENU, 'DELETE');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', amount: '' });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/fit/grades').then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    setError('');
    if (!form.name.trim()) return setError('Grade name is required.');
    const payload = { name: form.name, amount: Number(form.amount) || 0 };
    try {
      if (editId) await api.put(`/fit/grades/${editId}`, payload);
      else await api.post('/fit/grades', payload);
      setForm({ name: '', amount: '' }); setEditId(null); load();
    } catch (err) { setError(err.response?.data?.message || 'Could not save the grade.'); }
  };
  const edit = (it) => { setForm({ name: it.name, amount: it.amount }); setEditId(it._id); setError(''); };
  const del = async (it) => {
    setError('');
    if (await confirm({ title: 'Delete grade?', message: `“${it.name}” will be removed.` })) {
      try { await api.delete(`/fit/grades/${it._id}`); load(); }
      catch (err) { setError(err.response?.data?.message || 'Could not delete the grade.'); }
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="FIT Masters" title="Grade Master" />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      {(canCreate || canEdit) && (
        <Card title={editId ? 'Edit grade' : 'Add grade'} className="mb-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1"><Field label="Grade name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div>
            <div className="w-40"><Field label="Amount (reference)"><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field></div>
            {(editId ? canEdit : canCreate) && <button onClick={submit} className="btn-primary">{editId ? 'Update' : 'Add'}</button>}
            {editId && <button onClick={() => { setEditId(null); setForm({ name: '', amount: '' }); setError(''); }} className="btn-ghost">Cancel</button>}
          </div>
          <p className="mt-2 text-xs text-ink-muted">Amount is a reference spend limit shown during DR booking — not enforced.</p>
        </Card>
      )}
      <Table head={['Grade', 'Amount', 'Actions']}>
        {items.length === 0 && <EmptyRow span={3} />}
        {items.map((it) => (
          <tr key={it._id}>
            <td className="td font-medium text-ink">{it.name}</td>
            <td className="td">{money(it.amount)}</td>
            <td className="td"><RowActions onEdit={canEdit ? () => edit(it) : undefined} onDelete={canDelete ? () => del(it) : undefined} /></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
