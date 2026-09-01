import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Table, EmptyRow, RowActions, Chip } from '../../components/ui';

// Generic master LIST page. Route: /owner/:key
export default function MasterList() {
  const { key } = useParams();
  const nav = useNavigate();
  const confirm = useConfirm();
  const [def, setDef] = useState(null);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadDef = () => api.get(`/owner/masters/${key}/def`).then((r) => setDef(r.data));
  const loadRows = () => {
    setLoading(true);
    return api.get(`/owner/masters/${key}`, { params: search ? { search } : {} })
      .then((r) => setRows(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { setDef(null); loadDef(); /* eslint-disable-next-line */ }, [key]);
  useEffect(() => { const t = setTimeout(loadRows, 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [key, search]);

  const del = async (row) => {
    if (await confirm({ title: `Delete ${def.label}?`, message: 'This record will be removed.' })) {
      await api.delete(`/owner/masters/${key}/${row._id}`); loadRows();
    }
  };

  // Human label for a column key, from the field defs.
  const labelFor = (col) => def?.fields.find((f) => f.key === col)?.label || col;
  // Cell display: booleans as Yes/No chips, else text.
  const cell = (row, col) => {
    const f = def?.fields.find((x) => x.key === col);
    const v = row[col];
    if (f?.type === 'boolean') return <Chip yes={!!v} />;
    if (v === undefined || v === null || v === '') return <span className="text-ink-muted">—</span>;
    return String(v);
  };

  if (!def) return <div className="text-ink-muted">Loading…</div>;

  const cols = def.listColumns?.length ? def.listColumns : def.fields.slice(0, 4).map((f) => f.key);

  return (
    <div>
      <div className="eyebrow mb-1.5">Master · {def.menu}</div>
      <PageHeader title={def.label}
        actions={<Link to={`/owner/${key}/create`} className="btn-primary">+ Add {def.label}</Link>} />

      {/* Search bar */}
      <div className="mb-[18px] rounded-xl2 border border-line bg-white p-1 shadow-card">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${def.label}…`}
          className="w-full rounded-lg bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted" />
      </div>

      <Table head={['ID', ...cols.map(labelFor), 'Actions']}>
        {loading && <EmptyRow span={cols.length + 2} text="Loading…" />}
        {!loading && rows.length === 0 && <EmptyRow span={cols.length + 2} text={`No ${def.label} records yet.`} />}
        {!loading && rows.map((row) => (
          <tr key={row._id} className="hover:bg-faint">
            <td className="td font-mono text-[12.5px] text-ink-muted">{String(row._id).slice(-6)}</td>
            {cols.map((c) => <td key={c} className="td">{cell(row, c)}</td>)}
            <td className="td whitespace-nowrap"><RowActions onEdit={() => nav(`/owner/${key}/${row._id}/edit`)} onDelete={() => del(row)} /></td>
          </tr>
        ))}
      </Table>
      <p className="mt-3 text-[12.5px] text-ink-muted">The ID is generated automatically by the database and isn't entered on the form.</p>
    </div>
  );
}
