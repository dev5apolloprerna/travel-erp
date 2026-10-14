import { useEffect, useState } from 'react';
import api from '../../api/client';
import { PageHeader, Card, Field, Input, Select, Table, EmptyRow, Modal } from '../../components/ui';
import { exportToCsv } from '../../utils/exportCsv';

const FIELDS = [
  ['name', 'Name'], ['phone', 'Phone'], ['email', 'Email'], ['like_to_tavel', 'Like to Travel'],
  ['PreferredDestination', 'Preferred Destination'], ['number_of_days', 'No. of Days'],
  ['Travellerscount', 'Travellers'], ['Preferred_Travel_Date', 'Preferred Date'], ['Trip_Type', 'Trip Type'],
  ['Hotel_Preference', 'Hotel Preference'], ['budget_of_planing', 'Budget'], ['Budget_Type', 'Budget Type'],
  ['Special_Requirements', 'Special Requirements'],
];

export default function CustomizeTripList() {
  const [rows, setRows] = useState([]);
  const [packages, setPackages] = useState([]);
  const [filter, setFilter] = useState({ package_id: '', from: '', to: '' });
  const [detail, setDetail] = useState(null);

  const load = () => {
    const params = {};
    if (filter.package_id) params.package_id = filter.package_id;
    if (filter.from) params.from = filter.from;
    if (filter.to) params.to = filter.to;
    api.get('/cms/customize-trips', { params }).then((r) => setRows(r.data)).catch(() => setRows([]));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { api.get('/cms/packages').then((r) => setPackages(r.data)).catch(() => {}); }, []);

  const doExport = () => exportToCsv('customize-trip', rows.map((r) => ({
    Name: r.name, Phone: r.phone, Email: r.email, Destination: r.PreferredDestination,
    Days: r.number_of_days, Travellers: r.Travellerscount, 'Trip Type': r.Trip_Type,
    Package: r.package_id?.name || '', 'Created On': new Date(r.create_at).toLocaleString('en-IN'),
  })));

  return (
    <div>
      <PageHeader eyebrow="Website" title="Customize Trip Requests"
        actions={<button onClick={doExport} className="btn-ghost">Export to Excel</button>} />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Package">
            <Select value={filter.package_id} onChange={(e) => setFilter({ ...filter, package_id: e.target.value })}>
              <option value="">All packages</option>
              {packages.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="From date"><Input type="date" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} /></Field>
          <Field label="To date"><Input type="date" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} /></Field>
          <div className="flex items-end gap-2">
            <button onClick={load} className="btn-primary">Apply</button>
            <button onClick={() => { setFilter({ package_id: '', from: '', to: '' }); setTimeout(load, 0); }} className="btn-ghost">Clear</button>
          </div>
        </div>
      </Card>

      <Table head={['Name', 'Email', 'Destination', 'Trip Type', 'Package', 'Created', 'Action']}>
        {rows.length === 0 && <EmptyRow span={7} text="No requests found." />}
        {rows.map((r) => (
          <tr key={r._id}>
            <td className="td font-medium text-ink">{r.name || '—'}</td>
            <td className="td">{r.email || '—'}</td>
            <td className="td">{r.PreferredDestination || '—'}</td>
            <td className="td">{r.Trip_Type || '—'}</td>
            <td className="td">{r.package_id?.name || '—'}</td>
            <td className="td">{new Date(r.create_at).toLocaleDateString('en-IN')}</td>
            <td className="td">
              <button onClick={() => setDetail(r)} title="View details" className="btn-ghost btn-sm" aria-label="View details">👁</button>
            </td>
          </tr>
        ))}
      </Table>

      {detail && (
        <Modal title="Customize trip request" onClose={() => setDetail(null)} maxWidth="max-w-2xl">
          <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {FIELDS.map(([k, label]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-subtle py-1">
                <span className="text-ink-muted">{label}</span>
                <span className="text-right font-medium text-ink">{detail[k] || '—'}</span>
              </div>
            ))}
            <div className="flex justify-between gap-3 border-b border-subtle py-1">
              <span className="text-ink-muted">Package</span>
              <span className="text-right font-medium text-ink">{detail.package_id?.name || '—'}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-subtle py-1">
              <span className="text-ink-muted">Created</span>
              <span className="text-right font-medium text-ink">{new Date(detail.create_at).toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div className="mt-4 flex justify-end"><button onClick={() => setDetail(null)} className="btn-ghost">Close</button></div>
        </Modal>
      )}
    </div>
  );
}
