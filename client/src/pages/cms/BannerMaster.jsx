import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import ImageUpload from '../../components/ui/ImageUpload';
import { PageHeader, Field, Input, Table, EmptyRow, RowActions, Modal } from '../../components/ui';

const MENU = 'cms-banners';
const blank = { title: '', bannerImage: '' };
// Stored images are relative (/uploads/...). Build the backend-absolute URL for the listing
// (the admin app is served from a different origin than the API in dev) — req #8A.
const apiBase = api.defaults.baseURL.replace(/\/api$/, '');
const imgUrl = (p) => (!p ? '' : p.startsWith('http') ? p : `${apiBase}${p}`);

export default function BannerMaster() {
  const { can } = useAuth();
  const canCreate = can(MENU, 'CREATE'), canEdit = can(MENU, 'EDIT'), canDelete = can(MENU, 'DELETE');
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/cms/banners').then((r) => setRows(r.data)).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setError('');
    if (!form.title.trim()) return setError('Title is required.');
    try {
      if (editId) await api.put(`/cms/banners/${editId}`, form);
      else await api.post('/cms/banners', form);
      setForm(null); setEditId(null); load();
    } catch (err) { setError(err.response?.data?.message || 'Could not save the banner.'); }
  };
  const del = async (r) => {
    if (await confirm({ title: 'Delete banner?', message: `“${r.title}” will be removed.` })) {
      try { await api.delete(`/cms/banners/${r._id}`); load(); } catch { /* ignore */ }
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Website" title="Banner Master"
        actions={canCreate ? <button onClick={() => { setForm({ ...blank }); setEditId(null); setError(''); }} className="btn-primary">Add banner</button> : null} />

      <Table head={['Title', 'Image', 'Actions']}>
        {rows.length === 0 && <EmptyRow span={3} text="No banners yet." />}
        {rows.map((r) => (
          <tr key={r._id}>
            <td className="td font-medium text-ink">{r.title}</td>
            <td className="td">{r.bannerImage ? <img src={imgUrl(r.bannerImage)} alt="" className="h-8 rounded" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : '—'}</td>
            <td className="td"><RowActions
              onEdit={canEdit ? () => { setForm({ title: r.title, bannerImage: r.bannerImage || '' }); setEditId(r._id); setError(''); } : undefined}
              onDelete={canDelete ? () => del(r) : undefined} /></td>
          </tr>
        ))}
      </Table>

      {form && (
        <Modal title={editId ? 'Edit banner' : 'Add banner'} onClose={() => setForm(null)}>
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="space-y-3">
            <Field label="Title *"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Banner image"><ImageUpload value={form.bannerImage} onChange={(bannerImage) => setForm({ ...form, bannerImage })} label="banner" /></Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setForm(null)} className="btn-ghost">Cancel</button>
            <button onClick={save} className="btn-primary">{editId ? 'Save changes' : 'Add banner'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
