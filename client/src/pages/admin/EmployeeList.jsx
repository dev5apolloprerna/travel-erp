import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Table, EmptyRow, RowActions, Badge, Modal, Field, Input } from '../../components/ui';
import PasswordInput from '../../components/ui/PasswordInput';

export default function EmployeeList() {
  const confirm = useConfirm();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [pwUser, setPwUser] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [msg, setMsg] = useState(null);

  const load = () => api.get('/auth/employees').then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const del = async (it) => {
    if (await confirm({ title: 'Delete team member?', message: `${it.name} will lose access permanently.` }))
      { await api.delete(`/auth/employees/${it._id}`); load(); }
  };

  const toggleActive = async (it) => {
    const turningOff = it.isActive !== false;
    const ok = await confirm({
      title: turningOff ? 'Deactivate member?' : 'Activate member?',
      message: turningOff
        ? `${it.name} will not be able to log in until reactivated.`
        : `${it.name} will be able to log in again.`,
      confirmLabel: turningOff ? 'Deactivate' : 'Activate',
      danger: turningOff,
    });
    if (!ok) return;
    await api.put(`/auth/employees/${it._id}/active`, { isActive: !turningOff });
    load();
  };

  const resetPassword = async () => {
    setMsg(null);
    try {
      const res = await api.put(`/auth/employees/${pwUser._id}/password`, { newPassword: newPw });
      setMsg({ type: 'ok', text: res.data.message });
      setPwUser(null); setNewPw('');
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Could not reset password.' });
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Administration" title="Team / Employees"
        actions={<button onClick={() => nav('/app/admin/employees/new')} className="btn-primary">Create employee</button>} />

      {msg && (
        <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${msg.type === 'ok' ? 'bg-accent-light text-accent-dark' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </div>
      )}

      <Table head={['Name', 'Email', 'Type', 'Modules', 'Services', 'Status', 'Actions']}>
        {items.length === 0 && <EmptyRow span={7} text="No team members yet." />}
        {items.map((e) => (
          <tr key={e._id}>
            <td className="td font-medium text-ink">{e.name}</td>
            <td className="td">{e.email}</td>
            <td className="td">{e.employeeType || '—'}</td>
            <td className="td">{(e.modules || []).join(', ') || '—'}</td>
            <td className="td">{(e.services || []).length} assigned</td>
            <td className="td">
              <Badge status={e.isActive === false ? 'UNPAID' : 'PAID'}>
                {e.isActive === false ? 'Inactive' : 'Active'}
              </Badge>
            </td>
            <td className="td">
              <RowActions
                onEdit={() => nav(`/app/admin/employees/${e._id}`)}
                onDelete={() => del(e)}
                extra={
                  <>
                    <button onClick={() => { setPwUser(e); setNewPw(''); }} className="btn-ghost btn-sm">Password</button>
                    <button onClick={() => toggleActive(e)} className="btn-ghost btn-sm">
                      {e.isActive === false ? 'Activate' : 'Deactivate'}
                    </button>
                  </>
                }
              />
            </td>
          </tr>
        ))}
      </Table>

      {pwUser && (
        <Modal title={`Reset password — ${pwUser.name}`} onClose={() => setPwUser(null)}>
          <Field label="New password (min 6 characters)">
            <PasswordInput  value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </Field>
          <p className="mt-2 text-xs text-ink-muted">The member can change it themselves later from Account → Change Password.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setPwUser(null)} className="btn-ghost">Cancel</button>
            <button onClick={resetPassword} className="btn-primary">Reset password</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
