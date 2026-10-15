import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import DocumentManager from '../../components/ui/DocumentManager';
import { PageHeader, Card, Field, Input, Select, Table, EmptyRow, RowActions, Modal } from '../../components/ui';

const blank = {
  drCode: '', name: '', category: '', qualification: '', speciality: '', divSubSpeciality: '',
  clinicName: '', complexArea: '', landmark: '', clinicCity: '', clinicState: '', pincode: '', clinicPhone: '',
  mobile: '', email: '',
  divisions: [],
};

const blankDivision = () => ({ divisionId: '', smsCode: '', designation: '', empCode: '', empName: '', hq: '', region: '' });

// Single (identity) fields, grouped for the form
const SECTIONS = [
  ['Basic details', [
    ['drCode', 'Dr. Code *'], ['name', 'Dr. Name *'], ['category', 'Category'],
    ['qualification', 'Qualification'], ['speciality', 'Speciality'], ['divSubSpeciality', 'Div. Sub Spec.'],
  ]],
  ['Clinic', [
    ['clinicName', 'Clinic / Hospital name'], ['complexArea', 'Complex / Area name'], ['landmark', 'Landmark'],
    ['clinicCity', 'Dr. city (clinic)'], ['clinicState', 'Clinic state'], ['pincode', 'Pincode'], ['clinicPhone', 'Clinic phone no.'],
  ]],
  ['Contact', [['mobile', 'Mobile no.'], ['email', 'Email ID']]],
];

export default function PassengerList() {
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [opts, setOpts] = useState({ specialities: [], cities: [] });
  const [filters, setFilters] = useState({ search: '', divisionId: '', speciality: '', city: '' });
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [docFor, setDocFor] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    return api.get('/fit/passengers', { params: filters }).then((r) => setRows(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/fit/divisions').then((r) => setDivisions(r.data));
    api.get('/fit/passengers/filters').then((r) => setOpts(r.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.divisionId, filters.speciality, filters.city]);

  const openAdd = () => { setForm({ ...blank, divisions: [blankDivision()] }); setEditId(null); setError(''); };
  const openEdit = (p) => {
    setForm({
      ...blank,
      ...Object.fromEntries(Object.keys(blank).filter((k) => k !== 'divisions').map((k) => [k, p[k] ?? ''])),
      divisions: (p.divisions || []).map((d) => ({
        divisionId: d.divisionId?._id || d.divisionId || '',
        smsCode: d.smsCode || '', designation: d.designation || '',
        empCode: d.empCode || '', empName: d.empName || '', hq: d.hq || '', region: d.region || '',
      })),
    });
    setEditId(p._id); setError('');
  };

  const save = async () => {
    setError('');
    if (!form.drCode?.trim()) return setError('Dr. Code is required.');
    if (!form.name?.trim()) return setError('Dr. Name is required.');
    try {
      if (editId) await api.put(`/fit/passengers/${editId}`, form);
      else await api.post('/fit/passengers', form);
      setForm(null); setEditId(null); load();
    } catch (err) { setError(err.response?.data?.message || 'Could not save this passenger.'); }
  };

  const del = async (p) => {
    if (await confirm({ title: 'Delete passenger?', message: `${p.name} (${p.drCode}) will be removed.` })) {
      await api.delete(`/fit/passengers/${p._id}`); load();
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // division row helpers
  const setDiv = (i, key, v) => {
    const next = form.divisions.map((d, x) => (x === i ? { ...d, [key]: v } : d));
    setForm({ ...form, divisions: next });
  };
  const addDiv = () => setForm({ ...form, divisions: [...form.divisions, blankDivision()] });
  const removeDiv = (i) => setForm({ ...form, divisions: form.divisions.filter((_, x) => x !== i) });

  const clearFilters = () => setFilters({ search: '', divisionId: '', speciality: '', city: '' });
  const hasFilter = Object.values(filters).some(Boolean);
  const divName = (d) => d.divisionId?.name || divisions.find((x) => String(x._id) === String(d.divisionId))?.name || 'Division';

  return (
    <div>
      <PageHeader eyebrow="Society" title="Passenger Master"
        actions={<button onClick={openAdd} className="btn-primary">Add passenger</button>} />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Search"><Input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Name, Dr. Code, mobile, clinic" /></Field>
          <Field label="Division">
            <Select value={filters.divisionId} onChange={(e) => setFilters({ ...filters, divisionId: e.target.value })}>
              <option value="">All divisions</option>
              {divisions.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Speciality">
            <Select value={filters.speciality} onChange={(e) => setFilters({ ...filters, speciality: e.target.value })}>
              <option value="">All specialities</option>
              {opts.specialities.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="City">
            <Select value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })}>
              <option value="">All cities</option>
              {opts.cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        {hasFilter && <div className="mt-3"><button onClick={clearFilters} className="btn-ghost btn-sm">Clear filters</button></div>}
      </Card>

      <Table head={['Dr. Code', 'Name', 'Speciality', 'Divisions', 'Clinic', 'City', 'Mobile', 'Docs', 'Actions']}>
        {loading && <EmptyRow span={9} text="Loading passengers…" />}
        {!loading && rows.length === 0 && <EmptyRow span={9} text={hasFilter ? 'No passengers match these filters.' : 'No passengers yet. Add one to get started.'} />}
        {!loading && rows.map((p) => (
          <tr key={p._id}>
            <td className="td font-mono font-medium text-ink">{p.drCode}</td>
            <td className="td font-medium text-ink">{p.name}</td>
            <td className="td">{p.speciality || '—'}</td>
            <td className="td">{(p.divisions || []).map(divName).join(', ') || '—'}</td>
            <td className="td">{p.clinicName || '—'}</td>
            <td className="td">{p.clinicCity || '—'}</td>
            <td className="td">{p.mobile || '—'}</td>
            <td className="td"><button onClick={() => setDocFor(p)} className="btn-ghost btn-sm">📎 {p.documents?.length || 0}</button></td>
            <td className="td"><RowActions onEdit={() => openEdit(p)} onDelete={() => del(p)} /></td>
          </tr>
        ))}
      </Table>

      {form && (
        <Modal title={editId ? `Edit passenger — ${form.name}` : 'Add passenger'} onClose={() => setForm(null)} maxWidth="max-w-4xl">
          <div className="max-h-[65vh] overflow-y-auto pr-1">
            {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

            {SECTIONS.map(([title, fields]) => (
              <div key={title} className="mb-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {fields.map(([k, label]) => (
                    <Field key={k} label={label}>
                      <Input value={form[k] || ''} onChange={set(k)} className={k === 'drCode' ? 'font-mono' : undefined} />
                    </Field>
                  ))}
                </div>
              </div>
            ))}

            {/* multi-division section */}
            <div className="mb-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Divisions (field-force detail per division)</span>
                <button type="button" onClick={addDiv} className="btn-ghost btn-sm">+ Add division</button>
              </div>
              {form.divisions.length === 0 && <p className="text-sm text-ink-muted">No divisions added yet.</p>}
              {form.divisions.map((d, i) => (
                <div key={i} className="mb-3 rounded-lg border border-line p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">Division {i + 1}</span>
                    <button type="button" onClick={() => removeDiv(i)} className="btn-danger btn-sm">Remove</button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Division">
                      <Select value={d.divisionId} onChange={(e) => setDiv(i, 'divisionId', e.target.value)}>
                        <option value="">Select…</option>
                        {divisions.map((dv) => <option key={dv._id} value={dv._id}>{dv.name}</option>)}
                      </Select>
                    </Field>
                    <Field label="SMS Code"><Input value={d.smsCode} onChange={(e) => setDiv(i, 'smsCode', e.target.value)} /></Field>
                    <Field label="Designation"><Input value={d.designation} onChange={(e) => setDiv(i, 'designation', e.target.value)} /></Field>
                    <Field label="Emp Code"><Input value={d.empCode} onChange={(e) => setDiv(i, 'empCode', e.target.value)} /></Field>
                    <Field label="Emp Name"><Input value={d.empName} onChange={(e) => setDiv(i, 'empName', e.target.value)} /></Field>
                    <Field label="HQ"><Input value={d.hq} onChange={(e) => setDiv(i, 'hq', e.target.value)} /></Field>
                    <Field label="Region"><Input value={d.region} onChange={(e) => setDiv(i, 'region', e.target.value)} /></Field>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2 border-t border-line pt-4">
            <button onClick={() => setForm(null)} className="btn-ghost">Cancel</button>
            <button onClick={save} className="btn-primary">{editId ? 'Save changes' : 'Add passenger'}</button>
          </div>
        </Modal>
      )}

      {docFor && <DocModal type="doctor" record={docFor} onClose={() => { setDocFor(null); load(); }} />}
    </div>
  );
}

// Shared document modal, still exported for FitEmployeeList.
export function DocModal({ type, record, onClose }) {
  const [docs, setDocs] = useState(record.documents || []);
  return (
    <Modal title={`Documents — ${record.name}`} onClose={onClose} maxWidth="max-w-2xl">
      <DocumentManager
        docs={docs}
        uploadUrl={`/fit/${type}/${record._id}/documents`}
        deleteUrl={(docId) => `/fit/${type}/${record._id}/documents/${docId}`}
        onChange={setDocs}
      />
      <div className="mt-4 text-right"><button onClick={onClose} className="btn-ghost">Close</button></div>
    </Modal>
  );
}
