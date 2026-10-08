import { useEffect, useState } from 'react';
import api from '../../api/client';
import { PageHeader, Table, EmptyRow, money } from '../../components/ui';

/** req #8: Credit Notes raised when a Super Admin cancels an invoice. Each is linked to the
 *  original (cancelled) invoice/order, which is kept for audit/reporting. */
export default function CreditNotes() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get('/invoices/credit-notes').then((r) => setRows(r.data)).catch(() => setRows([])); }, []);

  return (
    <div>
      <PageHeader eyebrow="Accounting" title="Credit Notes" />
      <div className="-mx-1 overflow-x-auto"><div className="min-w-[680px] px-1">
        <Table head={['Credit Note', 'Against Invoice', 'Order', 'Amount', 'Reason', 'Date']}>
          {rows.length === 0 && <EmptyRow span={6} text="No credit notes yet. One is raised when a Super Admin cancels an invoice." />}
          {rows.map((r) => (
            <tr key={r._id} className="hover:bg-faint">
              <td className="td font-mono font-medium text-ink">{r.creditNoteNo}</td>
              <td className="td font-mono">{r.invoiceNo || '—'}</td>
              <td className="td">{r.orderId?.orderNo || '—'}</td>
              <td className="td font-medium">{money(r.amount)}</td>
              <td className="td">{r.reason || '—'}</td>
              <td className="td">{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
            </tr>
          ))}
        </Table>
      </div></div>
    </div>
  );
}
