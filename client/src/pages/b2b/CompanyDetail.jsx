import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import {
  PageHeader, Card, StatCard, Table, EmptyRow, RowActions, Tabs, Modal,
  Field, Input, Select, Textarea, Badge, money,
} from '../../components/ui';
import DocumentManager from '../../components/ui/DocumentManager';

export default function CompanyDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const confirm = useConfirm();
  const tab = params.get('tab') || 'info';
  const [data, setData] = useState(null);

  const load = () => api.get(`/b2b/companies/${id}`).then((r) => setData(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const setTab = (t) => setParams({ tab: t });
  if (!data) return <div className="text-ink-muted">Loading…</div>;
  const { company, members, orders, payments } = data;
  const outstanding = company.totalBilled - company.totalPaid;

  return (
    <div>
      <PageHeader eyebrow="B2B Company" title={company.name}
        actions={<button onClick={() => nav('/app/b2b/companies')} className="btn-ghost">Back to list</button>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={money(company.totalBilled)} label="Total billed" />
        <StatCard value={money(company.totalPaid)} label="Total paid (lump sum)" />
        <StatCard value={money(outstanding)} label="Outstanding" />
        <StatCard value={members.length} label="Members" />
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'info', label: 'Company Info' },
          { key: 'contacts', label: `Contacts (${company.contacts?.length || 0})` },
          { key: 'documents', label: `Documents (${company.documents?.length || 0})` },
          { key: 'members', label: 'Members' },
          { key: 'payments', label: 'Payments' },
          { key: 'orders', label: 'Booking History' },
        ]}
      />

      {tab === 'info' && <InfoTab company={company} onSaved={load} />}
      {tab === 'contacts' && <ContactsTab id={id} contacts={company.contacts || []} confirm={confirm} onChange={load} />}
      {tab === 'documents' && <DocumentsTab id={id} documents={company.documents || []} onChange={load} />}
      {tab === 'members' && <MembersTab id={id} members={members} confirm={confirm} onChange={load} />}
      {tab === 'payments' && <PaymentsTab id={id} payments={payments} orders={orders} outstanding={outstanding} onChange={load} />}
      {tab === 'orders' && <OrdersTab orders={orders} companyId={id} />}
    </div>
  );
}

// ---------- Info tab (edit company) ----------
function InfoTab({ company, onSaved }) {
  const [form, setForm] = useState({
    name: company.name, gst: company.gst || '', contactPerson: company.contactPerson || '',
    contactNumber: company.contactNumber || '', email: company.email || '',
    billingAddress: company.billingAddress || '', creditTerms: company.creditTerms || 'None',
    city: company.city || '', state: company.state || '', stateCode: company.stateCode || '',
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async () => { await api.put(`/b2b/companies/${company._id}`, form); onSaved(); };

  return (
    <Card title="Company information">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name"><Input value={form.name} onChange={set('name')} /></Field>
        <Field label="GST number"><Input value={form.gst} onChange={set('gst')} /></Field>
        <Field label="Contact person"><Input value={form.contactPerson} onChange={set('contactPerson')} /></Field>
        <Field label="Contact number"><Input value={form.contactNumber} onChange={set('contactNumber')} /></Field>
        <Field label="Email"><Input value={form.email} onChange={set('email')} /></Field>
        <Field label="City"><Input value={form.city} onChange={set('city')} /></Field>
        <Field label="State"><Input value={form.state} onChange={set('state')} placeholder="e.g. Maharashtra" /></Field>
        <Field label="State code"><Input value={form.stateCode} onChange={set('stateCode')} placeholder="e.g. 27" /></Field>
        <Field label="Credit terms">
          <Select value={form.creditTerms} onChange={set('creditTerms')}>
            <option>None</option><option>Net 15</option><option>Net 30</option><option>Custom</option>
          </Select>
        </Field>
        <div className="sm:col-span-2"><Field label="Billing address"><Textarea rows={2} value={form.billingAddress} onChange={set('billingAddress')} /></Field></div>
      </div>
      <p className="mt-3 text-xs text-ink-muted">
        State decides the tax split on invoices — same state as your company → CGST + SGST, otherwise IGST.
      </p>
      <div className="mt-5"><button onClick={save} className="btn-primary">Save changes</button></div>
    </Card>
  );
}

// ---------- Members tab (add / edit / delete) ----------
function MembersTab({ id, members, confirm, onChange }) {
  const [docFor, setDocFor] = useState(null);
  const [modal, setModal] = useState(null); // {mode:'add'|'edit', member}
  const [form, setForm] = useState({ name: '', email: '', designation: '' });
  const [info, setInfo] = useState(null);

  const openAdd = () => { setForm({ name: '', email: '', designation: '' }); setInfo(null); setModal({ mode: 'add' }); };
  const openEdit = (m) => { setForm({ name: m.name, email: m.email, designation: '' }); setModal({ mode: 'edit', member: m }); };

  const submit = async () => {
    if (modal.mode === 'add') {
      const res = await api.post(`/b2b/companies/${id}/members`, form);
      setInfo(res.data.emailSimulated);
    } else {
      await api.put(`/b2b/companies/${id}/members/${modal.member._id}`, form);
      setModal(null);
    }
    onChange();
  };
  const del = async (m) => {
    if (await confirm({ title: 'Delete member?', message: `${m.name} will lose portal access.` }))
      { await api.delete(`/b2b/companies/${id}/members/${m._id}`); onChange(); }
  };

  return (
    <Card title="Members" >
      <div className="mb-3"><button onClick={openAdd} className="btn-primary btn-sm">+ Add member</button></div>
      <Table head={['Name', 'Email', 'Actions']}>
        {members.length === 0 && <EmptyRow span={3} text="No members yet." />}
        {members.map((m) => (
          <tr key={m._id}>
            <td className="td font-medium text-ink">{m.name}</td>
            <td className="td">{m.email}</td>
            <td className="td">
              <RowActions
                onEdit={() => openEdit(m)}
                onDelete={() => del(m)}
                extra={<button onClick={() => setDocFor(m)} className="btn-ghost btn-sm">📎 Documents ({m.documents?.length || 0})</button>}
              />
            </td>
          </tr>
        ))}
      </Table>

      {docFor && (
        <Modal title={`Documents — ${docFor.name}`} onClose={() => { setDocFor(null); onChange(); }} maxWidth="max-w-2xl">
          <MemberDocs companyId={id} member={docFor} />
          <div className="mt-4 text-right">
            <button onClick={() => { setDocFor(null); onChange(); }} className="btn-ghost">Close</button>
          </div>
        </Modal>
      )}

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Add member' : 'Edit member'} onClose={() => setModal(null)}>
          {info ? (
            <div>
              <div className="rounded-lg bg-accent-light p-3 text-sm text-accent-dark">
                Login emailed to {info.to}<br />User: {info.username}<br />Pass: <span className="font-mono">{info.password}</span>
              </div>
              <div className="mt-4 text-right"><button onClick={() => setModal(null)} className="btn-primary">Done</button></div>
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              {modal.mode === 'add' && <Field label="Designation"><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
                <button onClick={submit} className="btn-primary">{modal.mode === 'add' ? 'Add' : 'Save'}</button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </Card>
  );
}

// ---------- Payments tab (allocate to orders and/or lump sum) ----------
function PaymentsTab({ id, payments, orders = [], outstanding, onChange }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ amount: '', mode: 'BANK_TRANSFER', reference: '', notes: '' });
  const [alloc, setAlloc] = useState({});     // { orderId: amountString }
  const [error, setError] = useState('');

  const dueOf = (o) => (o.totalAmount || 0) - (o.paidAmount || 0);
  const openOrders = orders.filter((o) => dueOf(o) > 0.01);

  const allocatedTotal = Object.values(alloc).reduce((s, v) => s + (Number(v) || 0), 0);
  const unallocated = (Number(form.amount) || 0) - allocatedTotal;

  const toggleOrder = (o) => {
    setAlloc((prev) => {
      const next = { ...prev };
      if (o._id in next) delete next[o._id];
      else next[o._id] = String(dueOf(o));   // pre-fill with the full due
      return next;
    });
  };

  const submit = async () => {
    setError('');
    const total = Number(form.amount) || 0;
    if (total <= 0) return setError('Enter a payment amount.');
    if (allocatedTotal > total + 0.01) return setError('Allocated amount is more than the payment amount.');

    try {
      await api.post(`/b2b/companies/${id}/payments`, {
        ...form,
        amount: total,
        allocations: Object.entries(alloc)
          .map(([orderId, amount]) => ({ orderId, amount: Number(amount) || 0 }))
          .filter((a) => a.amount > 0),
      });
      setForm({ amount: '', mode: 'BANK_TRANSFER', reference: '', notes: '' });
      setAlloc({}); setModal(false); onChange();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not record the payment.');
    }
  };

  return (
    <Card title="Payment history">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-ink-muted">Outstanding: <b className="text-ink">{money(outstanding)}</b></span>
        <button onClick={() => setModal(true)} className="btn-accent btn-sm">+ Add payment</button>
      </div>

      <Table head={['Date', 'Amount', 'Mode', 'Applied to', 'Reference']}>
        {payments.length === 0 && <EmptyRow span={5} text="No payments yet." />}
        {payments.map((p) => (
          <tr key={p._id}>
            <td className="td">{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
            <td className="td">{money(p.amount)}</td>
            <td className="td">{p.mode}</td>
            <td className="td">
              {p.allocations?.length
                ? p.allocations.map((a) => `${a.orderNo || 'Order'} (${money(a.amount)})`).join(', ')
                : <span className="text-ink-muted">On account (lump sum)</span>}
            </td>
            <td className="td">{p.reference || '—'}</td>
          </tr>
        ))}
      </Table>

      <p className="mt-3 text-xs text-ink-muted">
        A payment can be applied to one or more orders, left entirely on account as a lump sum, or a mix of both.
      </p>

      {modal && (
        <Modal title="Record payment" onClose={() => setModal(false)} maxWidth="max-w-2xl">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Amount received"><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Mode">
              <Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                {['BANK_TRANSFER', 'CHEQUE', 'CASH', 'ONLINE'].map((m) => <option key={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Reference"><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
            <Field label="Notes"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>

          <div className="mt-4 rounded-lg border border-line bg-canvas p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Apply to orders (optional)
            </div>
            {openOrders.length === 0 ? (
              <p className="text-sm text-ink-muted">No orders with a pending balance — this will be recorded on account.</p>
            ) : (
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {openOrders.map((o) => {
                  const on = o._id in alloc;
                  return (
                    <div key={o._id} className="flex flex-wrap items-center gap-2 rounded border border-line bg-white p-2">
                      <label className="flex flex-1 items-center gap-2 text-sm">
                        <input type="checkbox" checked={on} onChange={() => toggleOrder(o)} />
                        <span className="font-medium text-ink">{o.orderNo}</span>
                        <span className="text-ink-muted">due {money(dueOf(o))}</span>
                      </label>
                      {on && (
                        <div className="w-32">
                          <Input type="number" value={alloc[o._id]}
                            onChange={(e) => setAlloc({ ...alloc, [o._id]: e.target.value })} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-3 flex justify-between border-t border-line pt-2 text-sm">
              <span className="text-ink-muted">Allocated to orders</span>
              <span className="font-medium text-ink">{money(allocatedTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">Remaining on account</span>
              <span className={`font-medium ${unallocated < -0.01 ? 'text-red-600' : 'text-ink'}`}>{money(unallocated)}</span>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setModal(false)} className="btn-ghost">Cancel</button>
            <button onClick={submit} className="btn-accent">Confirm payment</button>
          </div>
        </Modal>
      )}
    </Card>
  );
}

// ---------- Booking history tab ----------
function OrdersTab({ orders, companyId }) {
  const nav = useNavigate();
  const download = async (o) => {
    const res = await api.get(`/invoices/${o._id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${o.invoiceNo || o.orderNo}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Card title="Booking history">
      <div className="mb-3">
        <button onClick={() => nav(`/app/b2b/orders/new?company=${companyId}`)} className="btn-primary btn-sm">
          + New booking
        </button>
      </div>
      <Table head={['Order', 'Type', 'Requested by', 'Services', 'Invoice', 'Net amount', 'Date']}>
        {orders.length === 0 && <EmptyRow span={7} text="No orders yet." />}
        {orders.map((o) => (
          <tr key={o._id}>
            <td className="td font-mono font-medium text-ink">{o.orderNo}</td>
            <td className="td"><Badge>{o.invoiceType || 'DOMESTIC'}</Badge></td>
            <td className="td">{o.requestedByMemberId?.name || '—'}</td>
            <td className="td">{o.services?.map((s) => s.serviceType).join(', ')}</td>
            <td className="td">
              {o.invoiceGenerated
                ? <button onClick={() => nav(`/app/invoices/${o._id}/generate`)} className="font-mono text-brand hover:underline">{o.invoiceNo}</button>
                : <button onClick={() => nav(`/app/invoices/${o._id}/generate`)} className="btn-ghost btn-sm">Generate</button>}
            </td>
            <td className="td">{o.invoiceGenerated ? money(o.netInvoiceAmount) : '—'}</td>
            <td className="td">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
          </tr>
        ))}
      </Table>
      <p className="mt-3 text-xs text-ink-muted">Orders capture booking details. Pricing is entered at invoice generation.</p>
    </Card>
  );
}

// ---------- Contacts tab (add / edit / delete) ----------
function ContactsTab({ id, contacts, confirm, onChange }) {
  const [modal, setModal] = useState(null);   // { mode, contact }
  const [form, setForm] = useState({ name: '', designation: '', email: '', mobile: '', isPrimary: false });

  const openAdd = () => { setForm({ name: '', designation: '', email: '', mobile: '', isPrimary: false }); setModal({ mode: 'add' }); };
  const openEdit = (c) => {
    setForm({ name: c.name || '', designation: c.designation || '', email: c.email || '', mobile: c.mobile || '', isPrimary: !!c.isPrimary });
    setModal({ mode: 'edit', contact: c });
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    if (modal.mode === 'add') await api.post(`/b2b/companies/${id}/contacts`, form);
    else await api.put(`/b2b/companies/${id}/contacts/${modal.contact._id}`, form);
    setModal(null); onChange();
  };

  const del = async (c) => {
    if (await confirm({ title: 'Delete contact?', message: `${c.name} will be removed from this company.` }))
      { await api.delete(`/b2b/companies/${id}/contacts/${c._id}`); onChange(); }
  };

  return (
    <Card title="Company contacts">
      <div className="mb-3"><button onClick={openAdd} className="btn-primary btn-sm">+ Add contact</button></div>
      <Table head={['Name', 'Designation', 'Email', 'Mobile', 'Primary', 'Actions']}>
        {contacts.length === 0 && <EmptyRow span={6} text="No contacts added yet." />}
        {contacts.map((c) => (
          <tr key={c._id}>
            <td className="td font-medium text-ink">{c.name}</td>
            <td className="td">{c.designation || '—'}</td>
            <td className="td">{c.email || '—'}</td>
            <td className="td">{c.mobile || '—'}</td>
            <td className="td">{c.isPrimary ? <Badge status="PAID">Primary</Badge> : '—'}</td>
            <td className="td"><RowActions onEdit={() => openEdit(c)} onDelete={() => del(c)} /></td>
          </tr>
        ))}
      </Table>
      <p className="mt-3 text-xs text-ink-muted">
        Contacts are reference records only — they don't create a portal login. Use the Members tab for logins.
      </p>

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Add contact' : 'Edit contact'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Designation"><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Mobile"><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} />
              Mark as primary contact
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
              <button onClick={submit} className="btn-primary">{modal.mode === 'add' ? 'Add contact' : 'Save changes'}</button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

// ---------- Documents tab ----------
function DocumentsTab({ id, documents, onChange }) {
  return (
    <Card title="Company documents">
      <DocumentManager
        docs={documents}
        uploadUrl={`/b2b/companies/${id}/documents`}
        deleteUrl={(docId) => `/b2b/companies/${id}/documents/${docId}`}
        onChange={onChange}
      />
    </Card>
  );
}

// ---------- Member documents ----------
function MemberDocs({ companyId, member }) {
  const [docs, setDocs] = useState(member.documents || []);
  return (
    <DocumentManager
      docs={docs}
      uploadUrl={`/b2b/companies/${companyId}/members/${member._id}/documents`}
      deleteUrl={(docId) => `/b2b/companies/${companyId}/members/${member._id}/documents/${docId}`}
      onChange={setDocs}
    />
  );
}
