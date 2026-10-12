import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Card, Field, Input, Select, Table, EmptyRow, RowActions, Badge } from '../../components/ui';

const TYPES = ['PUBLIC', 'OPTIONAL', 'COMPANY'];
const blank = { name: '', date: '', type: 'PUBLIC', description: '' };
const MENU = 'hr-holidays';   // permission key for this screen (req #4)

export default function HolidayMaster() {
  const confirm = useConfirm();
  const { can } = useAuth();
  const [items, setItems] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  // req #4: per-action permissions. The form (add/edit) is only shown when the user can create
  // or edit; Edit/Delete row actions are gated individually. Backend re-checks all of these.
  const canCreate = can(MENU, 'CREATE');
  const canEdit = can(MENU, 'EDIT');
  const canDelete = can(MENU, 'DELETE');

  const load = () => api.get('/hr/holidays', { params: { year } }).then((r) => setItems(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [year]);

  const submit = async () => {
    setError('');
    if (!form.name.trim() || !form.date) return setError('Holiday name and date are required.');
    try {
      if (editId) await api.put(`/hr/holidays/${editId}`, form);
      else await api.post('/hr/holidays', form);
      setForm(blank); setEditId(null); load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the holiday.');
    }
  };
  const edit = (h) => {
    setForm({ name: h.name, date: h.date?.slice(0, 10), type: h.type, description: h.description || '' });
    setEditId(h._id); setError('');
  };
  const del = async (h) => {
    setError('');
    if (await confirm({ title: 'Delete holiday?', message: `“${h.name}” will be removed.` })) {
      try { await api.delete(`/hr/holidays/${h._id}`); load(); }
      catch (err) { setError(err.response?.data?.message || 'Could not delete the holiday.'); }
    }
  };

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="HR" title="Holiday Master" />

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      {/* req #4: only shown to users who may create or edit holidays. */}
      {(canCreate || canEdit) && (
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
            {/* Add requires CREATE; Update requires EDIT. */}
            {(editId ? canEdit : canCreate) && (
              <button onClick={submit} className="btn-primary">{editId ? 'Update holiday' : 'Add holiday'}</button>
            )}
            {editId && <button onClick={() => { setEditId(null); setForm(blank); setError(''); }} className="btn-ghost">Cancel</button>}
          </div>
        </Card>
      )}

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
            {/* req #4: Edit/Delete render only when the user holds that permission. */}
            <td className="td"><RowActions onEdit={canEdit ? () => edit(h) : undefined} onDelete={canDelete ? () => del(h) : undefined} /></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
