import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Card, Field, Input, Table, EmptyRow, Badge, money } from '../../components/ui';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '');
const fmtNum = (n) => (Number(n) || 0).toLocaleString('en-IN');
const cell = (val, type) => {
  if (val === null || val === undefined || val === '') return type === 'money' ? money(0) : '';
  if (type === 'money') return money(val);
  if (type === 'number') return fmtNum(val);
  if (type === 'date') return fmtDate(val);
  return String(val);
};

// v60 generic report viewer. Renders any report the backend returns: date-range
// filter, table with per-column alignment/formatting, totals row, PDF export.
export default function ReportView() {
  const { id } = useParams();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const run = useCallback(() => {
    setLoading(true); setErr('');
    api.get(`/reports/${id}`, { params: { from: from || undefined, to: to || undefined } })
      .then((r) => setData(r.data))
      .catch((e) => setErr(e?.response?.data?.message || 'Failed to run this report.'))
      .finally(() => setLoading(false));
  }, [id, from, to]);

  useEffect(() => { run(); /* eslint-disable-next-line */ }, [id]);

  const downloadPdf = async () => {
    try {
      const res = await api.get(`/reports/${id}/pdf`, { params: { from: from || undefined, to: to || undefined }, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setErr('PDF export is not available for this report yet.');
    }
  };

  const planned = data?.status === 'planned';
  const cols = data?.columns || [];
  const rows = data?.rows || [];
  const totals = data?.totals || {};
  const hasTotals = Object.keys(totals).length > 0;
  const grouping = data?.grouping || null;   // { key, label } → customer-wise sections

  // Numeric column keys that get subtotalled per group.
  const sumKeys = cols.filter((c) => c.type === 'money' || c.type === 'number').map((c) => c.key);
  const subtotalOf = (groupRows) => {
    const t = {};
    for (const k of sumKeys) t[k] = groupRows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    return t;
  };
  // Build ordered groups preserving first-seen order.
  const groups = (() => {
    if (!grouping) return null;
    const map = new Map();
    for (const r of rows) {
      const k = r[grouping.key] ?? '—';
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    }
    return [...map.entries()].map(([label, groupRows]) => ({ label, rows: groupRows, subtotal: subtotalOf(groupRows) }));
  })();

  const dataCell = (r, c) => (c.type === 'status'
    ? <Badge status={r[c.key]}>{r[c.key]}</Badge>
    : cell(r[c.key], c.type));

  return (
    <div>
      <PageHeader
        eyebrow={[data?.type, data?.group].filter(Boolean).join(' · ') || 'Report'}
        title={data?.label || data?.title || 'Report'}
        back="/app/reports"
        actions={!planned && data?.status === 'ready'
          ? <button className="btn btn-primary" onClick={downloadPdf}>Download PDF</button>
          : null}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <button className="btn btn-primary" onClick={run} disabled={loading}>{loading ? 'Running…' : 'Run report'}</button>
          {(from || to) && <button className="btn btn-ghost" onClick={() => { setFrom(''); setTo(''); }}>Clear dates</button>}
          <span className="ml-auto text-xs text-ink-muted">Leave dates empty for all records.</span>
        </div>
      </Card>

      {err && <Card className="mb-4"><p className="text-sm text-red-600">{err}</p></Card>}

      {planned && (
        <Card>
          <div className="py-6 text-center">
            <div className="mb-2 text-3xl">🗂️</div>
            <h3 className="text-base font-semibold text-ink">Catalogued — coming soon</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">
              {data?.message || 'This report is part of the approved report set; its data source is not wired up yet.'}
            </p>
            <Link to="/app/reports" className="btn btn-ghost mt-4 inline-block">Back to all reports</Link>
          </div>
        </Card>
      )}

      {!planned && data?.status === 'ready' && (
        <>
          {data.subtitle && <p className="mb-3 text-sm text-ink-muted">{data.subtitle}</p>}
          <Table head={cols.map((c) => c.label)}>
            {rows.length === 0 && <EmptyRow span={cols.length} text="No data for this period." />}

            {/* Grouped (e.g. customer-wise) rendering */}
            {grouping && rows.length > 0 && groups.map((g) => (
              <GroupBlock key={g.label} label={`${grouping.label}: ${g.label}`} rows={g.rows} subtotal={g.subtotal}
                cols={cols} dataCell={dataCell} />
            ))}

            {/* Flat rendering */}
            {!grouping && rows.map((r, i) => (
              <tr key={i} className="hover:bg-faint">
                {cols.map((c) => (
                  <td key={c.key} className={`td ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>{dataCell(r, c)}</td>
                ))}
              </tr>
            ))}

            {hasTotals && rows.length > 0 && (
              <tr className="bg-brand-light font-semibold">
                {cols.map((c, i) => (
                  <td key={c.key} className={`td ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                    {i === 0 ? 'GRAND TOTAL' : (totals[c.key] !== undefined ? cell(totals[c.key], c.type === 'status' ? 'text' : c.type) : '')}
                  </td>
                ))}
              </tr>
            )}
          </Table>
          <p className="mt-3 text-xs text-ink-muted">
            {rows.length} row(s){grouping && groups ? ` · ${groups.length} ${grouping.label.toLowerCase()}(s)` : ''}.
          </p>
        </>
      )}
    </div>
  );
}

// Renders one customer-wise group: a header row, its data rows, and a subtotal row.
function GroupBlock({ label, rows, subtotal, cols, dataCell }) {
  return (
    <>
      <tr className="bg-faint">
        <td className="td font-semibold text-ink" colSpan={cols.length}>{label}</td>
      </tr>
      {rows.map((r, i) => (
        <tr key={i} className="hover:bg-faint">
          {cols.map((c) => (
            <td key={c.key} className={`td ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>{dataCell(r, c)}</td>
          ))}
        </tr>
      ))}
      <tr className="border-t border-line bg-white font-medium text-ink-soft">
        {cols.map((c, i) => (
          <td key={c.key} className={`td ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
            {i === 0 ? 'Subtotal' : (subtotal[c.key] !== undefined ? money(subtotal[c.key]) : '')}
          </td>
        ))}
      </tr>
    </>
  );
}
