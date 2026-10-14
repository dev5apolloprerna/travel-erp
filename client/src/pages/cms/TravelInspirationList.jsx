import { useEffect, useState } from 'react';
import api from '../../api/client';
import { PageHeader, Card, Field, Input, Table, EmptyRow } from '../../components/ui';
import { exportToCsv } from '../../utils/exportCsv';

export default function TravelInspirationList() {
  const [rows, setRows] = useState([]);
  const [email, setEmail] = useState('');

  const load = () => api.get('/cms/travel-inspirations', { params: email ? { email } : {} })
    .then((r) => setRows(r.data)).catch(() => setRows([]));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const doExport = () => exportToCsv('travel-inspiration', rows.map((r) => ({
    Email: r.email, 'Subscribed On': new Date(r.createdAt).toLocaleString('en-IN'),
  })));

  return (
    <div>
      <PageHeader eyebrow="Website" title="Travel Inspiration"
        actions={<button onClick={doExport} className="btn-ghost">Export to Excel</button>} />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[240px] flex-1"><Field label="Search by email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} placeholder="name@example.com" />
          </Field></div>
          <button onClick={load} className="btn-primary">Search</button>
          <button onClick={() => { setEmail(''); setTimeout(load, 0); }} className="btn-ghost">Clear</button>
        </div>
      </Card>

      <Table head={['Email', 'Subscribed On']}>
        {rows.length === 0 && <EmptyRow span={2} text="No subscriptions found." />}
        {rows.map((r) => (
          <tr key={r._id}>
            <td className="td font-medium text-ink">{r.email}</td>
            <td className="td">{new Date(r.createdAt).toLocaleString('en-IN')}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
