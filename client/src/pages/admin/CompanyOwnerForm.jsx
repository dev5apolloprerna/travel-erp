import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Card, Field, Input, Select } from '../../components/ui';
import PasswordInput from '../../components/ui/PasswordInput';

// Super Admin → create / edit a Company Owner login (requirement #3).
export default function CompanyOwnerForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const editing = !!id;

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editing) api.get(`/auth/company-owners/${id}`).then((r) =>
      setForm({ name: r.data.name, email: r.data.email, phone: r.data.phone || '', password: '', isActive: r.data.isActive }));
  }, [id, editing]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const backToList = () => nav('/app/admin/company-owners');

  const save = async () => {
    setError(''); setSaving(true);
    try {
      const payload = { name: form.name, email: form.email, phone: form.phone, isActive: form.isActive };
      if (form.password) payload.password = form.password;
      if (editing) await api.put(`/auth/company-owners/${id}`, payload);
      else await api.post('/auth/company-owners', payload);
      backToList();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save this Company Owner.');
    } finally { setSaving(false); }
  };

  return (
    <div className="pb-24">
      <PageHeader eyebrow="Administration" title={editing ? 'Edit Company Owner' : 'Add Company Owner'} />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <Card title="Company Owner Details" className="max-w-5xl">
        <div className="grid gap-x-[18px] gap-y-4 sm:grid-cols-2">
          <Field label={<>Full name <span className="text-red-500">*</span></>}>
            <Input value={form.name} onChange={(e) => set('name')(e.target.value)} />
          </Field>
          <Field label={<>Email <span className="text-red-500">*</span></>}>
            <Input type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set('phone')(e.target.value)} />
          </Field>
          <Field label={editing ? 'New password (leave blank to keep)' : 'Password'}>
            <PasswordInput value={form.password} onChange={(e) => set('password')(e.target.value)}
              placeholder={editing ? '••••••••' : 'Defaults to owner123 if blank'} />
          </Field>
          <Field label="Account status">
            <Select value={form.isActive ? '1' : '0'} onChange={(e) => set('isActive')(e.target.value === '1')}>
              <option value="1">Active — can log in</option>
              <option value="0">Inactive — cannot log in</option>
            </Select>
          </Field>
        </div>
        <p className="mt-4 text-[12.5px] text-ink-muted">This Company Owner is bound to the 360 organization and can only access its own company's data.</p>
      </Card>

      <div className="fixed bottom-0 right-0 left-0 z-40 flex justify-end gap-2.5 border-t border-line bg-white px-4 py-3.5 shadow-[0_-2px_10px_rgba(16,24,40,.08)] sm:px-10 md:left-[264px]">
        <button onClick={backToList} className="btn-ghost">Cancel</button>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : editing ? 'Update' : 'Create Company Owner'}</button>
      </div>
    </div>
  );
}
