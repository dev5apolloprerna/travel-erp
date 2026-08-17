import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import ImageUpload from '../../components/ui/ImageUpload';
import { PageHeader, Card, Field, Input, Textarea, Table, EmptyRow, RowActions, Badge, Modal, Tabs } from '../../components/ui';

const blank = {
  categoryId: '', subCategoryId: '', name: '',
  bannerImage: '', sliderImages: [],
  shortDescription: '', longDescription: '',
  places: '', bestTimeSeasons: '', bestTimeMonths: '',
  uniquelyPopularFor: '', touristAttractions: '', memorablePursuits: '',
  somethingLeisurely: '', quickTips: '',
  displayOrder: 0, isFeatured: false, isActive: true,
  seoTitle: '', seoDescription: '', seoKeywords: '',
};

// Content blocks that are simple lists — one item per line.
const LIST_FIELDS = [
  ['places', 'Places', 'Nassau\nParadise Island'],
  ['bestTimeSeasons', 'Best time — seasons', 'Winter\nSpring'],
  ['bestTimeMonths', 'Best time — months', 'November\nDecember'],
  ['uniquelyPopularFor', 'Uniquely popular for', 'Swimming pigs\nPink sand beaches'],
  ['touristAttractions', 'General tourist attractions', 'Atlantis Paradise Island'],
  ['memorablePursuits', 'Memorable pursuits', 'Snorkelling\nDiving'],
  ['somethingLeisurely', 'Something leisurely', 'Beach walks'],
  ['quickTips', 'Quick tips from locals', 'Carry cash for the straw market'],
];

const toText = (v) => (Array.isArray(v) ? v.join('\n') : v || '');

export default function DestinationMaster() {
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [subs, setSubs] = useState([]);
  const [filters, setFilters] = useState({ categoryId: '', search: '' });
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [tab, setTab] = useState('basic');
  const [error, setError] = useState('');

  const load = () => api.get('/cms/destinations', { params: filters }).then((r) => setRows(r.data));
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [filters.categoryId, filters.search]);
  useEffect(() => {
    api.get('/cms/categories').then((r) => setCats(r.data));
    api.get('/cms/subcategories').then((r) => setSubs(r.data));
  }, []);

  const subsFor = (categoryId) =>
    categoryId ? subs.filter((s) => String(s.categoryId?._id || s.categoryId) === String(categoryId)) : subs;

  const open = (row) => {
    setTab('basic'); setError('');
    if (!row) { setForm({ ...blank }); setEditId(null); return; }
    setForm({
      ...blank,
      ...row,
      categoryId: row.categoryId?._id || row.categoryId || '',
      subCategoryId: row.subCategoryId?._id || row.subCategoryId || '',
      sliderImages: row.sliderImages || [],
      ...Object.fromEntries(LIST_FIELDS.map(([k]) => [k, toText(row[k])])),
    });
    setEditId(row._id);
  };

  const save = async () => {
    setError('');
    if (!form.name.trim()) return setError('Destination name is required.');
    try {
      if (editId) await api.put(`/cms/destinations/${editId}`, form);
      else await api.post('/cms/destinations', form);
      setForm(null); setEditId(null); load();
    } catch (err) { setError(err.response?.data?.message || 'Could not save this destination.'); }
  };

  const del = async (row) => {
    if (await confirm({ title: 'Delete destination?', message: `${row.name} and its images will be removed.` })) {
      await api.delete(`/cms/destinations/${row._id}`); load();
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <PageHeader eyebrow="Website" title="Destinations"
        actions={<button onClick={() => open(null)} className="btn-primary">Add destination</button>} />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Search"><Input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Destination name" /></Field>
          <Field label="Main category">
            <select value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })} className="input">
              <option value="">All categories</option>
              {cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      <Table head={['Destination', 'Category', 'Sub category', 'URL slug', 'Featured', 'Status', 'Actions']}>
        {rows.length === 0 && <EmptyRow span={7} text="No destinations yet. Add one to publish it on the website." />}
        {rows.map((r) => (
          <tr key={r._id}>
            <td className="td font-medium text-ink">{r.name}</td>
            <td className="td">{r.categoryId?.name || '—'}</td>
            <td className="td">{r.subCategoryId?.name || '—'}</td>
            <td className="td font-mono text-xs">{r.slug}</td>
            <td className="td">{r.isFeatured ? <Badge status="PARTIAL">Featured</Badge> : '—'}</td>
            <td className="td"><Badge status={r.isActive ? 'PAID' : 'UNPAID'}>{r.isActive ? 'Live' : 'Hidden'}</Badge></td>
            <td className="td"><RowActions onEdit={() => open(r)} onDelete={() => del(r)} /></td>
          </tr>
        ))}
      </Table>

      {form && (
        <Modal title={editId ? `Edit ${form.name}` : 'Add destination'} onClose={() => setForm(null)} maxWidth="max-w-4xl">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <Tabs active={tab} onChange={setTab} tabs={[
            { key: 'basic', label: 'Basic' },
            { key: 'media', label: 'Images' },
            { key: 'content', label: 'Content blocks' },
            { key: 'seo', label: 'SEO' },
          ]} />

          <div className="max-h-[60vh] overflow-y-auto pr-1">
            {tab === 'basic' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Main category">
                  <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value, subCategoryId: '' })} className="input">
                    <option value="">Select…</option>
                    {cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Sub category">
                  <select value={form.subCategoryId} onChange={set('subCategoryId')} className="input">
                    <option value="">Select…</option>
                    {subsFor(form.categoryId).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </Field>
                <div className="sm:col-span-2"><Field label="Destination name *"><Input value={form.name} onChange={set('name')} placeholder="Bahamas" /></Field></div>
                <div className="sm:col-span-2"><Field label="Short description"><Textarea rows={2} value={form.shortDescription} onChange={set('shortDescription')} /></Field></div>
                <div className="sm:col-span-2"><Field label="Full description"><Textarea rows={5} value={form.longDescription} onChange={set('longDescription')} /></Field></div>
                <Field label="Display order"><Input type="number" value={form.displayOrder} onChange={set('displayOrder')} /></Field>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm text-ink-soft">
                    <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
                    Featured
                  </label>
                  <label className="flex items-center gap-2 text-sm text-ink-soft">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                    Live on website
                  </label>
                </div>
              </div>
            )}

            {tab === 'media' && (
              <div className="space-y-5">
                <Field label="Banner image (top of the page)">
                  <ImageUpload value={form.bannerImage} onChange={(bannerImage) => setForm({ ...form, bannerImage })} label="banner" />
                </Field>
                <Field label="Slider images (gallery)">
                  <ImageUpload multiple values={form.sliderImages} onChange={(sliderImages) => setForm({ ...form, sliderImages })} label="image" />
                </Field>
              </div>
            )}

            {tab === 'content' && (
              <div className="space-y-4">
                <p className="text-xs text-ink-muted">Enter one item per line. These become the bulleted sections on the destination page.</p>
                {LIST_FIELDS.map(([k, label, placeholder]) => (
                  <Field key={k} label={label}>
                    <Textarea rows={3} value={form[k]} onChange={set(k)} placeholder={placeholder} />
                  </Field>
                ))}
              </div>
            )}

            {tab === 'seo' && (
              <div className="grid gap-3">
                <Field label="SEO title"><Input value={form.seoTitle} onChange={set('seoTitle')} /></Field>
                <Field label="SEO description"><Textarea rows={3} value={form.seoDescription} onChange={set('seoDescription')} /></Field>
                <Field label="SEO keywords"><Input value={form.seoKeywords} onChange={set('seoKeywords')} placeholder="bahamas, caribbean holiday" /></Field>
                {editId && <p className="text-xs text-ink-muted">Page URL: <span className="font-mono">/{form.slug}</span></p>}
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2 border-t border-line pt-4">
            <button onClick={() => setForm(null)} className="btn-ghost">Cancel</button>
            <button onClick={save} className="btn-primary">{editId ? 'Save changes' : 'Add destination'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
