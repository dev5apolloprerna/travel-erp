import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Card, Field, Input, Table, EmptyRow, RowActions } from '../../components/ui';

const MENU = 'master-cluster';   // permission key (req #4)

export default function ClusterMaster() {
  const confirm = useConfirm();
  const { can } = useAuth();
  const canCreate = can(MENU, 'CREATE'), canEdit = can(MENU, 'EDIT'), canDelete = can(MENU, 'DELETE');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '' });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/fit/clusters').then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    setError('');
    if (!form.name.trim()) return setError('Cluster name is required.');
    try {
      if (editId) await api.put(`/fit/clusters/${editId}`, form);
      else await api.post('/fit/clusters', form);
      setForm({ name: '' }); setEditId(null); load();
    } catch (err) { setError(err.response?.data?.message || 'Could not save the cluster.'); }
  };
  const edit = (it) => { setForm({ name: it.name }); setEditId(it._id); setError(''); };
  const del = async (it) => {
    setError('');
    if (await confirm({ title: 'Delete cluster?', message: `“${it.name}” will be removed.` })) {
      try { await api.delete(`/fit/clusters/${it._id}`); load(); }
      catch (err) { setError(err.response?.data?.message || 'Could not delete the cluster.'); }
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="FIT Masters" title="Cluster Master" />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      {(canCreate || canEdit) && (
        <Card title={editId ? 'Edit cluster' : 'Add cluster'} className="mb-4">
          <div className="flex items-end gap-2">
            <div className="flex-1"><Field label="Cluster name"><Input value={form.name} onChange={(e) => setForm({ name: e.target.value })} /></Field></div>
            {(editId ? canEdit : canCreate) && <button onClick={submit} className="btn-primary">{editId ? 'Update' : 'Add'}</button>}
            {editId && <button onClick={() => { setEditId(null); setForm({ name: '' }); setError(''); }} className="btn-ghost">Cancel</button>}
          </div>
        </Card>
      )}
      <Table head={['Cluster name', 'Actions']}>
        {items.length === 0 && <EmptyRow span={2} />}
        {items.map((it) => (
          <tr key={it._id}>
            <td className="td font-medium text-ink">{it.name}</td>
            <td className="td"><RowActions onEdit={canEdit ? () => edit(it) : undefined} onDelete={canDelete ? () => del(it) : undefined} /></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
