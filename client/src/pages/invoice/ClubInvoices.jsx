import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Card, Table, EmptyRow, Badge } from '../../components/ui';

// v68 — Club Invoice (Super Admin). Combine multiple created-but-UNINVOICED, UNPAID
// orders of the SAME customer / B2B company into ONE invoice. Clubbing builds a
// consolidated package order from the selected orders; you then enter the amounts
// on the normal invoice-generation screen to produce a single combined invoice.
// Single-order invoice generation is unchanged.
export default function ClubInvoices() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [picked, setPicked] = useState({});   // id -> true
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = () => api.get('/invoices').then((r) => setRows(r.data)).catch(() => setErr('Could not load orders.'));
  useEffect(() => { load(); }, []);

  const pickedIds = useMemo(() => Object.keys(picked).filter((k) => picked[k]), [picked]);
  const pickedRows = rows.filter((r) => picked[r._id]);
  const selectedParty = pickedRows[0]?.partyKey || null;
  const selectedPartyName = pickedRows[0]?.party || '';

  const toggle = (r) => {
    if (!r.clubbable) return;
    setPicked((p) => ({ ...p, [r._id]: !p[r._id] }));
  };

  const club = async () => {
    setErr('');
    if (pickedIds.length < 2) { setErr('Select at least two orders to club.'); return; }
    setBusy(true);
    try {
      const res = await api.post('/invoices/club', { orderIds: pickedIds });
      setPicked({});
      // Go straight to the combined order's invoice-generation screen to enter amounts.
      nav(`/app/invoices/${res.data.order._id}/generate`);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Could not club the selected orders.');
      await load();
    } finally { setBusy(false); }
  };

  const statusBadge = (r) => {
    if (r.clubbed) return <Badge status="UNPAID">Clubbed</Badge>;
    return <Badge status={r.status}>{r.status}</Badge>;
  };

  return (
    <div>
      <PageHeader eyebrow="Super Admin · Accounting" title="Club Invoices"
        actions={<button className="btn btn-primary disabled:opacity-50" disabled={pickedIds.length < 2 || busy} onClick={club}>{busy ? 'Clubbing…' : `Club selected (${pickedIds.length})`}</button>} />

      <p className="mb-4 text-sm text-ink-muted">
        Select two or more <span className="font-medium text-ink-soft">unpaid orders that haven't been invoiced yet</span>, all for the
        <span className="font-medium text-ink-soft"> same customer or B2B company</span>, and club them into one invoice. Clubbing
        combines their services into a single order — you then enter the amounts on the invoice screen to generate one combined invoice.
        Orders that already have an invoice, or that are paid/partly‑paid or cancelled, can't be clubbed. Generating a single invoice per order still works as before.
      </p>

      {err && <Card className="mb-4"><p className="text-sm text-red-600">{err}</p></Card>}

      {pickedIds.length > 0 && (
        <Card className="mb-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold text-ink">{pickedIds.length} order(s) selected</span>
            {selectedPartyName && <span className="text-ink-muted">Customer: <span className="font-medium text-ink">{selectedPartyName}</span></span>}
            <span className="text-ink-muted">Amounts are entered on the next screen when you generate the invoice.</span>
            <button className="btn btn-ghost ml-auto" onClick={() => setPicked({})}>Clear</button>
          </div>
        </Card>
      )}

      <Table head={['', 'Order No', 'Date', 'Customer / Company', 'Services', 'Status']}>
        {rows.length === 0 && <EmptyRow span={6} text="No uninvoiced orders to club." />}
        {rows.map((r) => {
          const disabled = !r.clubbable || (selectedParty && r.partyKey !== selectedParty && !picked[r._id]);
          return (
            <tr key={r._id} className={`hover:bg-faint ${r.clubbed ? 'opacity-60' : ''}`}>
              <td className="td">
                <input type="checkbox" className="h-4 w-4 accent-brand disabled:opacity-30"
                  checked={!!picked[r._id]} disabled={disabled} onChange={() => toggle(r)}
                  title={r.clubbable ? (disabled ? 'Different customer than current selection' : 'Select for clubbing') : `Not clubbable: ${r.reason}`} />
              </td>
              <td className="td font-mono">{r.orderNo || '—'}</td>
              <td className="td whitespace-nowrap">{r.date ? new Date(r.date).toLocaleDateString('en-IN') : '—'}</td>
              <td className="td">{r.party}</td>
              <td className="td">{r.services}</td>
              <td className="td">{statusBadge(r)}</td>
            </tr>
          );
        })}
      </Table>
      <p className="mt-3 text-xs text-ink-muted">Only unpaid, not‑yet‑invoiced orders appear here. Selecting orders is limited to a single customer/company; clubbed orders stay listed (greyed) and are billed through their combined invoice.</p>
    </div>
  );
}
