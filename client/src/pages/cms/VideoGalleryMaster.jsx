import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Field, Input, Textarea, Table, EmptyRow, RowActions, Modal } from '../../components/ui';

const MENU = 'cms-videos';
const blank = { title: '', description: '', video_url_link: '' };

export default function VideoGalleryMaster() {
  const { can } = useAuth();
  const canCreate = can(MENU, 'CREATE'), canEdit = can(MENU, 'EDIT'), canDelete = can(MENU, 'DELETE');
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/cms/videos').then((r) => setRows(r.data)).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setError('');
    if (!form.title.trim()) return setError('Title is required.');
    try {
      if (editId) await api.put(`/cms/videos/${editId}`, form);
      else await api.post('/cms/videos', form);
      setForm(null); setEditId(null); load();
    } catch (err) { setError(err.response?.data?.message || 'Could not save the video.'); }
  };
  const del = async (r) => {
    if (await confirm({ title: 'Delete video?', message: `“${r.title}” will be removed.` })) {
      try { await api.delete(`/cms/videos/${r._id}`); load(); } catch { /* ignore */ }
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Website" title="Video Gallery"
        actions={canCreate ? <button onClick={() => { setForm({ ...blank }); setEditId(null); setError(''); }} className="btn-primary">Add video</button> : null} />

      <Table head={['Title', 'Description', 'Video URL', 'Actions']}>
        {rows.length === 0 && <EmptyRow span={4} text="No videos yet." />}
        {rows.map((r) => (
          <tr key={r._id}>
            <td className="td font-medium text-ink">{r.title}</td>
            <td className="td">{r.description || '—'}</td>
            <td className="td">{r.video_url_link ? <a href={r.video_url_link} target="_blank" rel="noreferrer" className="text-brand hover:underline">Open</a> : '—'}</td>
            <td className="td"><RowActions
              onEdit={canEdit ? () => { setForm({ title: r.title, description: r.description || '', video_url_link: r.video_url_link || '' }); setEditId(r._id); setError(''); } : undefined}
              onDelete={canDelete ? () => del(r) : undefined} /></td>
          </tr>
        ))}
      </Table>

      {form && (
        <Modal title={editId ? 'Edit video' : 'Add video'} onClose={() => setForm(null)} maxWidth="max-w-xl">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="space-y-3">
            <Field label="Title *"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label="Video URL link"><Input value={form.video_url_link} onChange={(e) => setForm({ ...form, video_url_link: e.target.value })} placeholder="https://…" /></Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setForm(null)} className="btn-ghost">Cancel</button>
            <button onClick={save} className="btn-primary">{editId ? 'Save changes' : 'Add video'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
