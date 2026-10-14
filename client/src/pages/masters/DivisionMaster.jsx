import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Card, Field, Input, Select, Table, EmptyRow, RowActions } from '../../components/ui';

const MENU = 'master-division';   // permission key (req #4)

export default function DivisionMaster() {
  const confirm = useConfirm();
  const { can } = useAuth();
  const canCreate = can(MENU, 'CREATE'), canEdit = can(MENU, 'EDIT'), canDelete = can(MENU, 'DELETE');
  const [items, setItems] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [form, setForm] = useState({ name: '', clusterId: '' });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/fit/divisions').then((r) => setItems(r.data));
  useEffect(() => { load(); api.get('/fit/clusters').then((r) => setClusters(r.data)); }, []);

  const submit = async () => {
    setError('');
    if (!form.name.trim() || !form.clusterId) return setError('Division name and cluster are required.');
    try {
      if (editId) await api.put(`/fit/divisions/${editId}`, form);
      else await api.post('/fit/divisions', form);
      setForm({ name: '', clusterId: '' }); setEditId(null); load();
    } catch (err) { setError(err.response?.data?.message || 'Could not save the division.'); }
  };
  const edit = (it) => { setForm({ name: it.name, clusterId: it.clusterId?._id || it.clusterId }); setEditId(it._id); setError(''); };
  const del = async (it) => {
    setError('');
    if (await confirm({ title: 'Delete division?', message: `“${it.name}” will be removed.` })) {
      try { await api.delete(`/fit/divisions/${it._id}`); load(); }
      catch (err) { setError(err.response?.data?.message || 'Could not delete the division.'); }
    }
  };

  return (
    <div className="max-w-5xl">
      <PageHeader eyebrow="FIT Masters" title="Division Master" />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      {(canCreate || canEdit) && (
        <Card title={editId ? 'Edit division' : 'Add division'} className="mb-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1"><Field label="Division name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div>
            <div className="w-48"><Field label="Cluster">
              <Select value={form.clusterId} onChange={(e) => setForm({ ...form, clusterId: e.target.value })}>
                <option value="">Select…</option>
                {clusters.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </Select>
            </Field></div>
            {(editId ? canEdit : canCreate) && <button onClick={submit} className="btn-primary">{editId ? 'Update' : 'Add'}</button>}
            {editId && <button onClick={() => { setEditId(null); setForm({ name: '', clusterId: '' }); setError(''); }} className="btn-ghost">Cancel</button>}
          </div>
        </Card>
      )}
      <Table head={['Division', 'Cluster', 'Actions']}>
        {items.length === 0 && <EmptyRow span={3} />}
        {items.map((it) => (
          <tr key={it._id}>
            <td className="td font-medium text-ink">{it.name}</td>
            <td className="td">{it.clusterId?.name || '—'}</td>
            <td className="td"><RowActions onEdit={canEdit ? () => edit(it) : undefined} onDelete={canDelete ? () => del(it) : undefined} /></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
