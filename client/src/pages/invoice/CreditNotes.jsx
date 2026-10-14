import { useEffect, useState } from 'react';
import api from '../../api/client';
import { PageHeader, Table, EmptyRow, Badge, money } from '../../components/ui';

/** Credit Notes raised when a Super Admin cancels an invoice. Each is linked to the original
 *  (cancelled) invoice/order, which is kept for audit/reporting.
 *  Navigation: Administration → Credit Notes (/app/invoices/credit-notes). */
export default function CreditNotes() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/invoices/credit-notes').then((r) => setRows(r.data)).catch(() => setRows([])); }, []);

  const download = async (r) => {
    setError('');
    try {
      const res = await api.get(`/invoices/credit-notes/${r._id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${r.creditNoteNo || 'credit-note'}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { setError('Could not download the credit note.'); }
  };

  return (
    <div>
      <PageHeader eyebrow="Accounting" title="Credit Notes" />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      <div className="-mx-1 overflow-x-auto"><div className="min-w-[820px] px-1">
        <Table head={['Credit Note', 'Against Invoice', 'Customer / Company', 'Order', 'Amount', 'Status', 'Date', 'Actions']}>
          {rows.length === 0 && <EmptyRow span={8} text="No credit notes yet. One is raised when a Super Admin cancels an invoice." />}
          {rows.map((r) => (
            <tr key={r._id} className="hover:bg-faint">
              <td className="td font-mono font-medium text-ink">{r.creditNoteNo}</td>
              <td className="td font-mono">{r.invoiceNo || '—'}</td>
              <td className="td">{r.party || '—'}</td>
              <td className="td">{r.orderId?.orderNo || '—'}</td>
              <td className="td font-medium">{money(r.amount)}</td>
              <td className="td"><Badge status="PAID">Issued</Badge></td>
              <td className="td">{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
              <td className="td"><button onClick={() => download(r)} className="btn-ghost btn-sm">Download</button></td>
            </tr>
          ))}
        </Table>
      </div></div>
      <p className="mt-3 text-xs text-ink-muted">A credit note is generated automatically when a Super Admin cancels an invoice, and is linked to the original invoice/order.</p>
    </div>
  );
}
