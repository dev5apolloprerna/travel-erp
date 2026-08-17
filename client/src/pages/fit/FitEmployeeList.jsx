import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Table, EmptyRow, Card, Field, Input, Select, RowActions } from '../../components/ui';
import { DocModal } from './DoctorList';

const blank = { name: '', email: '', contact: '', departmentId: '', clusterId: '', divisionId: '' };

export default function FitEmployeeList() {
  const confirm = useConfirm();
  const [employees, setEmployees] = useState([]);
  const [masters, setMasters] = useState({ departments: [], clusters: [], divisions: [] });
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [docFor, setDocFor] = useState(null);

  const load = () => api.get('/fit/employees').then((r) => setEmployees(r.data));
  useEffect(() => {
    load();
    Promise.all([
      api.get('/fit/departments'), api.get('/fit/clusters'), api.get('/fit/divisions'),
    ]).then(([d, c, v]) => setMasters({ departments: d.data, clusters: c.data, divisions: v.data }));
  }, []);

  // Only show divisions that belong to the chosen cluster
  const divisionsForCluster = form.clusterId
    ? masters.divisions.filter((d) => String(d.clusterId?._id || d.clusterId) === String(form.clusterId))
    : masters.divisions;

  const submit = async () => {
    if (!form.name.trim()) return;
    const payload = { ...form };
    Object.keys(payload).forEach((k) => { if (payload[k] === '') payload[k] = null; });
    if (editId) await api.put(`/fit/employees/${editId}`, payload);
    else await api.post('/fit/employees', payload);
    setForm(blank); setEditId(null); load();
  };

  const edit = (e) => {
    setForm({
      name: e.name || '', email: e.email || '', contact: e.contact || '',
      departmentId: e.departmentId?._id || e.departmentId || '',
      clusterId: e.clusterId?._id || e.clusterId || '',
      divisionId: e.divisionId?._id || e.divisionId || '',
    });
    setEditId(e._id);
  };

  const del = async (e) => {
    if (await confirm({ title: 'Delete member?', message: `${e.name} will be removed.` }))
      { await api.delete(`/fit/employees/${e._id}`); load(); }
  };

  return (
    <div>
      <PageHeader eyebrow="Society" title="Society Members" />

      <Card title={editId ? 'Edit member' : 'Add member'} className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Contact"><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></Field>
          <Field label="Department">
            <Select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">Select…</option>
              {masters.departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Cluster">
            <Select value={form.clusterId} onChange={(e) => setForm({ ...form, clusterId: e.target.value, divisionId: '' })}>
              <option value="">Select…</option>
              {masters.clusters.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Division">
            <Select value={form.divisionId} onChange={(e) => setForm({ ...form, divisionId: e.target.value })}>
              <option value="">Select…</option>
              {divisionsForCluster.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={submit} className="btn-primary">{editId ? 'Update member' : 'Add member'}</button>
          {editId && <button onClick={() => { setEditId(null); setForm(blank); }} className="btn-ghost">Cancel</button>}
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Members carry a department plus an optional cluster / division. No grade or spend limit applies to members.
        </p>
      </Card>

      <Table head={['Member', 'Department', 'Cluster', 'Division', 'Documents', 'Actions']}>
        {employees.length === 0 && <EmptyRow span={6} text="No members yet." />}
        {employees.map((e) => (
          <tr key={e._id}>
            <td className="td font-medium text-ink">{e.name}</td>
            <td className="td">{e.departmentId?.name || '—'}</td>
            <td className="td">{e.clusterId?.name || '—'}</td>
            <td className="td">{e.divisionId?.name || '—'}</td>
            <td className="td">
              <button onClick={() => setDocFor(e)} className="btn-ghost btn-sm">
                📎 Documents ({e.documents?.length || 0})
              </button>
            </td>
            <td className="td"><RowActions onEdit={() => edit(e)} onDelete={() => del(e)} /></td>
          </tr>
        ))}
      </Table>

      {docFor && <DocModal type="employee" record={docFor} onClose={() => { setDocFor(null); load(); }} />}
    </div>
  );
}
