import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import ImageUpload from '../../components/ui/ImageUpload';
import { PageHeader, Card, Field, Input, Textarea, Table, EmptyRow, RowActions, Badge, Modal, Tabs } from '../../components/ui';

const blankCat = { name: '', description: '', image: '', displayOrder: 0, isActive: true, seoTitle: '', seoDescription: '' };
const blankSub = { categoryId: '', name: '', description: '', image: '', displayOrder: 0, isActive: true, seoTitle: '', seoDescription: '' };

/** Destination main categories (Region) and sub categories (Country/State). */
export default function CategoryMaster() {
  const [tab, setTab] = useState('categories');
  return (
    <div>
      <PageHeader eyebrow="Website" title="Destination Categories" />
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'categories', label: 'Main categories (Region)' },
        { key: 'subs', label: 'Sub categories (Country)' },
      ]} />
      {tab === 'categories' ? <Categories /> : <SubCategories />}
    </div>
  );
}

function Categories() {
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/cms/categories').then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);

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

  return (
    <>
      <div className="mb-3">
        <button onClick={() => { setForm({ ...blankCat }); setEditId(null); setError(''); }} className="btn-primary">
          Add main category
        </button>
      </div>

      <Table head={['Name', 'URL slug', 'Sub categories', 'Order', 'Status', 'Actions']}>
        {rows.length === 0 && <EmptyRow span={6} text="No categories yet. Add a region such as “Latin America / Caribbean”." />}
        {rows.map((r) => (
          <tr key={r._id}>
            <td className="td font-medium text-ink">{r.name}</td>
            <td className="td font-mono text-xs">{r.slug}</td>
            <td className="td">{r.subCount ?? '—'}</td>
            <td className="td">{r.displayOrder}</td>
            <td className="td"><Badge status={r.isActive ? 'PAID' : 'UNPAID'}>{r.isActive ? 'Active' : 'Hidden'}</Badge></td>
            <td className="td">
              <RowActions onEdit={() => { setForm({ ...blankCat, ...r }); setEditId(r._id); setError(''); }} onDelete={() => del(r)} />
            </td>
          </tr>
        ))}
      </Table>

      {form && (
        <Modal title={editId ? `Edit ${form.name}` : 'Add main category'} onClose={() => setForm(null)} maxWidth="max-w-2xl">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Latin America / Caribbean" /></Field>
            <Field label="Display order"><Input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Description"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
            <div className="sm:col-span-2">
              <Field label="Image"><ImageUpload value={form.image} onChange={(image) => setForm({ ...form, image })} /></Field>
            </div>
            <Field label="SEO title"><Input value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} /></Field>
            <Field label="SEO description"><Input value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Show on the website
              </label>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setForm(null)} className="btn-ghost">Cancel</button>
            <button onClick={save} className="btn-primary">{editId ? 'Save changes' : 'Add category'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function SubCategories() {
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [filterCat, setFilterCat] = useState('');
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/cms/subcategories', { params: filterCat ? { categoryId: filterCat } : {} })
    .then((r) => setRows(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterCat]);
  useEffect(() => { api.get('/cms/categories').then((r) => setCats(r.data)); }, []);

  const save = async () => {
    setError('');
    if (!form.categoryId) return setError('Choose the main category this belongs to.');
    if (!form.name.trim()) return setError('Sub category name is required.');
    try {
      if (editId) await api.put(`/cms/subcategories/${editId}`, form);
      else await api.post('/cms/subcategories', form);
      setForm(null); setEditId(null); load();
    } catch (err) { setError(err.response?.data?.message || 'Could not save.'); }
  };

  const del = async (row) => {
    if (!(await confirm({ title: 'Delete sub category?', message: `${row.name} will be removed.` }))) return;
    try { await api.delete(`/cms/subcategories/${row._id}`); load(); }
    catch (err) { window.alert(err.response?.data?.message || 'Could not delete.'); }
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Field label="Filter by main category">
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="input">
              <option value="">All categories</option>
              {cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <button onClick={() => { setForm({ ...blankSub, categoryId: filterCat }); setEditId(null); setError(''); }} className="btn-primary">
          Add sub category
        </button>
      </div>

      <Table head={['Name', 'Main category', 'URL slug', 'Order', 'Status', 'Actions']}>
        {rows.length === 0 && <EmptyRow span={6} text="No sub categories yet. Add a country such as “Bahamas”." />}
        {rows.map((r) => (
          <tr key={r._id}>
            <td className="td font-medium text-ink">{r.name}</td>
            <td className="td">{r.categoryId?.name || '—'}</td>
            <td className="td font-mono text-xs">{r.slug}</td>
            <td className="td">{r.displayOrder}</td>
            <td className="td"><Badge status={r.isActive ? 'PAID' : 'UNPAID'}>{r.isActive ? 'Active' : 'Hidden'}</Badge></td>
            <td className="td">
              <RowActions
                onEdit={() => { setForm({ ...blankSub, ...r, categoryId: r.categoryId?._id || r.categoryId }); setEditId(r._id); setError(''); }}
                onDelete={() => del(r)} />
            </td>
          </tr>
        ))}
      </Table>

      {form && (
        <Modal title={editId ? `Edit ${form.name}` : 'Add sub category'} onClose={() => setForm(null)} maxWidth="max-w-2xl">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Main category *">
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="input">
                <option value="">Select…</option>
                {cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Sub category name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bahamas" /></Field>
            <div className="sm:col-span-2"><Field label="Description"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
            <div className="sm:col-span-2">
              <Field label="Image"><ImageUpload value={form.image} onChange={(image) => setForm({ ...form, image })} /></Field>
            </div>
            <Field label="Display order"><Input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} /></Field>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Show on the website
              </label>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setForm(null)} className="btn-ghost">Cancel</button>
            <button onClick={save} className="btn-primary">{editId ? 'Save changes' : 'Add sub category'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
