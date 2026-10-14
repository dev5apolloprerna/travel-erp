import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import ImageUpload from '../../components/ui/ImageUpload';
import RichText from '../../components/ui/RichText';
import { PageHeader, Field, Input, Textarea, Table, EmptyRow, RowActions, Badge, Modal } from '../../components/ui';

const blankExperience = () => ({ label: '', image: '', description: '' });
const blankCat = {
  name: '', description: '', image: '', displayOrder: 0, isActive: true,
  bestTime: '', idealDuration: '', travelStyle: '', experiences: [],
  seoTitle: '', seoDescription: '', seoKeywords: '', seoHead: '', seoBody: '',
};

/** Destination main categories (Region). Sub categories removed. */
export default function CategoryMaster() {
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/cms/categories').then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError('');
    if (!form.name.trim()) return setError('Category name is required.');
    try {
      if (editId) await api.put(`/cms/categories/${editId}`, form);
      else await api.post('/cms/categories', form);
      setForm(null); setEditId(null); load();
    } catch (err) { setError(err.response?.data?.message || 'Could not save.'); }
  };

  const del = async (row) => {
    if (!(await confirm({ title: 'Delete category?', message: `${row.name} will be removed.` }))) return;
    try { await api.delete(`/cms/categories/${row._id}`); load(); }
    catch (err) { window.alert(err.response?.data?.message || 'Could not delete.'); }
  };

  // Experience row helpers
  const addExp = () => set('experiences', [...(form.experiences || []), blankExperience()]);
  const setExp = (i, k, v) => set('experiences', form.experiences.map((e, x) => (x === i ? { ...e, [k]: v } : e)));
  const delExp = (i) => set('experiences', form.experiences.filter((_, x) => x !== i));

  return (
    <div>
      <PageHeader eyebrow="Website" title="Destination Categories"
        actions={<button onClick={() => { setForm({ ...blankCat }); setEditId(null); setError(''); }} className="btn-primary">Add category</button>} />

      <Table head={['Name', 'URL slug', 'Best Time', 'Ideal Duration', 'Order', 'Status', 'Actions']}>
        {rows.length === 0 && <EmptyRow span={7} text="No categories yet. Add a region such as “Latin America / Caribbean”." />}
        {rows.map((r) => (
          <tr key={r._id}>
            <td className="td font-medium text-ink">{r.name}</td>
            <td className="td font-mono text-xs">{r.slug}</td>
            <td className="td">{r.bestTime || '—'}</td>
            <td className="td">{r.idealDuration || '—'}</td>
            <td className="td">{r.displayOrder}</td>
            <td className="td"><Badge status={r.isActive ? 'PAID' : 'UNPAID'}>{r.isActive ? 'Active' : 'Hidden'}</Badge></td>
            <td className="td">
              <RowActions onEdit={() => { setForm({ ...blankCat, ...r, experiences: r.experiences || [] }); setEditId(r._id); setError(''); }} onDelete={() => del(r)} />
            </td>
          </tr>
        ))}
      </Table>

      {form && (
        <Modal title={editId ? `Edit ${form.name}` : 'Add category'} onClose={() => setForm(null)} maxWidth="max-w-5xl">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
            {/* Basics */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category name *"><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Latin America / Caribbean" /></Field>
              <Field label="Display order"><Input type="number" value={form.displayOrder} onChange={(e) => set('displayOrder', e.target.value)} /></Field>
              <div className="sm:col-span-2"><Field label="Description"><Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field></div>
              <div className="sm:col-span-2"><Field label="Image"><ImageUpload value={form.image} onChange={(image) => set('image', image)} /></Field></div>
              <Field label="Best Time"><Input value={form.bestTime} onChange={(e) => set('bestTime', e.target.value)} placeholder="Oct – Mar" /></Field>
              <Field label="Ideal Duration"><Input value={form.idealDuration} onChange={(e) => set('idealDuration', e.target.value)} placeholder="10–18 Days" /></Field>
              <div className="sm:col-span-2"><Field label="Travel Style"><Input value={form.travelStyle} onChange={(e) => set('travelStyle', e.target.value)} placeholder="Culture · Cities · Beaches · Food" /></Field></div>
            </div>

            {/* Experiences */}
            <div className="rounded-lg border border-line p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Experiences</span>
                <button type="button" onClick={addExp} className="btn-ghost btn-sm">+ Add experience</button>
              </div>
              {(form.experiences || []).length === 0 && <p className="text-sm text-ink-muted">No experiences added.</p>}
              {(form.experiences || []).map((ex, i) => (
                <div key={i} className="mb-3 rounded-lg border border-line p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink-soft">Experience {i + 1}</span>
                    <button type="button" onClick={() => delExp(i)} className="btn-danger btn-sm">Remove</button>
                  </div>
                  <div className="grid gap-3">
                    <Field label="Label"><Input value={ex.label} onChange={(e) => setExp(i, 'label', e.target.value)} placeholder="Ancient Temples" /></Field>
                    <Field label="Image"><ImageUpload value={ex.image} onChange={(image) => setExp(i, 'image', image)} /></Field>
                    <Field label="Description"><RichText value={ex.description} onChange={(html) => setExp(i, 'description', html)} placeholder="Describe this experience…" /></Field>
                  </div>
                </div>
              ))}
            </div>

            {/* SEO */}
            <div className="rounded-lg border border-line p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">SEO</div>
              <div className="space-y-3">
                <Field label="SEO title"><Input value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} /></Field>
                <Field label="SEO description"><Input value={form.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} /></Field>
                <Field label="Meta Keyword"><RichText value={form.seoKeywords} onChange={(html) => set('seoKeywords', html)} placeholder="Meta keywords…" /></Field>
                <Field label="Head"><RichText value={form.seoHead} onChange={(html) => set('seoHead', html)} placeholder="Head markup…" /></Field>
                <Field label="Body"><RichText value={form.seoBody} onChange={(html) => set('seoBody', html)} placeholder="Body markup…" /></Field>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
              Show on the website
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-2 border-t border-line pt-4">
            <button onClick={() => setForm(null)} className="btn-ghost">Cancel</button>
            <button onClick={save} className="btn-primary">{editId ? 'Save changes' : 'Add category'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
