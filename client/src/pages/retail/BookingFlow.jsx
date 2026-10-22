import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Card, Field, Input, Select } from '../../components/ui';
import { iconFor } from '../shared/serviceForms';
import MultiEntryBookingForm from '../shared/MultiEntryBookingForm';
import NewCustomerModal from './NewCustomerModal';
import { useShellBase } from '../../hooks/useShellBase';

export default function BookingFlow() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { id: editId } = useParams();          // present only on the /:id/edit route (req #1)
  const { user } = useAuth();
  const base = useShellBase();

  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);          // from Service master
  const [customerId, setCustomerId] = useState(params.get('customer') || '');
  const [invoiceType, setInvoiceType] = useState('DOMESTIC');
  const [chosen, setChosen] = useState(null);            // selected Service master record
  const [entries, setEntries] = useState([{ passengers: [{ name: '' }] }]);   // one or more numbered entries
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustNote, setNewCustNote] = useState(null);
  const [editOrder, setEditOrder] = useState(null);     // raw order loaded for editing

  useEffect(() => {
    api.get('/retail/customers').then((r) => setCustomers(r.data));
    api.get('/services').then((r) => setServices(r.data.filter((s) => s.isActive !== false)));
  }, []);

  // req #1: load the order being edited and prefill the form. An order whose invoice has
  // already been generated (or that is cancelled) is NOT editable — bounce to its detail.
  useEffect(() => {
    if (!editId) return;
    api.get(`/retail/orders/${editId}`).then((r) => {
      const o = r.data.order;
      if (o.invoiceGenerated || o.cancelled) { nav(`${base}/retail/orders/${o._id}`); return; }
      setEditOrder(o);
      setCustomerId(o.customerId?._id || o.customerId || '');
      setInvoiceType(o.invoiceType || 'DOMESTIC');
      const ents = (o.services || []).map((s) => {
        const { serviceType, serviceRef, _id, passengers, ...fields } = s;
        return { ...fields, passengers: passengers?.length ? passengers : [{ name: '' }] };
      });
      setEntries(ents.length ? ents : [{ passengers: [{ name: '' }] }]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // Resolve the selected Service master once both the order and the service list are loaded.
  useEffect(() => {
    if (!editOrder || !services.length || chosen) return;
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
    // Registration is not available to retail customers
    return list.filter((s) => s.name.toUpperCase() !== 'REGISTRATION');
  }, [services, invoiceType, isAdmin, allowedIds]);

  const onCustomerCreated = (customer, credentials) => {
    setCustomers((prev) => [customer, ...prev.filter((c) => c._id !== customer._id)]);
    setCustomerId(customer._id);
    setShowNewCustomer(false);
    if (credentials) {
      setNewCustNote(`Customer created. Portal login: ${credentials.username} / ${credentials.password}`);
    }
  };

  const save = async () => {
    setError('');
    if (!customerId) return setError('Please select a customer.');
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
      if (editId) {
        await api.put(`/retail/orders/${editId}`, { customerId, invoiceType, services });
        nav(`${base}/retail/orders/${editId}`);
      } else {
        await api.post('/retail/orders', { customerId, invoiceType, services });
        nav(`${base}/retail/orders`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the booking.');
    } finally { setSaving(false); }
  };

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
        <p className="mt-3 text-xs text-ink-muted">
          Services are drawn from the Service Master. Price and tax are added later when the invoice is generated.
        </p>
        {newCustNote && <div className="mt-3 rounded-lg bg-accent-light px-3 py-2 text-sm text-accent-dark">{newCustNote}</div>}
      </Card>

      {!chosen ? (
        <Card title={`Choose service — ${invoiceType === 'DOMESTIC' ? 'Domestic' : 'International'}`}>
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
        <div className="space-y-4">
          {/* Prominent way back to the service picker — no browser Back needed (#2). */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl2 border border-brand/30 bg-brand-light/40 px-4 py-2.5">
            <span className="text-sm font-semibold text-ink">Selected service: <span className="text-brand">{chosen.name}</span></span>
            <button onClick={() => { setChosen(null); setEntries([{ passengers: [{ name: '' }] }]); }} className="btn-ghost btn-sm">← Change Service</button>
          </div>
          <Card title={`${chosen.name} details — ${invoiceType === 'DOMESTIC' ? 'Domestic' : 'International'}`}>
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
