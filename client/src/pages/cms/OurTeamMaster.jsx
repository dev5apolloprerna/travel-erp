import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import ImageUpload from '../../components/ui/ImageUpload';
import { PageHeader, Field, Input, Select, Table, EmptyRow, RowActions, Badge, Modal } from '../../components/ui';

const MENU = 'cms-team';
const FLAGS = ['first', 'second'];
const blank = { name: '', designation: '', photo: '', department: '', flag: 'first' };
// Build backend-absolute URL for listing thumbnails (stored paths are relative) — req #10.
const apiBase = api.defaults.baseURL.replace(/\/api$/, '');
const imgUrl = (p) => (!p ? '' : p.startsWith('http') ? p : `${apiBase}${p}`);

export default function OurTeamMaster() {
  const { can } = useAuth();
  const canCreate = can(MENU, 'CREATE'), canEdit = can(MENU, 'EDIT'), canDelete = can(MENU, 'DELETE');
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/cms/team').then((r) => setRows(r.data)).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setError('');
    if (!form.name.trim()) return setError('Name is required.');
    try {
      if (editId) await api.put(`/cms/team/${editId}`, form);
      else await api.post('/cms/team', form);
      setForm(null); setEditId(null); load();
    } catch (err) { setError(err.response?.data?.message || 'Could not save the team member.'); }
  };
  const del = async (r) => {
    if (await confirm({ title: 'Delete team member?', message: `“${r.name}” will be removed.` })) {
      try { await api.delete(`/cms/team/${r._id}`); load(); } catch { /* ignore */ }
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Website" title="Our Team"
        actions={canCreate ? <button onClick={() => { setForm({ ...blank }); setEditId(null); setError(''); }} className="btn-primary">Add member</button> : null} />

      <Table head={['Photo', 'Name', 'Designation', 'Department', 'Flag', 'Actions']}>
        {rows.length === 0 && <EmptyRow span={6} text="No team members yet." />}
        {rows.map((r) => (
          <tr key={r._id}>
            <td className="td">{r.photo ? <img src={imgUrl(r.photo)} alt="" className="h-8 w-8 rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : '—'}</td>
            <td className="td font-medium text-ink">{r.name}</td>
            <td className="td">{r.designation || '—'}</td>
            <td className="td">{r.department || '—'}</td>
            <td className="td"><Badge>{r.flag}</Badge></td>
            <td className="td"><RowActions
              onEdit={canEdit ? () => { setForm({ name: r.name, designation: r.designation || '', photo: r.photo || '', department: r.department || '', flag: r.flag || 'first' }); setEditId(r._id); setError(''); } : undefined}
              onDelete={canDelete ? () => del(r) : undefined} /></td>
          </tr>
        ))}
      </Table>

      {form && (
        <Modal title={editId ? 'Edit team member' : 'Add team member'} onClose={() => setForm(null)} maxWidth="max-w-xl">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Designation"><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>
            <Field label="Department"><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
            <Field label="Flag">
              <Select value={form.flag} onChange={(e) => setForm({ ...form, flag: e.target.value })}>
                {FLAGS.map((f) => <option key={f} value={f}>{f}</option>)}
              </Select>
            </Field>
            <div className="sm:col-span-2"><Field label="Photo"><ImageUpload value={form.photo} onChange={(photo) => setForm({ ...form, photo })} label="photo" /></Field></div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setForm(null)} className="btn-ghost">Cancel</button>
            <button onClick={save} className="btn-primary">{editId ? 'Save changes' : 'Add member'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
