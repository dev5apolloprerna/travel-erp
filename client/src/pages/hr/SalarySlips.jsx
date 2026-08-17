import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Card, Field, Input, Select, Table, EmptyRow } from '../../components/ui';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();

export default function SalarySlips() {
  const confirm = useConfirm();
  const [slips, setSlips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filterEmp, setFilterEmp] = useState('');
  const [form, setForm] = useState({ employeeId: '', month: now.getMonth() + 1, year: now.getFullYear(), remark: '' });
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const apiBase = api.defaults.baseURL.replace(/\/api$/, '');
  const load = () => api.get('/hr/salary-slips', { params: filterEmp ? { employeeId: filterEmp } : {} }).then((r) => setSlips(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterEmp]);
  useEffect(() => { api.get('/hr/employees').then((r) => setEmployees(r.data)); }, []);

  const upload = async () => {
    setMsg(null);
    if (!form.employeeId) return setMsg({ type: 'error', text: 'Please select an employee.' });
    if (!file) return setMsg({ type: 'error', text: 'Please choose the salary slip file.' });

    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('file', file);
      await api.post('/hr/salary-slips', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg({ type: 'ok', text: 'Salary slip uploaded. The employee can now see it in their portal.' });
      setFile(null);
      const el = document.getElementById('slip-file'); if (el) el.value = '';
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Upload failed.' });
    } finally { setBusy(false); }
  };

  const del = async (s) => {
    if (await confirm({ title: 'Delete salary slip?', message: `${MONTHS[s.month - 1]} ${s.year} slip will be removed.` }))
      { await api.delete(`/hr/salary-slips/${s._id}`); load(); }
  };

  return (
    <div>
      <PageHeader eyebrow="HR" title="Salary Slips" />

      <Card title="Upload salary slip" className="mb-5">
        {msg && (
          <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${msg.type === 'ok' ? 'bg-accent-light text-accent-dark' : 'bg-red-50 text-red-600'}`}>
            {msg.text}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Employee">
            <Select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">Select employee…</option>
              {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
            </Select>
          </Field>
          <Field label="Month">
            <Select value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Year"><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></Field>
          <Field label="File (PDF)">
            <input id="slip-file" type="file" onChange={(e) => setFile(e.target.files[0])}
              className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-sm" />
          </Field>
        </div>
        <div className="mt-3 flex items-end gap-3">
          <div className="min-w-[240px] flex-1"><Field label="Remark (optional)"><Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></Field></div>
          <button onClick={upload} disabled={busy} className="btn-primary">{busy ? 'Uploading…' : 'Upload slip'}</button>
        </div>
      </Card>

      <div className="mb-3 w-64">
        <Field label="Filter by employee">
          <Select value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)}>
            <option value="">All employees</option>
            {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
          </Select>
        </Field>
      </div>

      <Table head={['Employee', 'Period', 'File', 'Remark', 'Uploaded', 'Actions']}>
        {slips.length === 0 && <EmptyRow span={6} text="No salary slips uploaded yet." />}
        {slips.map((s) => (
          <tr key={s._id}>
            <td className="td font-medium text-ink">{s.employeeId?.name || '—'}</td>
            <td className="td">{MONTHS[s.month - 1]} {s.year}</td>
            <td className="td"><a href={`${apiBase}${s.fileUrl}`} target="_blank" rel="noreferrer" className="text-brand hover:underline">Download</a></td>
            <td className="td">{s.remark || '—'}</td>
            <td className="td">{new Date(s.createdAt).toLocaleDateString('en-IN')}</td>
            <td className="td"><button onClick={() => del(s)} className="btn-danger btn-sm">Delete</button></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
