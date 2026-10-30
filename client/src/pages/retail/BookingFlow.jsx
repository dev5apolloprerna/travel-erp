import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Card, Field, Select } from '../../components/ui';
import { iconFor } from '../shared/serviceForms';
import MultiEntryBookingForm from '../shared/MultiEntryBookingForm';
import ServiceBookingForm from '../shared/ServiceBookingForm';
import PassengerFields from '../shared/PassengerFields';
import NewCustomerModal from './NewCustomerModal';
import { useShellBase } from '../../hooks/useShellBase';

const blankPkgLine = () => ({ serviceId: '', entry: { passengers: [{ name: '' }] } });

export default function BookingFlow() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { id: editId } = useParams();          // present only on the /:id/edit route
  const { user } = useAuth();
  const base = useShellBase();

  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);          // from Service master
  const [customerId, setCustomerId] = useState(params.get('customer') || '');
  const [invoiceType, setInvoiceType] = useState('DOMESTIC');
  const [mode, setMode] = useState('single');            // 'single' | 'package' (req #3)
  const [chosen, setChosen] = useState(null);            // selected Service master record (single mode)
  const [entries, setEntries] = useState([{ passengers: [{ name: '' }] }]);   // single-mode entries
  const [pkgLines, setPkgLines] = useState([blankPkgLine(), blankPkgLine()]);  // package-mode service lines
  // v64: Package bookings share ONE passenger list across all services; each service keeps only
  // its own service-specific fields. On save the shared list is applied to every package service.
  const [pkgPassengers, setPkgPassengers] = useState([{ name: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustNote, setNewCustNote] = useState(null);
  const [editOrder, setEditOrder] = useState(null);     // raw order loaded for editing
  // v65.1: passenger auto-fill from the customer's MOST RECENT eligible order (automatic — no
  // manual order selection). `prefill` drives a small status/confirm banner.
  const [prefill, setPrefill] = useState({ loading: false, note: '', error: '', conflict: null });
  // v66.1: the auto-filled passenger list is a SEPARATE source of truth so a service (re)select
  // never wipes it (single-mode `entries` are reset on service change). New entries seed from here.
  const [basePassengers, setBasePassengers] = useState([{ name: '' }]);
  const reqSeqRef = useRef(0);                 // guards against stale (out-of-order) responses
  const stateRef = useRef({});
  stateRef.current = { mode, entries, pkgPassengers, basePassengers };

  useEffect(() => {
    api.get('/retail/customers').then((r) => setCustomers(r.data));
    api.get('/services').then((r) => setServices(r.data.filter((s) => s.isActive !== false)));
  }, []);

  // Load the order being edited and prefill. An order whose invoice has already been generated
  // (or that is cancelled) is NOT editable — bounce to its detail.
  useEffect(() => {
    if (!editId) return;
    api.get(`/retail/orders/${editId}`).then((r) => {
      const o = r.data.order;
      if (o.invoiceGenerated || o.cancelled) { nav(`${base}/retail/orders/${o._id}`); return; }
      setEditOrder(o);
      setCustomerId(o.customerId?._id || o.customerId || '');
      setInvoiceType(o.invoiceType || 'DOMESTIC');
      if (o.isPackage) {
        // Package edit: one package line per stored service (chosen service resolved once the
        // service list is available, see below). Passengers are shared, so seed the shared list
        // from the first service that has any (v64).
        setMode('package');
        setPkgLines((o.services || []).map((s) => {
          const { serviceType, serviceRef, _id, passengers, ...fields } = s;
          return { serviceId: String(serviceRef?._id || serviceRef || ''), entry: { ...fields } };
        }));
        const shared = (o.services || []).map((s) => s.passengers).find((p) => p?.length);
        setPkgPassengers(shared?.length ? shared : [{ name: '' }]);
      } else {
        setMode('single');
        const ents = (o.services || []).map((s) => {
          const { serviceType, serviceRef, _id, passengers, ...fields } = s;
          return { ...fields, passengers: passengers?.length ? passengers : [{ name: '' }] };
        });
        setEntries(ents.length ? ents : [{ passengers: [{ name: '' }] }]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // Resolve the selected Service master once both the order and the service list are loaded (single).
  useEffect(() => {
    if (!editOrder || editOrder.isPackage || !services.length || chosen) return;
    const ref = editOrder.services?.[0]?.serviceRef;
    const refId = ref?._id || ref;
    const svc = services.find((s) => String(s._id) === String(refId));
    if (svc) setChosen(svc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOrder, services]);

  // True if the user has already typed any passenger name (so we don't silently overwrite).
  const hasTypedPassengers = () => {
    const st = stateRef.current;
    return st.mode === 'package'
      ? (st.pkgPassengers || []).some((p) => p.name?.trim())
      : (st.entries || []).some((e) => (e.passengers || []).some((p) => p.name?.trim()));
  };
  const clonePax = (arr) => (arr || []).map((p) => ({ ...p }));
  const applyPassengers = (pax) => {
    const st = stateRef.current;
    setBasePassengers(clonePax(pax));                        // survives service resets
    if (st.mode === 'package') setPkgPassengers(clonePax(pax));
    else setEntries((prev) => (prev.length ? prev : [{}]).map((e) => ({ ...e, passengers: clonePax(pax) })));
  };
  // Passengers a freshly-(re)selected service entry should start with: whatever the user has
  // already typed, else the auto-filled base, else one blank row. Keeps passengers across service
  // changes and makes them appear on the first service selection regardless of fetch timing.
  const seedPassengers = () => {
    const st = stateRef.current;
    const typed = (st.entries || []).flatMap((e) => e.passengers || []).filter((p) => p.name?.trim());
    if (typed.length) return clonePax(typed);
    const base = (st.basePassengers || []).filter((p) => p.name?.trim());
    return base.length ? clonePax(base) : [{ name: '' }];
  };

  // v65.1: when the customer is selected/changed, auto-fill from their most recent eligible order.
  // Skipped while editing (an existing order keeps its own passengers). Stale responses are ignored.
  useEffect(() => {
    if (editId) return;
    const seq = (reqSeqRef.current += 1);
    setPrefill({ loading: false, note: '', error: '', conflict: null });
    if (!customerId) return;
    setPrefill({ loading: true, note: '', error: '', conflict: null });
    api.get(`/retail/customers/${customerId}/latest-passengers`)
      .then((r) => {
        if (seq !== reqSeqRef.current) return;         // a newer customer was selected — drop this
        const pax = r.data?.passengers || [];
        const source = r.data?.sourceOrder || null;
        if (!pax.length) { setPrefill({ loading: false, note: 'No previous passenger details found for this customer.', error: '', conflict: null }); return; }
        if (hasTypedPassengers()) {
          setPrefill({ loading: false, note: '', error: '', conflict: { source, passengers: pax } });
        } else {
          applyPassengers(pax);
          setPrefill({ loading: false, note: `Auto-filled ${pax.length} passenger(s) from ${source?.no || 'the latest order'}. Review and edit as needed.`, error: '', conflict: null });
        }
      })
      .catch(() => { if (seq === reqSeqRef.current) setPrefill({ loading: false, note: '', error: 'Could not load previous passenger details.', conflict: null }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, editId]);

  const isAdmin = user?.role === 'SUPER_ADMIN' || (user?.menus || []).includes('ALL');
  const allowedIds = (user?.services || []).map((sv) => String(sv._id || sv));

  // Service dropdown comes from the master, filtered by Dom/Intl + employee rights.
  const bookable = useMemo(() => {
    let list = services.filter((s) => s.type === invoiceType);
    if (!isAdmin && allowedIds.length) list = list.filter((s) => allowedIds.includes(String(s._id)));
    return list.filter((s) => s.name.toUpperCase() !== 'REGISTRATION');
  }, [services, invoiceType, isAdmin, allowedIds]);

  const svcById = (id) => services.find((s) => String(s._id) === String(id));
  // req #2: Flight is not offered inside a package booking (standalone flight booking is unaffected).
  const packageBookable = useMemo(() => bookable.filter((s) => s.name.toUpperCase() !== 'FLIGHT'), [bookable]);

  const onCustomerCreated = (customer, credentials) => {
    setCustomers((prev) => [customer, ...prev.filter((c) => c._id !== customer._id)]);
    setCustomerId(customer._id);
    setShowNewCustomer(false);
    if (credentials) setNewCustNote(`Customer created. Portal login: ${credentials.username} / ${credentials.password}`);
  };

  // ---- Package-line helpers ----
  const setLine = (i, patch) => setPkgLines((prev) => prev.map((b, x) => (x === i ? { ...b, ...patch } : b)));
  const addLine = () => setPkgLines((prev) => [...prev, blankPkgLine()]);
  const removeLine = (i) => setPkgLines((prev) => (prev.length > 1 ? prev.filter((_, x) => x !== i) : prev));

  const buildSingleServices = () => entries.map((entry) => {
    const { passengers = [], ...fields } = entry;
    return { serviceType: chosen.name.toUpperCase(), serviceRef: chosen._id, ...fields, passengers: passengers.filter((p) => p.name?.trim()) };
  });
  // v64: every package service receives the SHARED passenger list (entered once).
  const buildPackageServices = () => {
    const shared = pkgPassengers.filter((p) => p.name?.trim());
    return pkgLines.map((b) => {
      const svc = svcById(b.serviceId);
      const { passengers, ...fields } = b.entry || {};   // drop any per-line passengers
      return { serviceType: svc.name.toUpperCase(), serviceRef: svc._id, ...fields, passengers: shared };
    });
  };

  const save = async () => {
    setError('');
    if (!customerId) return setError('Please select a customer.');

    let payload;
    if (mode === 'package') {
      if (pkgLines.length < 2) return setError('A package must contain at least two services.');
      if (pkgLines.some((b) => !b.serviceId)) return setError('Please choose a service for every package line.');
      // v64: shared passenger details are mandatory for the package.
      if (!pkgPassengers.some((p) => p.name?.trim())) return setError('Passenger details are required: add at least one passenger for the package.');
      payload = { customerId, invoiceType, isPackage: true, services: buildPackageServices() };
    } else {
      if (!chosen) return setError('Please select a service.');
      // v64: Retail bookings require at least one named passenger per service entry.
      if (entries.some((e) => !(e.passengers || []).some((p) => p.name?.trim()))) {
        return setError('Passenger details are required: add at least one passenger name for every entry.');
      }
      payload = { customerId, invoiceType, isPackage: false, services: buildSingleServices() };
    }

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/retail/orders/${editId}`, payload);
        nav(`${base}/retail/orders/${editId}`);
      } else {
        await api.post('/retail/orders', payload);
        nav(`${base}/retail/orders`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the booking.');
    } finally { setSaving(false); }
  };

  const typeLabel = invoiceType === 'DOMESTIC' ? 'Domestic' : 'International';

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Retail" title={editId ? 'Edit booking' : 'New booking'} />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <Card title="Customer & service" className="mb-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer">
            <div className="flex gap-2">
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Select customer…</option>
                {customers.map((c) => <option key={c._id} value={c._id}>{c.name}{c.mobile ? ` — ${c.mobile}` : ''}</option>)}
              </Select>
              <button type="button" onClick={() => setShowNewCustomer(true)} className="btn-ghost btn-sm whitespace-nowrap">+ New customer</button>
            </div>
          </Field>
          <Field label="Booking type">
            <Select value={invoiceType} onChange={(e) => { setInvoiceType(e.target.value); setChosen(null); }}>
              <option value="DOMESTIC">Domestic</option>
              <option value="INTERNATIONAL">International</option>
            </Select>
          </Field>
        </div>

        {/* req #3: choose a single service or a package of multiple services. */}
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Booking mode</div>
          <div className="flex gap-2">
            {[['single', 'Single service'], ['package', 'Package (multiple services)']].map(([k, label]) => (
              <button key={k} type="button" onClick={() => setMode(k)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  mode === k ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink-soft hover:bg-canvas'
                }`}>{label}</button>
            ))}
          </div>
        </div>

        {/* v65.1: passengers auto-fill from the customer's most recent order (no manual pick). */}
        {customerId && !editId && (prefill.loading || prefill.note || prefill.error || prefill.conflict) && (
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
          Services are drawn from the Service Master. Price and tax are added later when the invoice is generated.
        </p>
        {newCustNote && <div className="mt-3 rounded-lg bg-accent-light px-3 py-2 text-sm text-accent-dark">{newCustNote}</div>}
      </Card>

      {/* -------------------- PACKAGE MODE -------------------- */}
      {mode === 'package' ? (
        <div className="space-y-4">
          {pkgLines.map((b, i) => {
            const svc = svcById(b.serviceId);
            return (
              <Card key={i} title={`Service ${String(i + 1).padStart(2, '0')}`}
                className="mb-0"
                >
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <div className="min-w-[220px] flex-1">
                    <Field label="Service">
                      <Select value={b.serviceId} onChange={(e) => setLine(i, { serviceId: e.target.value })}>
                        <option value="">Select service…</option>
                        {packageBookable.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </Select>
                    </Field>
                  </div>
                  {pkgLines.length > 1 && (
                    <button type="button" onClick={() => removeLine(i)} className="btn-danger btn-sm">Remove service</button>
                  )}
                </div>
                {svc ? (
                  <ServiceBookingForm serviceName={svc.name} value={b.entry} onChange={(next) => setLine(i, { entry: next })} />
                ) : <p className="text-sm text-ink-muted">Choose a service to enter its booking details.</p>}
              </Card>
            );
          })}

          <button type="button" onClick={addLine} className="btn-accent btn-sm">+ Add service to package</button>

          {/* v64: ONE shared passenger section for the whole package. Entered once and applied
              to every service above — service-specific details stay on each service card. */}
          <Card title="Passengers — shared across all package services">
            <p className="mb-3 text-xs text-ink-muted">
              Enter passenger details once here; they apply to every service in this package. Each service keeps its own booking details above.
            </p>
            {pkgPassengers.map((p, pi) => (
              <PassengerFields key={pi} value={p} index={pi}
                onChange={(next) => setPkgPassengers((prev) => prev.map((x, xi) => (xi === pi ? next : x)))}
                onRemove={pkgPassengers.length > 1 ? () => setPkgPassengers((prev) => prev.filter((_, xi) => xi !== pi)) : undefined} />
            ))}
            <button type="button" onClick={() => setPkgPassengers((prev) => [...prev, { name: '' }])} className="btn-ghost btn-sm">+ Add passenger</button>
          </Card>

          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : (editId ? 'Update package' : 'Save package booking')}</button>
          </div>
          <p className="text-xs text-ink-muted">A package creates a single order containing all the services above. Pricing per service is entered at invoice generation.</p>
        </div>
      ) : !chosen ? (
        /* -------------------- SINGLE MODE: service picker -------------------- */
        <Card title={`Choose service — ${typeLabel}`}>
          {bookable.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No {invoiceType.toLowerCase()} services available. Add them under <b>Administration → Service Master</b>,
              or ask an admin to grant you service rights.
            </p>
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
        /* -------------------- SINGLE MODE: entries -------------------- */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl2 border border-brand/30 bg-brand-light/40 px-4 py-2.5">
            <span className="text-sm font-semibold text-ink">Selected service: <span className="text-brand">{chosen.name}</span></span>
            <button onClick={() => { setChosen(null); setEntries([{ passengers: seedPassengers() }]); }} className="btn-ghost btn-sm">← Change Service</button>
          </div>
          <Card title={`${chosen.name} details — ${typeLabel}`}>
            <MultiEntryBookingForm serviceName={chosen.name} entries={entries} onChange={setEntries} />
          </Card>

          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : (editId ? 'Update booking' : 'Save booking')}</button>
            <button onClick={() => { setChosen(null); setEntries([{ passengers: seedPassengers() }]); }} className="btn-ghost">← Change Service</button>
          </div>
        </div>
      )}

      {showNewCustomer && (
        <NewCustomerModal onClose={() => setShowNewCustomer(false)} onCreated={onCustomerCreated} />
      )}
    </div>
  );
}
