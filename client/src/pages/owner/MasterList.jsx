import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { RowActions, Chip } from '../../components/ui';

const PAGE_SIZE = 25;

// Generic master LIST page. Route: /owner/:key
export default function MasterList() {
  const { key } = useParams();
  const nav = useNavigate();
  const confirm = useConfirm();
  const fileRef = useRef(null);

  const [def, setDef] = useState(null);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1, startIndex: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState([]);   // ids checked for bulk delete (#6)

  const loadDef = () => api.get(`/owner/masters/${key}/def`).then((r) => setDef(r.data));
  const loadRows = () => {
    setLoading(true);
    return api.get(`/owner/masters/${key}`, { params: { search: search || undefined, page, limit: PAGE_SIZE } })
      .then((r) => { setRows(r.data.rows); setMeta(r.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { setDef(null); setPage(1); setSearch(''); setNotice(null); setSelected([]); loadDef(); /* eslint-disable-next-line */ }, [key]);
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { setSelected([]); }, [key, search, page]);
  useEffect(() => { const t = setTimeout(loadRows, 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [key, search, page]);

  const del = async (row) => {
    if (await confirm({ title: `Delete ${def.label}?`, message: 'This record will be removed.' })) {
      await api.delete(`/owner/masters/${key}/${row._id}`); loadRows();
    }
  };

  // Bulk delete (#6)
  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allChecked = rows.length > 0 && rows.every((r) => selected.includes(r._id));
  const toggleAll = () => setSelected(allChecked ? [] : rows.map((r) => r._id));
  const bulkDelete = async () => {
    if (!selected.length) return;
    if (await confirm({ title: `Delete ${selected.length} record(s)?`, message: 'The selected records will be permanently removed.' })) {
      const res = await api.post(`/owner/masters/${key}/bulk-delete`, { ids: selected });
      setSelected([]);
      setNotice({ type: 'ok', text: `Deleted ${res.data.deleted} record(s).` });
      loadRows();
    }
  };

  const downloadSample = async () => {
    const res = await api.get(`/owner/masters/${key}/sample`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url; a.download = `${key}-sample.xlsx`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setNotice(null);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await api.post(`/owner/masters/${key}/import`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const { inserted, failed, errors } = res.data;
      setNotice({ type: failed ? 'warn' : 'ok',
        text: `Imported ${inserted} record(s)${failed ? `, ${failed} failed` : ''}.${errors?.length ? ' ' + errors[0] : ''}` });
      loadRows();
    } catch (err) {
      setNotice({ type: 'err', text: err.response?.data?.message || 'Import failed.' });
    } finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const labelFor = (col) => def?.fields.find((f) => f.key === col)?.label || col;
  const cell = (row, col) => {
    const f = def?.fields.find((x) => x.key === col);
    if (f?.type === 'boolean') return <Chip yes={!!row[col]} />;
    // FK columns show the resolved name (#2), not the id.
    if (f?.type === 'ref') { const d = row.__display?.[col]; return d || <span className="text-ink-muted">—</span>; }
    const v = row[col];
    if (v === undefined || v === null || v === '') return <span className="text-ink-muted">—</span>;
    return String(v);
  };

  if (!def) return <div className="text-ink-muted">Loading…</div>;

  const cols = def.listColumns?.length ? def.listColumns : def.fields.slice(0, 4).map((f) => f.key);
  const noticeColor = notice?.type === 'err' ? 'bg-red-50 text-red-600'
    : notice?.type === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-ok-light text-ok';

  return (
    <div>
      <div className="eyebrow mb-1.5">Master · {def.menu}</div>
      {/* Title left, Back button right-aligned on the same line (#8) */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-[27px] font-extrabold leading-tight text-ink">{def.label}</h1>
        <button onClick={() => nav('/owner')} className="btn-ghost btn-sm shrink-0">← Back</button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button onClick={downloadSample} className="btn-ghost btn-sm">Sample Excel</button>
        <button onClick={() => fileRef.current?.click()} disabled={importing} className="btn-ghost btn-sm">
          {importing ? 'Importing…' : 'Import Excel'}
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onImportFile} />
        {selected.length > 0 && (
          <button onClick={bulkDelete} className="btn-danger btn-sm">Delete selected ({selected.length})</button>
        )}
        <Link to={`/owner/${key}/create`} className="btn-primary btn-sm ml-auto">+ Add {def.label}</Link>
      </div>

      {notice && <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${noticeColor}`}>{notice.text}</div>}

      {/* Search bar */}
      <div className="mb-[18px] rounded-xl2 border border-line bg-white p-1 shadow-card">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${def.label}…`}
          className="w-full rounded-lg bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted" />
      </div>

      {/* Responsive table wrapper (#13) */}
      <div className="-mx-1 overflow-x-auto">
        <div className="min-w-[640px] px-1">
          <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-xl2 border border-line bg-white shadow-card">
            <thead>
              <tr>
                <th className="th w-10">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" />
                </th>
                <th className="th">Sr. No.</th>
                {cols.map((c) => <th key={c} className="th">{labelFor(c)}</th>)}
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td className="td text-ink-muted" colSpan={cols.length + 3}>Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td className="td text-ink-muted" colSpan={cols.length + 3}>No {def.label} records yet.</td></tr>}
              {!loading && rows.map((row, i) => (
                <tr key={row._id} className="hover:bg-faint">
                  <td className="td">
                    <input type="checkbox" checked={selected.includes(row._id)} onChange={() => toggleOne(row._id)} aria-label="Select row" />
                  </td>
                  <td className="td font-mono text-[12.5px] text-ink-muted">{meta.startIndex + i + 1}</td>
                  {cols.map((c) => <td key={c} className="td">{cell(row, c)}</td>)}
                  <td className="td whitespace-nowrap"><RowActions onEdit={() => nav(`/owner/${key}/${row._id}/edit`)} onDelete={() => del(row)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination (#9) */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-ink-muted">
          {meta.total === 0 ? 'No records' : `Showing ${meta.startIndex + 1}–${Math.min(meta.startIndex + rows.length, meta.total)} of ${meta.total}`}
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={meta.page <= 1}
            className="btn-ghost btn-sm disabled:opacity-40">Previous</button>
          <span className="text-sm text-ink-soft">Page {meta.page} of {meta.pages}</span>
          <button onClick={() => setPage((p) => Math.min(meta.pages, p + 1))} disabled={meta.page >= meta.pages}
            className="btn-ghost btn-sm disabled:opacity-40">Next</button>
        </div>
      </div>
      <p className="mt-3 text-[12.5px] text-ink-muted">The database ID stays internal; the list shows a running serial number.</p>
    </div>
  );
}
