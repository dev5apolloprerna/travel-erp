import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import ImageUpload from '../../components/ui/ImageUpload';
import { PageHeader, Field, Input, Textarea, Table, EmptyRow, RowActions, Badge, Modal, Tabs } from '../../components/ui';

/** FAQ and testimonial masters for the public website. */
export default function ContentMaster() {
  const [tab, setTab] = useState('faqs');
  return (
    <div>
      <PageHeader eyebrow="Website" title="FAQ & Testimonials" />
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'faqs', label: 'FAQs' },
        { key: 'testimonials', label: 'Testimonials' },
      ]} />
      {tab === 'faqs' ? <Faqs /> : <Testimonials />}
    </div>
  );
}

const blankFaq = { question: '', answer: '', category: 'General', displayOrder: 0, isActive: true };

function Faqs() {
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/cms/faqs').then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setError('');
    if (!form.question.trim() || !form.answer.trim()) return setError('Both the question and answer are required.');
    if (editId) await api.put(`/cms/faqs/${editId}`, form);
    else await api.post('/cms/faqs', form);
    setForm(null); setEditId(null); load();
  };

  const del = async (row) => {
    if (await confirm({ title: 'Delete FAQ?', message: row.question })) { await api.delete(`/cms/faqs/${row._id}`); load(); }
  };

  return (
    <>
      <div className="mb-3">
        <button onClick={() => { setForm({ ...blankFaq }); setEditId(null); setError(''); }} className="btn-primary">Add FAQ</button>
      </div>

      <Table head={['Question', 'Category', 'Order', 'Status', 'Actions']}>
        {rows.length === 0 && <EmptyRow span={5} text="No FAQs yet. Add the questions travellers ask most." />}
        {rows.map((r) => (
          <tr key={r._id}>
            <td className="td font-medium text-ink">{r.question}</td>
            <td className="td">{r.category}</td>
            <td className="td">{r.displayOrder}</td>
            <td className="td"><Badge status={r.isActive ? 'PAID' : 'UNPAID'}>{r.isActive ? 'Live' : 'Hidden'}</Badge></td>
            <td className="td"><RowActions onEdit={() => { setForm({ ...blankFaq, ...r }); setEditId(r._id); setError(''); }} onDelete={() => del(r)} /></td>
          </tr>
        ))}
      </Table>

      {form && (
        <Modal title={editId ? 'Edit FAQ' : 'Add FAQ'} onClose={() => setForm(null)} maxWidth="max-w-2xl">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="space-y-3">
            <Field label="Question *"><Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></Field>
            <Field label="Answer *"><Textarea rows={4} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Booking, Payment, Visa" /></Field>
              <Field label="Display order"><Input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Show on the website
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setForm(null)} className="btn-ghost">Cancel</button>
            <button onClick={save} className="btn-primary">{editId ? 'Save changes' : 'Add FAQ'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}

const blankT = { name: '', location: '', photo: '', rating: 5, message: '', packageId: '', travelDate: '', displayOrder: 0, isActive: true };

function Testimonials() {
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/cms/testimonials').then((r) => setRows(r.data));
  useEffect(() => { load(); api.get('/cms/packages').then((r) => setPackages(r.data)); }, []);

  const save = async () => {
    setError('');
    if (!form.name.trim() || !form.message.trim()) return setError('Name and message are required.');
    const payload = { ...form };
    if (!payload.packageId) delete payload.packageId;
    if (!payload.travelDate) delete payload.travelDate;
    if (editId) await api.put(`/cms/testimonials/${editId}`, payload);
    else await api.post('/cms/testimonials', payload);
    setForm(null); setEditId(null); load();
  };

  const del = async (row) => {
    if (await confirm({ title: 'Delete testimonial?', message: `From ${row.name}.` })) { await api.delete(`/cms/testimonials/${row._id}`); load(); }
  };

  return (
    <>
      <div className="mb-3">
        <button onClick={() => { setForm({ ...blankT }); setEditId(null); setError(''); }} className="btn-primary">Add testimonial</button>
      </div>

      <Table head={['Name', 'Location', 'Rating', 'Package', 'Order', 'Status', 'Actions']}>
        {rows.length === 0 && <EmptyRow span={7} text="No testimonials yet. Add feedback from happy travellers." />}
        {rows.map((r) => (
          <tr key={r._id}>
            <td className="td font-medium text-ink">{r.name}</td>
            <td className="td">{r.location || '—'}</td>
            <td className="td">{'★'.repeat(r.rating || 0)}</td>
            <td className="td">{r.packageId?.name || '—'}</td>
            <td className="td">{r.displayOrder}</td>
            <td className="td"><Badge status={r.isActive ? 'PAID' : 'UNPAID'}>{r.isActive ? 'Live' : 'Hidden'}</Badge></td>
            <td className="td">
              <RowActions
                onEdit={() => {
                  setForm({ ...blankT, ...r, packageId: r.packageId?._id || r.packageId || '', travelDate: r.travelDate ? String(r.travelDate).slice(0, 10) : '' });
                  setEditId(r._id); setError('');
                }}
                onDelete={() => del(r)} />
            </td>
          </tr>
        ))}
      </Table>

      {form && (
        <Modal title={editId ? 'Edit testimonial' : 'Add testimonial'} onClose={() => setForm(null)} maxWidth="max-w-2xl">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Traveller name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ahmedabad" /></Field>
            <div className="sm:col-span-2"><Field label="Message *"><Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field></div>
            <Field label="Rating">
              <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} className="input">
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}
              </select>
            </Field>
            <Field label="Package">
              <select value={form.packageId} onChange={(e) => setForm({ ...form, packageId: e.target.value })} className="input">
                <option value="">Not linked</option>
                {packages.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Travel date"><Input type="date" value={form.travelDate} onChange={(e) => setForm({ ...form, travelDate: e.target.value })} /></Field>
            <Field label="Display order"><Input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Field label="Photo"><ImageUpload value={form.photo} onChange={(photo) => setForm({ ...form, photo })} label="photo" /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-soft sm:col-span-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Show on the website
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setForm(null)} className="btn-ghost">Cancel</button>
            <button onClick={save} className="btn-primary">{editId ? 'Save changes' : 'Add testimonial'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
