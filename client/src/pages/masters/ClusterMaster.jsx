import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Card, Field, Input, Table, EmptyRow, RowActions } from '../../components/ui';

export default function ClusterMaster() {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '' });
  const [editId, setEditId] = useState(null);

  const load = () => api.get('/fit/clusters').then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.name.trim()) return;
    if (editId) await api.put(`/fit/clusters/${editId}`, form);
    else await api.post('/fit/clusters', form);
    setForm({ name: '' }); setEditId(null); load();
  };
  const edit = (it) => { setForm({ name: it.name }); setEditId(it._id); };
  const del = async (it) => {
    if (await confirm({ title: 'Delete cluster?', message: `“${it.name}” will be removed.` }))
      { await api.delete(`/fit/clusters/${it._id}`); load(); }
  };

  return (
    <div className="w-full max-w-5xl">
      <PageHeader eyebrow="FIT Masters" title="Cluster Master" />
      <Card title={editId ? 'Edit cluster' : 'Add cluster'} className="mb-4">
        <div className="flex items-end gap-2">
          <div className="flex-1"><Field label="Cluster name"><Input value={form.name} onChange={(e) => setForm({ name: e.target.value })} /></Field></div>
          <button onClick={submit} className="btn-primary">{editId ? 'Update' : 'Add'}</button>
          {editId && <button onClick={() => { setEditId(null); setForm({ name: '' }); }} className="btn-ghost">Cancel</button>}
        </div>
      </Card>
      <Table head={['Cluster name', 'Actions']}>
        {items.length === 0 && <EmptyRow span={2} />}
        {items.map((it) => (
          <tr key={it._id}>
            <td className="td font-medium text-ink">{it.name}</td>
            <td className="td"><RowActions onEdit={() => edit(it)} onDelete={() => del(it)} /></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
