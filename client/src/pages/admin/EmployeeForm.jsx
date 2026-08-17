import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Card, Field, Input, Select } from '../../components/ui';
import { MENU } from '../../menuConfig';

const MODULES = ['RETAIL', 'B2B', 'FIT'];
// menu keys the admin can grant (flatten menu config, skip dashboard)
const MENU_KEYS = MENU.flatMap((g) => g.items).filter((i) => i.key !== 'dashboard');

export default function EmployeeForm() {
  const { id } = useParams();
  const editing = id && id !== 'new';
  const nav = useNavigate();
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({
    name: '', email: '', password: '', employeeTypes: ['DOMESTIC'],
    menus: [], modules: [], services: [], isActive: true,
  });

  useEffect(() => {
    api.get('/services').then((r) => setServices(r.data));
    if (editing) {
      api.get(`/auth/employees/${id}`).then((r) => {
        const e = r.data;
        setForm({
          name: e.name, email: e.email, password: '',
          employeeTypes: e.employeeTypes?.length ? e.employeeTypes : (e.employeeType ? [e.employeeType] : ['DOMESTIC']),
          menus: e.menus || [], modules: e.modules || [],
          services: (e.services || []).map((s) => s._id || s),
          isActive: e.isActive !== false,
        });
      });
    }
  }, [id]);

  // Select-all / clear-all helper for the checkbox groups
  const allSelected = (field, allValues) => allValues.length > 0 && allValues.every((v) => form[field].includes(v));
  const toggleAll = (field, allValues) => setForm((f) => ({
    ...f,
    [field]: allValues.every((v) => f[field].includes(v)) ? [] : [...allValues],
  }));

  const toggle = (field, val) => setForm((f) => ({
    ...f, [field]: f[field].includes(val) ? f[field].filter((x) => x !== val) : [...f[field], val],
  }));

  const save = async () => {
    if (editing) await api.put(`/auth/employees/${id}`, form);
    else await api.post('/auth/employees', form);
    nav('/app/admin/employees');
  };

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Administration" title={editing ? 'Edit employee' : 'Create employee'} />

      <Card title="Employee details" className="mb-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label={editing ? 'New password (leave blank to keep)' : 'Password'}>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Employee type (can be both)">
            <div className="flex gap-2">
              {['DOMESTIC', 'INTERNATIONAL'].map((t) => (
                <button key={t} type="button" onClick={() => toggle('employeeTypes', t)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    form.employeeTypes.includes(t)
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-white text-ink-soft hover:bg-canvas'
                  }`}>
                  {t === 'DOMESTIC' ? 'Domestic' : 'International'}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Account status">
            <Select value={form.isActive ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}>
              <option value="active">Active — can log in</option>
              <option value="inactive">Inactive — login blocked</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card title="Module / client-type access" className="mb-4">
        <label className="mb-3 flex items-center gap-2 border-b border-line pb-2 text-sm font-semibold text-ink">
          <input type="checkbox" checked={allSelected('modules', MODULES)} onChange={() => toggleAll('modules', MODULES)} />
          Select all modules
        </label>
        <div className="flex flex-wrap gap-2">
          {MODULES.map((m) => (
            <button key={m} onClick={() => toggle('modules', m)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                form.modules.includes(m) ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink-soft hover:bg-canvas'
              }`}>{m}</button>
          ))}
        </div>
      </Card>

      <Card title="Menu access" className="mb-4">
        <label className="mb-3 flex items-center gap-2 border-b border-line pb-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={allSelected('menus', MENU_KEYS.map((i) => i.key))}
            onChange={() => toggleAll('menus', MENU_KEYS.map((i) => i.key))}
          />
          Select all menus
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {MENU_KEYS.map((it) => (
            <label key={it.key} className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={form.menus.includes(it.key)} onChange={() => toggle('menus', it.key)} />
              {it.label}
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-muted">Employee sees and manages only the menus checked here.</p>
      </Card>

      <Card title="Service booking rights" className="mb-4">
        {services.length > 0 && (
          <label className="mb-3 flex items-center gap-2 border-b border-line pb-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={allSelected('services', services.map((s) => s._id))}
              onChange={() => toggleAll('services', services.map((s) => s._id))}
            />
            Select all services
          </label>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          {services.map((s) => (
            <label key={s._id} className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={form.services.includes(s._id)} onChange={() => toggle('services', s._id)} />
              {s.name} <span className="text-xs text-ink-muted">({s.type === 'DOMESTIC' ? 'Dom' : 'Intl'} · GST {s.gstPercent ?? 0}%)</span>
            </label>
          ))}
          {services.length === 0 && <p className="text-sm text-ink-muted">No services yet — add them in Service Master first.</p>}
        </div>
      </Card>

      <div className="flex gap-2">
        <button onClick={save} className="btn-primary">{editing ? 'Save changes' : 'Create employee'}</button>
        <button onClick={() => nav('/app/admin/employees')} className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}
