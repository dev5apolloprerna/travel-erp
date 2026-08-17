import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Card, Field, Input, Select, Textarea, Table, EmptyRow, StatCard, Badge } from '../../components/ui';

const LEAVE_TYPES = ['CASUAL', 'SICK', 'EARNED', 'UNPAID'];
const blank = { leaveType: 'CASUAL', fromDate: '', toDate: '', reason: '' };

const statusStyle = (s) => ({
  APPROVED: 'PAID', PENDING: 'PARTIAL', REJECTED: 'UNPAID', CANCELLED: 'UNPAID',
}[s] || 'UNPAID');

export default function MyLeave() {
  const confirm = useConfirm();
  const [balance, setBalance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [form, setForm] = useState(blank);
  const [msg, setMsg] = useState(null);

  const load = () => {
    api.get('/hr/leave-balance').then((r) => setBalance(r.data.summary || []));
    api.get('/hr/leaves').then((r) => setLeaves(r.data));
  };
  useEffect(() => { load(); }, []);

  const apply = async () => {
    setMsg(null);
    if (!form.fromDate || !form.toDate) return setMsg({ type: 'error', text: 'Please pick both dates.' });
    try {
      await api.post('/hr/leaves', form);
      setForm(blank);
      setMsg({ type: 'ok', text: 'Leave request submitted for approval.' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Could not submit request.' });
    }
  };

  const cancel = async (l) => {
    if (await confirm({ title: 'Cancel request?', message: 'This leave request will be cancelled.', confirmLabel: 'Cancel request' }))
      { await api.put(`/hr/leaves/${l._id}/cancel`); load(); }
  };

  return (
    <div>
      <PageHeader eyebrow="HR" title="My Leave" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {balance.map((b) => (
          <StatCard key={b.type} value={`${b.remaining} / ${b.allocated}`} label={`${b.type} remaining`} />
        ))}
      </div>

      <Card title="Apply for leave" className="mb-5">
        {msg && (
          <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${msg.type === 'ok' ? 'bg-accent-light text-accent-dark' : 'bg-red-50 text-red-600'}`}>
            {msg.text}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Leave type">
            <Select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })}>
              {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="From date"><Input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} /></Field>
          <Field label="To date"><Input type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} /></Field>
          <Field label="Reason"><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
        </div>
        <div className="mt-3"><button onClick={apply} className="btn-primary">Submit request</button></div>
      </Card>

      <Table head={['Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Remark', 'Actions']}>
        {leaves.length === 0 && <EmptyRow span={8} text="No leave requests yet." />}
        {leaves.map((l) => (
          <tr key={l._id}>
            <td className="td font-medium text-ink">{l.leaveType}</td>
            <td className="td">{new Date(l.fromDate).toLocaleDateString('en-IN')}</td>
            <td className="td">{new Date(l.toDate).toLocaleDateString('en-IN')}</td>
            <td className="td">{l.days}</td>
            <td className="td">{l.reason || '—'}</td>
            <td className="td"><Badge status={statusStyle(l.status)}>{l.status}</Badge></td>
            <td className="td">{l.adminRemark || '—'}</td>
            <td className="td">
              {l.status === 'PENDING' && <button onClick={() => cancel(l)} className="btn-danger btn-sm">Cancel</button>}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
