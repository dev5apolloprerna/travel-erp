import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import ImageUpload from '../../components/ui/ImageUpload';
import { PageHeader, Card, Field, Input, Textarea, Table, EmptyRow, RowActions, Badge, Modal, Tabs, money } from '../../components/ui';

const blank = {
  name: '', packageCode: '', type: 'DOMESTIC',
  categoryId: '', subCategoryId: '', destinationId: '',
  durationDays: 1, durationNights: 0,
  price: 0, discountPrice: 0, currency: 'INR', gstPercent: 5,
  bannerImage: '', images: [],
  overview: '', highlights: '', inclusions: '', exclusions: '', termsConditions: '',
  itinerary: [],
  maxPax: 0, availableFrom: '', availableTo: '',
  displayOrder: 0, isFeatured: false, isActive: true,
  seoTitle: '', seoDescription: '', seoKeywords: '',
};

const MEALS = ['Breakfast', 'Lunch', 'Dinner'];
const toText = (v) => (Array.isArray(v) ? v.join('\n') : v || '');
const dateVal = (d) => (d ? String(d).slice(0, 10) : '');

export default function PackageMaster() {
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [dests, setDests] = useState([]);
  const [cats, setCats] = useState([]);
  const [filters, setFilters] = useState({ type: '', search: '' });
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [tab, setTab] = useState('basic');
  const [error, setError] = useState('');

  const load = () => api.get('/cms/packages', { params: filters }).then((r) => setRows(r.data));
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [filters.type, filters.search]);
  useEffect(() => {
    api.get('/cms/destinations').then((r) => setDests(r.data));
    api.get('/cms/categories').then((r) => setCats(r.data));
  }, []);

  const open = (row) => {
    setTab('basic'); setError('');
    if (!row) { setForm({ ...blank }); setEditId(null); return; }
    setForm({
      ...blank, ...row,
      categoryId: row.categoryId?._id || row.categoryId || '',
      subCategoryId: row.subCategoryId?._id || row.subCategoryId || '',
      destinationId: row.destinationId?._id || row.destinationId || '',
      highlights: toText(row.highlights),
      inclusions: toText(row.inclusions),
      exclusions: toText(row.exclusions),
      images: row.images || [],
      itinerary: (row.itinerary || []).map((d) => ({ ...d, meals: d.meals || [] })),
      availableFrom: dateVal(row.availableFrom),
      availableTo: dateVal(row.availableTo),
    });
    setEditId(row._id);
  };

  const save = async () => {
    setError('');
    if (!form.name.trim()) return setError('Package name is required.');
    if (Number(form.price) <= 0) return setError('Enter a price per person.');
    const payload = { ...form };
    if (!payload.categoryId) delete payload.categoryId;
    if (!payload.subCategoryId) delete payload.subCategoryId;
    if (!payload.destinationId) delete payload.destinationId;
    if (!payload.availableFrom) delete payload.availableFrom;
    if (!payload.availableTo) delete payload.availableTo;
    try {
      if (editId) await api.put(`/cms/packages/${editId}`, payload);
      else await api.post('/cms/packages', payload);
      setForm(null); setEditId(null); load();
    } catch (err) { setError(err.response?.data?.message || 'Could not save this package.'); }
  };

  const del = async (row) => {
    if (await confirm({ title: 'Delete package?', message: `${row.name} will be removed from the website.` })) {
      await api.delete(`/cms/packages/${row._id}`); load();
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  /* ---- itinerary helpers ---- */
  const addDay = () =>
    setForm({ ...form, itinerary: [...form.itinerary, { day: form.itinerary.length + 1, title: '', description: '', meals: [], hotel: '', city: '' }] });
  const setDay = (i, key, value) => {
    const next = [...form.itinerary];
    next[i] = { ...next[i], [key]: value };
    setForm({ ...form, itinerary: next });
  };
  const toggleMeal = (i, meal) => {
    const meals = form.itinerary[i].meals || [];
    setDay(i, 'meals', meals.includes(meal) ? meals.filter((m) => m !== meal) : [...meals, meal]);
  };
  const removeDay = (i) =>
    setForm({ ...form, itinerary: form.itinerary.filter((_, x) => x !== i).map((d, n) => ({ ...d, day: n + 1 })) });

  return (
    <div>
      <PageHeader eyebrow="Website" title="Tour Packages"
        actions={<button onClick={() => open(null)} className="btn-primary">Add package</button>} />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Search"><Input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Package name" /></Field>
          <Field label="Type">
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="input">
              <option value="">All types</option>
              <option value="DOMESTIC">Domestic</option>
              <option value="INTERNATIONAL">International</option>
            </select>
          </Field>
        </div>
      </Card>

      <Table head={['Package', 'Type', 'Destination', 'Duration', 'Price', 'Itinerary', 'Status', 'Actions']}>
        {rows.length === 0 && <EmptyRow span={8} text="No packages yet. Add one to sell it on the website." />}
        {rows.map((r) => (
          <tr key={r._id}>
            <td className="td font-medium text-ink">{r.name}</td>
            <td className="td"><Badge>{r.type}</Badge></td>
            <td className="td">{r.destinationId?.name || '—'}</td>
            <td className="td">{r.durationDays}D / {r.durationNights}N</td>
            <td className="td">
              {r.discountPrice > 0
                ? <><span className="line-through text-ink-muted">{money(r.price)}</span> {money(r.discountPrice)}</>
                : money(r.price)}
            </td>
            <td className="td">{r.itinerary?.length || 0} day(s)</td>
            <td className="td"><Badge status={r.isActive ? 'PAID' : 'UNPAID'}>{r.isActive ? 'Live' : 'Hidden'}</Badge></td>
            <td className="td"><RowActions onEdit={() => open(r)} onDelete={() => del(r)} /></td>
          </tr>
        ))}
      </Table>

      {form && (
        <Modal title={editId ? `Edit ${form.name}` : 'Add package'} onClose={() => setForm(null)} maxWidth="max-w-4xl">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <Tabs active={tab} onChange={setTab} tabs={[
            { key: 'basic', label: 'Basic & pricing' },
            { key: 'itinerary', label: `Itinerary (${form.itinerary.length})` },
            { key: 'content', label: 'Inclusions & content' },
            { key: 'media', label: 'Images' },
            { key: 'seo', label: 'SEO' },
          ]} />

          <div className="max-h-[60vh] overflow-y-auto pr-1">
            {tab === 'basic' && (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2"><Field label="Package name *"><Input value={form.name} onChange={set('name')} /></Field></div>
                <Field label="Package code"><Input value={form.packageCode} onChange={set('packageCode')} /></Field>

                <Field label="Type *">
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, currency: e.target.value === 'INTERNATIONAL' ? 'USD' : 'INR' })} className="input">
                    <option value="DOMESTIC">Domestic</option>
                    <option value="INTERNATIONAL">International</option>
                  </select>
                </Field>
                <Field label="Main category">
                  <select value={form.categoryId} onChange={set('categoryId')} className="input">
                    <option value="">Select…</option>
                    {cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Destination">
                  <select value={form.destinationId} onChange={set('destinationId')} className="input">
                    <option value="">Select…</option>
                    {dests.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </Field>

                <Field label="Days"><Input type="number" value={form.durationDays} onChange={set('durationDays')} /></Field>
                <Field label="Nights"><Input type="number" value={form.durationNights} onChange={set('durationNights')} /></Field>
                <Field label="Max travellers (0 = no limit)"><Input type="number" value={form.maxPax} onChange={set('maxPax')} /></Field>

                <Field label="Price per person *"><Input type="number" value={form.price} onChange={set('price')} /></Field>
                <Field label="Discounted price (0 = none)"><Input type="number" value={form.discountPrice} onChange={set('discountPrice')} /></Field>
                <Field label="Currency"><Input value={form.currency} onChange={set('currency')} /></Field>

                <Field label="GST %"><Input type="number" value={form.gstPercent} onChange={set('gstPercent')} /></Field>
                <Field label="Available from"><Input type="date" value={form.availableFrom} onChange={set('availableFrom')} /></Field>
                <Field label="Available to"><Input type="date" value={form.availableTo} onChange={set('availableTo')} /></Field>

                <Field label="Display order"><Input type="number" value={form.displayOrder} onChange={set('displayOrder')} /></Field>
                <div className="flex items-end gap-4 sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm text-ink-soft">
                    <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
                    Featured
                  </label>
                  <label className="flex items-center gap-2 text-sm text-ink-soft">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                    Live on website
                  </label>
                </div>
                <p className="text-xs text-ink-muted sm:col-span-3">
                  Domestic packages are paid through Razorpay, international through Stripe.
                </p>
              </div>
            )}

            {tab === 'itinerary' && (
              <div className="space-y-3">
                {form.itinerary.length === 0 && (
                  <p className="text-sm text-ink-muted">No days added yet. Build the day-by-day plan travellers will see.</p>
                )}
                {form.itinerary.map((d, i) => (
                  <div key={i} className="rounded-lg border border-line p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">Day {d.day}</span>
                      <button onClick={() => removeDay(i)} className="btn-danger btn-sm">Remove day</button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Title"><Input value={d.title} onChange={(e) => setDay(i, 'title', e.target.value)} placeholder="Arrive in Nassau" /></Field>
                      <Field label="City"><Input value={d.city} onChange={(e) => setDay(i, 'city', e.target.value)} /></Field>
                      <div className="sm:col-span-2"><Field label="Description"><Textarea rows={3} value={d.description} onChange={(e) => setDay(i, 'description', e.target.value)} /></Field></div>
                      <Field label="Hotel"><Input value={d.hotel} onChange={(e) => setDay(i, 'hotel', e.target.value)} /></Field>
                      <Field label="Meals included">
                        <div className="flex gap-2 pt-1">
                          {MEALS.map((m) => (
                            <button key={m} type="button" onClick={() => toggleMeal(i, m)}
                              className={`rounded-lg border px-2 py-1 text-xs font-medium transition ${
                                (d.meals || []).includes(m) ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink-soft hover:bg-canvas'
                              }`}>{m}</button>
                          ))}
                        </div>
                      </Field>
                    </div>
                  </div>
                ))}
                <button onClick={addDay} className="btn-ghost btn-sm">+ Add day</button>
              </div>
            )}

            {tab === 'content' && (
              <div className="space-y-4">
                <Field label="Overview"><Textarea rows={4} value={form.overview} onChange={set('overview')} /></Field>
                <p className="text-xs text-ink-muted">Enter one item per line for the lists below.</p>
                <Field label="Highlights"><Textarea rows={3} value={form.highlights} onChange={set('highlights')} /></Field>
                <Field label="Inclusions"><Textarea rows={3} value={form.inclusions} onChange={set('inclusions')} placeholder="Return flights\n4 nights hotel" /></Field>
                <Field label="Exclusions"><Textarea rows={3} value={form.exclusions} onChange={set('exclusions')} placeholder="Visa fees\nPersonal expenses" /></Field>
                <Field label="Terms & conditions"><Textarea rows={4} value={form.termsConditions} onChange={set('termsConditions')} /></Field>
              </div>
            )}

            {tab === 'media' && (
              <div className="space-y-5">
                <Field label="Banner image"><ImageUpload value={form.bannerImage} onChange={(bannerImage) => setForm({ ...form, bannerImage })} label="banner" /></Field>
                <Field label="Gallery images"><ImageUpload multiple values={form.images} onChange={(images) => setForm({ ...form, images })} label="image" /></Field>
              </div>
            )}

            {tab === 'seo' && (
              <div className="grid gap-3">
                <Field label="SEO title"><Input value={form.seoTitle} onChange={set('seoTitle')} /></Field>
                <Field label="SEO description"><Textarea rows={3} value={form.seoDescription} onChange={set('seoDescription')} /></Field>
                <Field label="SEO keywords"><Input value={form.seoKeywords} onChange={set('seoKeywords')} /></Field>
                {editId && <p className="text-xs text-ink-muted">Page URL: <span className="font-mono">/{form.slug}</span></p>}
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2 border-t border-line pt-4">
            <button onClick={() => setForm(null)} className="btn-ghost">Cancel</button>
            <button onClick={save} className="btn-primary">{editId ? 'Save changes' : 'Add package'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
