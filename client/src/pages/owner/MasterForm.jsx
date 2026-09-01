import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import MasterField from './MasterField';

// Generic ADD/EDIT page (separate page, not a modal).
// Routes: /owner/:key/create and /owner/:key/:id/edit
export default function MasterForm() {
  const { key, id } = useParams();
  const nav = useNavigate();
  const editing = !!id;

  const [def, setDef] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/owner/masters/${key}/def`).then((r) => setDef(r.data));
  }, [key]);

  useEffect(() => {
    if (editing) api.get(`/owner/masters/${key}/${id}`).then((r) => setForm(r.data));
  }, [key, id, editing]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const backToList = () => nav(`/owner/${key}`);

  const save = async () => {
    setError(''); setSaving(true);
    try {
      if (editing) await api.put(`/owner/masters/${key}/${id}`, form);
      else await api.post(`/owner/masters/${key}`, form);
      backToList();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save this record.');
    } finally { setSaving(false); }
  };

  if (!def) return <div className="text-ink-muted">Loading…</div>;

  return (
    <div className="pb-24">
      <div className="eyebrow mb-1.5">Master · {def.label} · {editing ? 'Edit' : 'Add'}</div>
      <button onClick={backToList} className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] font-bold text-brand hover:underline">
        ← Back to {def.label} list
      </button>
      <h1 className="text-[27px] font-extrabold leading-tight text-ink">{editing ? 'Edit' : 'Add'} {def.label}</h1>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="mt-5 max-w-3xl rounded-xl2 border border-line bg-white p-7 shadow-card">
        <p className="mb-4 rounded-lg bg-faint px-3 py-2.5 text-[12px] text-ink-muted">
          <strong className="font-mono text-ink-soft">{def.pk || 'ID'}</strong> — {editing
            ? 'generated automatically, not editable.'
            : 'will be generated automatically on save.'}
        </p>
        <div className="grid gap-x-[18px] gap-y-4 sm:grid-cols-2">
          {def.fields.map((f) => (
            <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
              <MasterField field={f} value={form[f.key]} onChange={set(f.key)} />
            </div>
          ))}
        </div>
      </div>

      {/* Fixed bottom action bar (wireframe) */}
      <div className="fixed bottom-0 right-0 left-0 z-40 flex justify-end gap-2.5 border-t border-line bg-white px-10 py-3.5 shadow-[0_-2px_10px_rgba(16,24,40,.08)] md:left-[264px]">
        <button onClick={backToList} className="btn-ghost">Cancel</button>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : `Save ${def.label}`}
        </button>
      </div>
    </div>
  );
}
