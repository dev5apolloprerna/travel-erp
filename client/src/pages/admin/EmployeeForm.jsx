import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Card, Field, Input, Select } from '../../components/ui';
import { MENU } from '../../menuConfig';
import PasswordInput from '../../components/ui/PasswordInput';
import { useShellBase } from '../../hooks/useShellBase';

const MODULES = ['RETAIL', 'B2B', 'FIT'];
// menu keys the admin can grant (flatten menu config, skip dashboard)
const MENU_KEYS = MENU.flatMap((g) => g.items).filter((i) => i.key !== 'dashboard');

export default function EmployeeForm() {
  const { id } = useParams();
  const editing = id && id !== 'new';
  const nav = useNavigate();
  const base = useShellBase();
  const [services, setServices] = useState([]);
  const [opts, setOpts] = useState({ city: [], department: [], designation: [] });
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', employeeTypes: ['DOMESTIC'],
    menus: [], modules: [], services: [], isActive: true, hr: {},
  });

  useEffect(() => {
    api.get('/services').then((r) => setServices(r.data));
    // Dropdown sources for the HR section (shared owner master options; reachable by
    // both Super Admin and Company Owner). Failures degrade to an empty list.
    ['city', 'department', 'designation'].forEach((k) =>
      api.get(`/owner/masters/${k}/options`).then((r) => setOpts((o) => ({ ...o, [k]: r.data }))).catch(() => {}));
    if (editing) {
      api.get(`/auth/employees/${id}`).then((r) => {
        const e = r.data;
        setForm({
          name: e.name, email: e.email, phone: e.phone || '', password: '',
          employeeTypes: e.employeeTypes?.length ? e.employeeTypes : (e.employeeType ? [e.employeeType] : ['DOMESTIC']),
          menus: e.menus || [], modules: e.modules || [],
          services: (e.services || []).map((s) => s._id || s),
          isActive: e.isActive !== false, hr: e.hr || {},
        });
      });
    }
  }, [id]);

  const setHr = (k) => (v) => setForm((f) => ({ ...f, hr: { ...f.hr, [k]: v } }));
  const hr = form.hr || {};

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
    nav(`${base}/admin/employees`);
  };

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Administration" title={editing ? 'Edit employee' : 'Create employee'} />

      <Card title="Employee details" className="mb-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label={editing ? 'New password (leave blank to keep)' : 'Password'}>
            <PasswordInput  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
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

      {/* HR / personal details — the same field set as the Company Owner HR employee form (req #3). */}
      <Card title="HR / Personal details" className="mb-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Address"><Input value={hr.address || ''} onChange={(e) => setHr('address')(e.target.value)} /></Field></div>
          <Field label="City">
            <Select value={hr.city || ''} onChange={(e) => setHr('city')(e.target.value)}>
              <option value="">Select city…</option>
              {opts.city.map((o) => <option key={o.value} value={o.label}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Mobile"><Input value={hr.mobile || ''} onChange={(e) => setHr('mobile')(e.target.value)} /></Field>
          <Field label="Birth date"><Input type="date" value={hr.birthDate || ''} onChange={(e) => setHr('birthDate')(e.target.value)} /></Field>
          <Field label="Anniversary date"><Input type="date" value={hr.anniversaryDate || ''} onChange={(e) => setHr('anniversaryDate')(e.target.value)} /></Field>
          <Field label="Department">
            <Select value={hr.department || ''} onChange={(e) => setHr('department')(e.target.value)}>
              <option value="">Select department…</option>
              {opts.department.map((o) => <option key={o.value} value={o.label}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Designation">
            <Select value={hr.designation || ''} onChange={(e) => setHr('designation')(e.target.value)}>
              <option value="">Select designation…</option>
              {opts.designation.map((o) => <option key={o.value} value={o.label}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Join date"><Input type="date" value={hr.joinDate || ''} onChange={(e) => setHr('joinDate')(e.target.value)} /></Field>
          <Field label="Resign date"><Input type="date" value={hr.resignDate || ''} onChange={(e) => setHr('resignDate')(e.target.value)} /></Field>
          <Field label="Licence"><Input value={hr.license || ''} onChange={(e) => setHr('license')(e.target.value)} /></Field>
          <Field label="Licence date"><Input type="date" value={hr.licenseDate || ''} onChange={(e) => setHr('licenseDate')(e.target.value)} /></Field>
          <Field label="Badge"><Input value={hr.badge || ''} onChange={(e) => setHr('badge')(e.target.value)} /></Field>
          <Field label="Badge date"><Input type="date" value={hr.badgeDate || ''} onChange={(e) => setHr('badgeDate')(e.target.value)} /></Field>
          <Field label="Basic salary"><Input type="number" value={hr.basicSalary ?? ''} onChange={(e) => setHr('basicSalary')(e.target.value)} /></Field>
          <Field label="Opening leave"><Input type="number" value={hr.opLeave ?? ''} onChange={(e) => setHr('opLeave')(e.target.value)} /></Field>
          <Field label="RBI authority">
            <Select value={hr.rbiAuthority ? 'yes' : 'no'} onChange={(e) => setHr('rbiAuthority')(e.target.value === 'yes')}>
              <option value="no">No</option><option value="yes">Yes</option>
            </Select>
          </Field>
          <Field label="Sign — Amadeus"><Input value={hr.signAmadeus || ''} onChange={(e) => setHr('signAmadeus')(e.target.value)} /></Field>
          <Field label="Sign — Galileo"><Input value={hr.signGalileo || ''} onChange={(e) => setHr('signGalileo')(e.target.value)} /></Field>
          <Field label="Sign — Abacus"><Input value={hr.signAbacus || ''} onChange={(e) => setHr('signAbacus')(e.target.value)} /></Field>
          <Field label="Bank"><Input value={hr.bank || ''} onChange={(e) => setHr('bank')(e.target.value)} /></Field>
          <Field label="KYC date"><Input type="date" value={hr.kycDate || ''} onChange={(e) => setHr('kycDate')(e.target.value)} /></Field>
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
        <button onClick={() => nav(`${base}/admin/employees`)} className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}
