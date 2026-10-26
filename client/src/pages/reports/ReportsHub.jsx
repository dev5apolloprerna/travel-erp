import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Card, Field, Input, StatCard } from '../../components/ui';

// v60 Reports hub — the full categorized catalog (Pre Design + User Design),
// Super-Admin only. Ready reports (live data) open the runner; planned reports
// are navigable so the complete hierarchy stays intact. Supports multi-select
// + bulk PDF export over a shared date range.
export default function ReportsHub() {
  const [catalog, setCatalog] = useState([]);
  const [stats, setStats] = useState({ total: 0, ready: 0, planned: 0 });
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [picked, setPicked] = useState({});   // id -> true
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/reports')
      .then((r) => { setCatalog(r.data.catalog || []); setStats(r.data.stats || {}); })
      .catch(() => setErr('Could not load the report catalog.'));
  }, []);

  const needle = q.trim().toLowerCase();
  const match = (label, group, sub) =>
    !needle || [label, group, sub].filter(Boolean).some((s) => s.toLowerCase().includes(needle));

  const pickedIds = useMemo(() => Object.keys(picked).filter((k) => picked[k]), [picked]);
  const toggle = (id) => setPicked((p) => ({ ...p, [id]: !p[id] }));

  const bulkExport = async () => {
    if (!pickedIds.length) return;
    setBusy(true); setErr('');
    try {
      const res = await api.post('/reports/bulk-pdf', { ids: pickedIds, from, to }, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setErr(e?.response?.data?.message || 'None of the selected reports have live data yet, or the export failed.');
    } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader eyebrow="Super Admin" title="Reports — bulk export"
        actions={<span className="text-xs text-ink-muted">Super-Admin access · per-user rights coming later</span>} />
      <p className="-mt-3 mb-4 text-sm text-ink-muted">
        Browse and open individual reports from the <span className="font-medium text-ink-soft">Reports</span> menu in the sidebar.
        Use this page to select several live reports and export them together over a date range.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard value={stats.total} label="Catalogued reports" />
        <StatCard value={stats.ready} label="Live (with data)" />
        <StatCard value={stats.planned} label="Planned" />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Field label="Search reports"><Input placeholder="e.g. sales, outstanding, GSTR…" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
          </div>
          <Field label="From (for bulk export)"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To (for bulk export)"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button className="btn btn-primary disabled:opacity-50" disabled={!pickedIds.length || busy} onClick={bulkExport}>
            {busy ? 'Building…' : `Export selected (${pickedIds.length}) as PDF`}
          </button>
          {pickedIds.length > 0 && <button className="btn" onClick={() => setPicked({})}>Clear selection</button>}
          <span className="text-xs text-ink-muted">Tick live reports, set a date range, then export them together.</span>
        </div>
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      </Card>

      {catalog.map((t) => (
        <div key={t.type} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">{t.typeLabel}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {t.groups.map((g) => {
              const items = g.children.flatMap((c) => c.reports.filter((r) => match(r.label, g.group, c.sub)).map((r) => ({ ...r, sub: c.sub })));
              if (!items.length) return null;
              return (
                <Card key={g.group} title={g.group}>
                  <ul className="divide-y divide-line">
                    {items.map((r) => (
                      <li key={r.id} className="flex items-center gap-2 py-1.5">
                        <input type="checkbox" className="h-4 w-4 shrink-0 accent-brand disabled:opacity-40"
                          checked={!!picked[r.id]} disabled={r.status !== 'ready'} onChange={() => toggle(r.id)}
                          title={r.status === 'ready' ? 'Select for bulk export' : 'No live data yet'} />
                        <Link to={`/app/reports/${r.id}`} className="flex flex-1 items-center justify-between gap-2 hover:text-brand">
                          <span className="text-sm">
                            {r.sub && <span className="text-ink-muted">{r.sub} · </span>}{r.label}
                          </span>
                          {r.status === 'ready'
                            ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">LIVE</span>
                            : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">PLANNED</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
