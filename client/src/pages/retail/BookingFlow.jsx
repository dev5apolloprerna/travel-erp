import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Card, Field, Input, Select } from '../../components/ui';
import { iconFor } from '../shared/serviceForms';
import MultiEntryBookingForm from '../shared/MultiEntryBookingForm';
import ServiceBookingForm from '../shared/ServiceBookingForm';
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustNote, setNewCustNote] = useState(null);
  const [editOrder, setEditOrder] = useState(null);     // raw order loaded for editing

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
        // service list is available, see below).
        setMode('package');
        setPkgLines((o.services || []).map((s) => {
          const { serviceType, serviceRef, _id, passengers, ...fields } = s;
          return { serviceId: String(serviceRef?._id || serviceRef || ''), entry: { ...fields, passengers: passengers?.length ? passengers : [{ name: '' }] } };
        }));
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
  const buildPackageServices = () => pkgLines.map((b) => {
    const svc = svcById(b.serviceId);
    const { passengers = [], ...fields } = b.entry || {};
    return { serviceType: svc.name.toUpperCase(), serviceRef: svc._id, ...fields, passengers: passengers.filter((p) => p.name?.trim()) };
  });

  const save = async () => {
    setError('');
    if (!customerId) return setError('Please select a customer.');

    let payload;
    if (mode === 'package') {
      if (pkgLines.length < 2) return setError('A package must contain at least two services.');
      if (pkgLines.some((b) => !b.serviceId)) return setError('Please choose a service for every package line.');
      payload = { customerId, invoiceType, isPackage: true, services: buildPackageServices() };
    } else {
      if (!chosen) return setError('Please select a service.');
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
    <div className="max-w-5xl">
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
                  <>
                    <ServiceBookingForm serviceName={svc.name} value={b.entry} onChange={(next) => setLine(i, { entry: next })} />
                    <div className="mt-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Passengers</div>
                      {(b.entry.passengers || []).map((p, pi) => (
                        <div key={pi} className="mb-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                          <Input placeholder="Passenger name" value={p.name || ''}
                            onChange={(e) => setLine(i, { entry: { ...b.entry, passengers: (b.entry.passengers || []).map((x, xi) => (xi === pi ? { ...x, name: e.target.value } : x)) } })} />
                          {(b.entry.passengers || []).length > 1 && (
                            <button type="button" onClick={() => setLine(i, { entry: { ...b.entry, passengers: (b.entry.passengers || []).filter((_, xi) => xi !== pi) } })} className="btn-ghost btn-sm">Remove</button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => setLine(i, { entry: { ...b.entry, passengers: [...(b.entry.passengers || []), { name: '' }] } })} className="btn-ghost btn-sm">+ Add passenger</button>
                    </div>
                  </>
                ) : <p className="text-sm text-ink-muted">Choose a service to enter its booking details.</p>}
              </Card>
            );
          })}

          <button type="button" onClick={addLine} className="btn-accent btn-sm">+ Add service to package</button>

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
        /* -------------------- SINGLE MODE: entries -------------------- */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl2 border border-brand/30 bg-brand-light/40 px-4 py-2.5">
            <span className="text-sm font-semibold text-ink">Selected service: <span className="text-brand">{chosen.name}</span></span>
            <button onClick={() => { setChosen(null); setEntries([{ passengers: [{ name: '' }] }]); }} className="btn-ghost btn-sm">← Change Service</button>
          </div>
          <Card title={`${chosen.name} details — ${typeLabel}`}>
            <MultiEntryBookingForm serviceName={chosen.name} entries={entries} onChange={setEntries} />
          </Card>

          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : (editId ? 'Update booking' : 'Save booking')}</button>
            <button onClick={() => { setChosen(null); setEntries([{ passengers: [{ name: '' }] }]); }} className="btn-ghost">← Change Service</button>
          </div>
        </div>
      )}

      {showNewCustomer && (
        <NewCustomerModal onClose={() => setShowNewCustomer(false)} onCreated={onCustomerCreated} />
      )}
    </div>
  );
}
