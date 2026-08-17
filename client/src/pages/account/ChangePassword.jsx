import { useState } from 'react';
import api from '../../api/client';
import { PageHeader, Card, Field, Input } from '../../components/ui';

/**
 * Change own password. Works for every role — Super Admin, Employee,
 * Retail Customer and B2B Member all hit the same endpoint.
 * `bare` renders without the page header (for use inside the portals).
 */
export default function ChangePassword({ bare = false }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setMsg(null);
    if (form.newPassword.length < 6) return setMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
    if (form.newPassword !== form.confirmPassword) return setMsg({ type: 'error', text: 'New password and confirmation do not match.' });

    setBusy(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setMsg({ type: 'ok', text: res.data.message || 'Password changed successfully.' });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Could not change password.' });
    } finally { setBusy(false); }
  };

  const body = (
    <Card title="Change password" className="max-w-md">
      {msg && (
        <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${msg.type === 'ok' ? 'bg-accent-light text-accent-dark' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </div>
      )}
      <div className="space-y-3">
        <Field label="Current password"><Input type="password" value={form.currentPassword} onChange={set('currentPassword')} /></Field>
        <Field label="New password"><Input type="password" value={form.newPassword} onChange={set('newPassword')} /></Field>
        <Field label="Confirm new password"><Input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} /></Field>
        <button onClick={submit} disabled={busy} className="btn-primary w-full">
          {busy ? 'Saving…' : 'Change password'}
        </button>
      </div>
    </Card>
  );

  if (bare) return body;
  return (
    <div>
      <PageHeader eyebrow="Account" title="Change Password" />
      {body}
    </div>
  );
}
