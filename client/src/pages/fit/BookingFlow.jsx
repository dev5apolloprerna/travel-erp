import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Card, Field, Input, Select } from '../../components/ui';
import { iconFor } from '../shared/serviceForms';
import MultiEntryBookingForm from '../shared/MultiEntryBookingForm';

/**
 * Society booking is passenger-driven:
 * search a passenger by Dr. Code, pick one of their divisions, and that division's
 * field-force detail (SMS/Designation/Emp/HQ/Region) is pulled in automatically.
 */
export default function SocietyBookingFlow() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [services, setServices] = useState([]);
  const [invoiceType, setInvoiceType] = useState('DOMESTIC');

  // passenger search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [passenger, setPassenger] = useState(null);
  const [divisionId, setDivisionId] = useState('');

  const [chosen, setChosen] = useState(null);
  const [entries, setEntries] = useState([{}]);   // numbered entries; passenger is the searched doctor
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/services').then((r) => setServices(r.data.filter((s) => s.isActive !== false))); }, []);

  // debounced Dr. Code / name search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api.get('/fit/passengers/search', { params: { drCode: query } })
        .then((r) => setResults(r.data))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const selectedDivision = useMemo(
    () => passenger?.divisions?.find((d) => String(d._id) === String(divisionId)),
    [passenger, divisionId]
  );

  const isAdmin = user?.role === 'SUPER_ADMIN' || (user?.menus || []).includes('ALL');
  const allowedIds = (user?.services || []).map((sv) => String(sv._id || sv));
  const bookable = useMemo(() => {
    let list = services.filter((s) => s.type === invoiceType);
    if (!isAdmin && allowedIds.length) list = list.filter((s) => allowedIds.includes(String(s._id)));
    return list;
  }, [services, invoiceType, isAdmin, allowedIds]);

  const pick = (p) => {
    setPassenger(p);
    setResults([]); setQuery(p.drCode);
    setDivisionId(p.divisions?.length === 1 ? p.divisions[0]._id : '');
  };

  const save = async () => {
    setError('');
    if (!passenger) return setError('Search and select a passenger by Dr. Code.');
    if (!divisionId) return setError('Select the division for this booking.');
    if (!chosen) return setError('Please select a service.');
    setSaving(true);
    try {
      const serviceLines = entries.map((entry) => {
        const { passengers, ...fields } = entry;   // society ignores per-entry passengers
        return { serviceType: chosen.name.toUpperCase(), serviceRef: chosen._id, ...fields };
      });
      const d = selectedDivision;
      await api.post('/fit/orders', {
        invoiceType,
        services: serviceLines,
        passenger: {
          passengerId: passenger._id,
          drCode: passenger.drCode,
          name: passenger.name,
          divisionId: d?.divisionId,
          divisionName: d?.divisionName,
          smsCode: d?.smsCode, designation: d?.designation,
          empCode: d?.empCode, empName: d?.empName,
          hq: d?.hq, region: d?.region,
        },
      });
      nav('/app/fit/orders');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the booking.');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Society" title="New Society booking" />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <Card title="Passenger (search by Dr. Code)" className="mb-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dr. Code or name">
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPassenger(null); }} placeholder="Type Dr. Code…" />
          </Field>
          <Field label="Booking type">
            <Select value={invoiceType} onChange={(e) => { setInvoiceType(e.target.value); setChosen(null); }}>
              <option value="DOMESTIC">Domestic</option>
              <option value="INTERNATIONAL">International</option>
            </Select>
          </Field>
        </div>

        {/* search results */}
        {!passenger && query.trim() && (
          <div className="mt-3 rounded-lg border border-line">
            {searching && <div className="px-3 py-2 text-sm text-ink-muted">Searching…</div>}
            {!searching && results.length === 0 && <div className="px-3 py-2 text-sm text-ink-muted">No matching passengers.</div>}
            {results.map((p) => (
              <button key={p._id} onClick={() => pick(p)}
                className="block w-full border-b border-line px-3 py-2 text-left text-sm last:border-0 hover:bg-canvas">
                <span className="font-mono font-medium text-ink">{p.drCode}</span> — {p.name}
                <span className="text-ink-muted"> · {p.divisions?.length || 0} division(s)</span>
              </button>
            ))}
          </div>
        )}

        {/* selected passenger + division */}
        {passenger && (
          <div className="mt-3 rounded-lg border border-line bg-canvas p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-mono font-semibold text-ink">{passenger.drCode}</span> — <b>{passenger.name}</b>
                {passenger.speciality && <span className="text-ink-muted"> · {passenger.speciality}</span>}
              </div>
              <button onClick={() => { setPassenger(null); setDivisionId(''); setQuery(''); }} className="btn-ghost btn-sm">Change</button>
            </div>

            <div className="mt-3">
              <Field label="Division">
                <Select value={divisionId} onChange={(e) => setDivisionId(e.target.value)}>
                  <option value="">Select division…</option>
                  {(passenger.divisions || []).map((d) => (
                    <option key={d._id} value={d._id}>{d.divisionName || 'Division'}</option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* auto-filled field-force details for the chosen division */}
            {selectedDivision && (
              <div className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <Detail label="HQ" value={selectedDivision.hq} />
                <Detail label="Region" value={selectedDivision.region} />
                <Detail label="Emp Code" value={selectedDivision.empCode} />
                <Detail label="Emp Name" value={selectedDivision.empName} />
                <Detail label="SMS Code" value={selectedDivision.smsCode} />
                <Detail label="Designation" value={selectedDivision.designation} />
              </div>
            )}
          </div>
        )}
      </Card>

      {passenger && divisionId && (!chosen ? (
        <Card title={`Choose service — ${invoiceType === 'DOMESTIC' ? 'Domestic' : 'International'}`}>
          {bookable.length === 0 ? (
            <p className="text-sm text-ink-muted">No {invoiceType.toLowerCase()} services available. Add them under <b>Administration → Service Master</b>.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {bookable.map((s) => (
                <button key={s._id} onClick={() => { setChosen(s); setEntries([{}]); }}
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
          <Card title={`${chosen.name} details`}>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Entry for {chosen.name}</div>
            <MultiEntryBookingForm serviceName={chosen.name} entries={entries} onChange={setEntries} withPassengers={false} />
          </Card>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save booking'}</button>
            <button onClick={() => setChosen(null)} className="btn-ghost">Back to services</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink">{value || '—'}</span>
    </div>
  );
}
