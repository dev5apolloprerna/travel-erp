import { useEffect, useState } from 'react';
import api from '../../api/client';
import { PageHeader, Card, Field, Select, Table, EmptyRow, Badge } from '../../components/ui';

const MODULES = ['', 'Auth', 'Order', 'Customer', 'Invoice', 'Payment', 'Company', 'Employee', 'CompanyOwner',
  'Service', 'MainCompany', 'SupplierInvoice', 'Holiday', 'Leave', 'SalarySlip',
  'DestinationCategory', 'Destination', 'TourPackage', 'FAQ', 'Testimonial',
  'Banner', 'VideoGallery', 'OurTeam', 'Cluster', 'Division', 'Grade', 'Department',
  'Passenger', 'SocietyMember', 'Master', 'WebsiteAuth', 'OtherPage', 'WebsiteBooking'];
const actionStyle = (a) => ({
  CREATE: 'PAID', UPDATE: 'PARTIAL', INVOICE_GENERATE: 'PAID', HOLD: 'PARTIAL', RELEASE: 'PARTIAL',
  APPROVE: 'PAID', PAYMENT: 'PAID', LOGIN: 'PARTIAL', LOGOUT: 'PARTIAL',
  REGISTER: 'PAID', PASSWORD_RESET: 'PARTIAL', FORGOT_PASSWORD: 'PARTIAL',
  DELETE: 'UNPAID', CANCEL: 'UNPAID', REJECT: 'UNPAID', INVOICE_CANCEL: 'UNPAID',
}[a] || 'PARTIAL');

/** Activity log viewer (req #1). Shows who did what, to which record, and when. */
export default function ActivityLogs() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState({ module: '' });

  const load = () => api.get('/activity-logs', { params: filter.module ? { module: filter.module } : {} })
    .then((r) => setRows(r.data)).catch(() => setRows([]));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter.module]);

  return (
    <div>
      <PageHeader eyebrow="Administration" title="Activity Logs" />
      <Card className="mb-4">
        <div className="max-w-xs">
          <Field label="Module">
            <Select value={filter.module} onChange={(e) => setFilter({ module: e.target.value })}>
              {MODULES.map((m) => <option key={m} value={m}>{m || 'All modules'}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <div className="-mx-1 overflow-x-auto"><div className="min-w-[860px] px-1">
        <Table head={['When', 'User', 'Role', 'Action', 'Module', 'Record', 'Details']}>
          {rows.length === 0 && <EmptyRow span={7} text="No activity recorded yet." />}
          {rows.map((r) => (
            <tr key={r._id} className="hover:bg-faint">
              <td className="td whitespace-nowrap">{new Date(r.createdAt).toLocaleString('en-IN')}</td>
              <td className="td">{r.userName || '—'}</td>
              <td className="td">{r.userRole || '—'}</td>
              <td className="td"><Badge status={actionStyle(r.action)}>{r.action}</Badge></td>
              <td className="td">{r.module || '—'}</td>
              <td className="td font-mono">{r.recordLabel || '—'}</td>
              <td className="td">
                {r.message || '—'}
                {r.changes && (
                  <div className="mt-1 text-xs text-ink-muted">
                    {Object.entries(r.changes).map(([k, v]) => (
                      <div key={k}>{k}: <span className="line-through">{String(v.from ?? '')}</span> → {String(v.to ?? '')}</div>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </div></div>
      <p className="mt-3 text-xs text-ink-muted">Records create, update, delete, cancel, hold/release and invoice actions. Passwords and tokens are never logged.</p>
    </div>
  );
}
