import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Card, Field, Input, Select, Table, EmptyRow, RowActions } from '../../components/ui';

export default function DivisionMaster() {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [form, setForm] = useState({ name: '', clusterId: '' });
  const [editId, setEditId] = useState(null);

  const load = () => api.get('/fit/divisions').then((r) => setItems(r.data));
  useEffect(() => { load(); api.get('/fit/clusters').then((r) => setClusters(r.data)); }, []);

  const submit = async () => {
    if (!form.name.trim() || !form.clusterId) return;
    if (editId) await api.put(`/fit/divisions/${editId}`, form);
    else await api.post('/fit/divisions', form);
    setForm({ name: '', clusterId: '' }); setEditId(null); load();
  };
  const edit = (it) => { setForm({ name: it.name, clusterId: it.clusterId?._id || it.clusterId }); setEditId(it._id); };
  const del = async (it) => {
    if (await confirm({ title: 'Delete division?', message: `“${it.name}” will be removed.` }))
      { await api.delete(`/fit/divisions/${it._id}`); load(); }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="FIT Masters" title="Division Master" />
      <Card title={editId ? 'Edit division' : 'Add division'} className="mb-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1"><Field label="Division name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div>
          <div className="w-48"><Field label="Cluster">
            <Select value={form.clusterId} onChange={(e) => setForm({ ...form, clusterId: e.target.value })}>
              <option value="">Select…</option>
              {clusters.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </Select>
          </Field></div>
          <button onClick={submit} className="btn-primary">{editId ? 'Update' : 'Add'}</button>
          {editId && <button onClick={() => { setEditId(null); setForm({ name: '', clusterId: '' }); }} className="btn-ghost">Cancel</button>}
        </div>
      </Card>
      <Table head={['Division', 'Cluster', 'Actions']}>
        {items.length === 0 && <EmptyRow span={3} />}
        {items.map((it) => (
          <tr key={it._id}>
            <td className="td font-medium text-ink">{it.name}</td>
            <td className="td">{it.clusterId?.name || '—'}</td>
            <td className="td"><RowActions onEdit={() => edit(it)} onDelete={() => del(it)} /></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
