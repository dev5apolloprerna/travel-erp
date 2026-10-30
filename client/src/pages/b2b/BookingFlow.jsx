import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Card, Field, Input, Select } from '../../components/ui';
import { iconFor } from '../shared/serviceForms';
import MultiEntryBookingForm from '../shared/MultiEntryBookingForm';
import { useShellBase } from '../../hooks/useShellBase';

export default function BookingFlow() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const base = useShellBase();

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
  // v65.1: auto-fill passengers from the company's MOST RECENT eligible order. Society unaffected.
  const [prefill, setPrefill] = useState({ loading: false, note: '', error: '', conflict: null });
  // v66.1: auto-filled passengers kept as a separate source of truth so a service (re)select
  // doesn't wipe them (single-mode `entries` are reset on service change).
  const [basePassengers, setBasePassengers] = useState([{ name: '' }]);
  const reqSeqRef = useRef(0);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const baseRef = useRef(basePassengers);
  baseRef.current = basePassengers;

  useEffect(() => {
    api.get('/b2b/companies').then((r) => setCompanies(r.data));
    api.get('/services').then((r) => setServices(r.data.filter((s) => s.isActive !== false)));
  }, []);

  const clonePax = (arr) => (arr || []).map((p) => ({ ...p }));
  const hasTypedPassengers = () => (entriesRef.current || []).some((e) => (e.passengers || []).some((p) => p.name?.trim()));
  const applyPassengers = (pax) => {
    setBasePassengers(clonePax(pax));
    setEntries((prev) => (prev.length ? prev : [{}]).map((e) => ({ ...e, passengers: clonePax(pax) })));
  };
  // Passengers a freshly-(re)selected service entry starts with: typed → auto-filled base → blank.
  const seedPassengers = () => {
    const typed = (entriesRef.current || []).flatMap((e) => e.passengers || []).filter((p) => p.name?.trim());
    if (typed.length) return clonePax(typed);
    const base = (baseRef.current || []).filter((p) => p.name?.trim());
    return base.length ? clonePax(base) : [{ name: '' }];
  };

  useEffect(() => {
    const seq = (reqSeqRef.current += 1);
    setPrefill({ loading: false, note: '', error: '', conflict: null });
    if (!companyId) { setMembers([]); return; }
    api.get(`/b2b/companies/${companyId}`).then((r) => setMembers(r.data.members || []));
    setPrefill({ loading: true, note: '', error: '', conflict: null });
    api.get(`/b2b/companies/${companyId}/latest-passengers`)
      .then((r) => {
        if (seq !== reqSeqRef.current) return;
        const pax = r.data?.passengers || [];
        const source = r.data?.sourceOrder || null;
        if (!pax.length) { setPrefill({ loading: false, note: 'No previous passenger details found for this company.', error: '', conflict: null }); return; }
        if (hasTypedPassengers()) setPrefill({ loading: false, note: '', error: '', conflict: { source, passengers: pax } });
        else { applyPassengers(pax); setPrefill({ loading: false, note: `Auto-filled ${pax.length} passenger(s) from ${source?.no || 'the latest order'}. Review and edit as needed.`, error: '', conflict: null }); }
      })
      .catch(() => { if (seq === reqSeqRef.current) setPrefill({ loading: false, note: '', error: 'Could not load previous passenger details.', conflict: null }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // v64: B2B bookings require at least one named passenger per entry.
    if (entries.some((e) => !(e.passengers || []).some((p) => p.name?.trim()))) {
      return setError('Passenger details are required: add at least one passenger name for every entry.');
    }
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
      nav(`${base}/b2b/companies/${companyId}?tab=orders`);
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

        {/* v65.1: passengers auto-fill from the company's most recent order (no manual pick). */}
        {companyId && (prefill.loading || prefill.note || prefill.error || prefill.conflict) && (
          <div className="mt-4 rounded-lg border border-line bg-faint px-3 py-2 text-xs">
            {prefill.loading && <span className="text-ink-muted">Checking for previous passenger details…</span>}
            {prefill.error && <span className="text-red-600">{prefill.error}</span>}
            {prefill.note && <span className="text-brand">{prefill.note}</span>}
            {prefill.conflict && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-ink-soft">
                  Found {prefill.conflict.passengers.length} passenger(s) from {prefill.conflict.source?.no || 'a previous order'}. Replace the details you've entered?
                </span>
                <button type="button" className="btn-ghost btn-sm" onClick={() => { applyPassengers(prefill.conflict.passengers); setPrefill((p) => ({ loading: false, error: '', conflict: null, note: `Applied ${p.conflict.passengers.length} passenger(s) from ${p.conflict.source?.no || 'the latest order'}.` })); }}>Apply</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setPrefill((p) => ({ ...p, conflict: null }))}>Keep mine</button>
              </div>
            )}
          </div>
        )}

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
                <button key={s._id} onClick={() => { setChosen(s); setEntries([{ passengers: seedPassengers() }]); }}
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
          {/* Prominent way back to the service picker — no browser Back needed (#2). */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl2 border border-brand/30 bg-brand-light/40 px-4 py-2.5">
            <span className="text-sm font-semibold text-ink">Selected service: <span className="text-brand">{chosen.name}</span></span>
            <button onClick={() => { setChosen(null); setEntries([{ passengers: seedPassengers() }]); }} className="btn-ghost btn-sm">← Change Service</button>
          </div>
          <Card title={`${chosen.name} details — ${invoiceType === 'DOMESTIC' ? 'Domestic' : 'International'}`}>
            <MultiEntryBookingForm serviceName={chosen.name} entries={entries} onChange={setEntries} />
          </Card>

          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save booking'}</button>
            <button onClick={() => { setChosen(null); setEntries([{ passengers: seedPassengers() }]); }} className="btn-ghost">← Change Service</button>
          </div>
        </div>
      )}
    </div>
  );
}
