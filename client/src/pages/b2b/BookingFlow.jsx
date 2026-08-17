import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Card, Field, Input, Select } from '../../components/ui';
import { iconFor } from '../shared/serviceForms';
import MultiEntryBookingForm from '../shared/MultiEntryBookingForm';

export default function BookingFlow() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();

  const [companies, setCompanies] = useState([]);
  const [members, setMembers] = useState([]);
  const [services, setServices] = useState([]);
  const [companyId, setCompanyId] = useState(params.get('company') || '');
  const [requestedByMemberId, setRequestedBy] = useState('');
  const [invoiceType, setInvoiceType] = useState('DOMESTIC');
  const [chosen, setChosen] = useState(null);
  const [entries, setEntries] = useState([{ passengers: [{ name: '' }] }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/b2b/companies').then((r) => setCompanies(r.data));
    api.get('/services').then((r) => setServices(r.data.filter((s) => s.isActive !== false)));
  }, []);

  useEffect(() => {
    if (!companyId) return setMembers([]);
    api.get(`/b2b/companies/${companyId}`).then((r) => setMembers(r.data.members || []));
  }, [companyId]);

  const isAdmin = user?.role === 'SUPER_ADMIN' || (user?.menus || []).includes('ALL');
  const allowedIds = (user?.services || []).map((sv) => String(sv._id || sv));

  const bookable = useMemo(() => {
    let list = services.filter((s) => s.type === invoiceType);
    if (!isAdmin && allowedIds.length) list = list.filter((s) => allowedIds.includes(String(s._id)));
    return list;
  }, [services, invoiceType, isAdmin, allowedIds]);

  const save = async () => {
    setError('');
    if (!companyId) return setError('Please select a company.');
    if (!chosen) return setError('Please select a service.');
    setSaving(true);
    try {
      const services = entries.map((entry) => {
        const { passengers = [], ...fields } = entry;
        return {
          serviceType: chosen.name.toUpperCase(),
          serviceRef: chosen._id,
          ...fields,
          passengers: passengers.filter((p) => p.name?.trim()),
        };
      });
      await api.post('/b2b/orders', {
        companyId, requestedByMemberId: requestedByMemberId || undefined,
        invoiceType, services,
      });
      nav(`/app/b2b/companies/${companyId}?tab=orders`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the booking.');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="B2B" title="New company booking" />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <Card title="Company & request" className="mb-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company">
            <Select value={companyId} onChange={(e) => { setCompanyId(e.target.value); setRequestedBy(''); }}>
              <option value="">Select company…</option>
              {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Requested by (member)">
            <Select value={requestedByMemberId} onChange={(e) => setRequestedBy(e.target.value)} disabled={!companyId}>
              <option value="">Select member…</option>
              {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label="Booking type">
            <Select value={invoiceType} onChange={(e) => { setInvoiceType(e.target.value); setChosen(null); }}>
              <option value="DOMESTIC">Domestic</option>
              <option value="INTERNATIONAL">International</option>
            </Select>
          </Field>
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Booking is done by the employee — “Requested by” records which member asked.
          Price and tax are added later at invoice generation.
        </p>
      </Card>

      {!chosen ? (
        <Card title={`Choose service — ${invoiceType === 'DOMESTIC' ? 'Domestic' : 'International'}`}>
          {bookable.length === 0 ? (
            <p className="text-sm text-ink-muted">No {invoiceType.toLowerCase()} services available. Add them under <b>Administration → Service Master</b>.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {bookable.map((s) => (
                <button key={s._id} onClick={() => { setChosen(s); setEntries([{ passengers: [{ name: '' }] }]); }}
                  className="card flex flex-col items-center gap-1 py-5 text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand">
                  <span className="text-2xl">{iconFor(s.name)}</span>
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          <Card title={`${chosen.name} details — ${invoiceType === 'DOMESTIC' ? 'Domestic' : 'International'}`}>
            <MultiEntryBookingForm serviceName={chosen.name} entries={entries} onChange={setEntries} />
          </Card>

          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save booking'}</button>
            <button onClick={() => setChosen(null)} className="btn-ghost">Back to services</button>
          </div>
        </div>
      )}
    </div>
  );
}
