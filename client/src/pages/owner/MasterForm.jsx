import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Card } from '../../components/ui';
import MasterField from './MasterField';

// Generic ADD/EDIT page. Routes: /owner/:key/create and /owner/:key/:id/edit
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

  const save = async () => {
    setError(''); setSaving(true);
    try {
      if (editing) await api.put(`/owner/masters/${key}/${id}`, form);
      else await api.post(`/owner/masters/${key}`, form);
      nav(`/owner/${key}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save this record.');
    } finally { setSaving(false); }
  };

  if (!def) return <div className="text-ink-muted">Loading…</div>;

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow={`Master · ${def.menu}`} title={`${editing ? 'Edit' : 'Add'} ${def.label}`} />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          {def.fields.map((f) => (
            <MasterField key={f.key} field={f} value={form[f.key]} onChange={set(f.key)} />
          ))}
        </div>
        <div className="mt-5 flex gap-2 border-t border-line pt-4">
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : editing ? 'Save changes' : `Add ${def.label}`}
          </button>
          <button onClick={() => nav(`/owner/${key}`)} className="btn-ghost">Cancel</button>
        </div>
      </Card>
    </div>
  );
}
