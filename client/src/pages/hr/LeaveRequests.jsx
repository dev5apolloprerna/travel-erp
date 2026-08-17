import { useEffect, useState } from 'react';
import api from '../../api/client';
import { PageHeader, Card, Field, Input, Select, Table, EmptyRow, Badge, Modal } from '../../components/ui';

const statusStyle = (s) => ({
  APPROVED: 'PAID', PENDING: 'PARTIAL', REJECTED: 'UNPAID', CANCELLED: 'UNPAID',
}[s] || 'UNPAID');

const LEAVE_TYPES = ['CASUAL', 'SICK', 'EARNED', 'UNPAID'];

export default function LeaveRequests() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState({ status: '', employeeId: '' });
  const [decide, setDecide] = useState(null);   // { leave, status }
  const [remark, setRemark] = useState('');
  const [balModal, setBalModal] = useState(null);
  const [balForm, setBalForm] = useState({ CASUAL: 12, SICK: 6, EARNED: 15, UNPAID: 0 });

  const load = () => api.get('/hr/leaves', { params: filter }).then((r) => setLeaves(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter.status, filter.employeeId]);
  useEffect(() => { api.get('/hr/employees').then((r) => setEmployees(r.data)); }, []);

  const submitDecision = async () => {
    await api.put(`/hr/leaves/${decide.leave._id}/decision`, { status: decide.status, adminRemark: remark });
    setDecide(null); setRemark(''); load();
  };

  const saveBalance = async () => {
    await api.put('/hr/leave-balance', {
      employeeId: balModal._id,
      year: new Date().getFullYear(),
      balances: Object.fromEntries(Object.entries(balForm).map(([k, v]) => [k, Number(v)])),
    });
    setBalModal(null);
  };

  return (
    <div>
      <PageHeader eyebrow="HR" title="Leave Requests" />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Status">
            <Select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
              <option value="">All statuses</option>
              {['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Employee">
            <Select value={filter.employeeId} onChange={(e) => setFilter({ ...filter, employeeId: e.target.value })}>
              <option value="">All employees</option>
              {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
            </Select>
          </Field>
          <div className="flex items-end">
            <button
              onClick={() => { const emp = employees.find((e) => e._id === filter.employeeId); if (emp) setBalModal(emp); }}
              disabled={!filter.employeeId}
              className="btn-ghost">Set leave allocation</button>
          </div>
        </div>
      </Card>

      <Table head={['Employee', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Actions']}>
        {leaves.length === 0 && <EmptyRow span={8} text="No leave requests found." />}
        {leaves.map((l) => (
          <tr key={l._id}>
            <td className="td font-medium text-ink">{l.employeeId?.name || '—'}</td>
            <td className="td">{l.leaveType}</td>
            <td className="td">{new Date(l.fromDate).toLocaleDateString('en-IN')}</td>
            <td className="td">{new Date(l.toDate).toLocaleDateString('en-IN')}</td>
            <td className="td">{l.days}</td>
            <td className="td">{l.reason || '—'}</td>
            <td className="td"><Badge status={statusStyle(l.status)}>{l.status}</Badge></td>
            <td className="td">
              {l.status === 'PENDING' ? (
                <div className="flex gap-2">
                  <button onClick={() => { setDecide({ leave: l, status: 'APPROVED' }); setRemark(''); }} className="btn-accent btn-sm">Approve</button>
                  <button onClick={() => { setDecide({ leave: l, status: 'REJECTED' }); setRemark(''); }} className="btn-danger btn-sm">Reject</button>
                </div>
              ) : (
                <span className="text-xs text-ink-muted">{l.approvedBy?.name ? `by ${l.approvedBy.name}` : '—'}</span>
              )}
            </td>
          </tr>
        ))}
      </Table>

      {decide && (
        <Modal title={`${decide.status === 'APPROVED' ? 'Approve' : 'Reject'} leave request`} onClose={() => setDecide(null)}>
          <p className="mb-3 text-sm text-ink-muted">
            {decide.leave.employeeId?.name} — {decide.leave.leaveType}, {decide.leave.days} day(s)
          </p>
          <Field label="Remark (optional)"><Input value={remark} onChange={(e) => setRemark(e.target.value)} /></Field>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setDecide(null)} className="btn-ghost">Cancel</button>
            <button onClick={submitDecision} className={decide.status === 'APPROVED' ? 'btn-accent' : 'btn-danger'}>
              Confirm {decide.status === 'APPROVED' ? 'approval' : 'rejection'}
            </button>
          </div>
        </Modal>
      )}

      {balModal && (
        <Modal title={`Leave allocation — ${balModal.name}`} onClose={() => setBalModal(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            {LEAVE_TYPES.map((t) => (
              <Field key={t} label={`${t} days`}>
                <Input type="number" value={balForm[t]} onChange={(e) => setBalForm({ ...balForm, [t]: e.target.value })} />
              </Field>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setBalModal(null)} className="btn-ghost">Cancel</button>
            <button onClick={saveBalance} className="btn-primary">Save allocation</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
