import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Card, Tabs } from '../../components/ui';
import DocumentManager from '../../components/ui/DocumentManager';
import CustomerFields, { emptyCustomer } from './CustomerFields';

const blank = emptyCustomer;

export default function CustomerForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const nav = useNavigate();

  const [tab, setTab] = useState('details');
  const [form, setForm] = useState(blank);
  const [docs, setDocs] = useState([]);
  const [credentials, setCredentials] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!editing) return;
    api.get(`/retail/customers/${id}`).then((r) => {
      const c = r.data;
      setForm({
        name: c.name || '', mobile: c.mobile || '', email: c.email || '', city: c.city || '',
        state: c.state || '', stateCode: c.stateCode || '', gstNumber: c.gstNumber || '', address: c.address || '',
      });
      setDocs(c.documents || []);
    });
  }, [id, editing]);

  const save = async () => {
    setMsg(null);
    try {
      if (editing) {
        await api.put(`/retail/customers/${id}`, form);
        setMsg({ type: 'ok', text: 'Customer updated successfully.' });
      } else {
        const res = await api.post('/retail/customers', form);
        setCredentials({ ...res.data.credentials, emailSent: res.data.emailSent, emailError: res.data.emailError });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Could not save customer.' });
    }
  };

  // After creating: show the generated portal login
  if (credentials) {
    return (
      <div className="max-w-lg">
        <PageHeader eyebrow="Retail" title="Customer created" />
        <Card title="Portal login details">
          <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${credentials.emailSent ? 'bg-accent-light text-accent-dark' : 'bg-amber-50 text-amber-700'}`}>
            {credentials.emailSent
              ? `Login details emailed to ${credentials.to}.`
              : `Email not sent: ${credentials.emailError || 'SMTP not configured'}. Share the details below manually.`}
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-muted">Login URL</dt><dd className="font-medium">{credentials.loginUrl}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Username</dt><dd className="font-medium">{credentials.username}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Password</dt><dd className="font-mono font-medium">{credentials.password}</dd></div>
          </dl>
          <div className="mt-5 flex gap-2">
            <button onClick={() => nav('/app/retail/orders/new')} className="btn-primary">Create booking</button>
            <button onClick={() => nav('/app/retail/customers')} className="btn-ghost">Back to list</button>
          </div>
        </Card>
      </div>
    );
  }

  const detailsCard = (
    <Card title="Customer details">
      {msg && (
        <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${msg.type === 'ok' ? 'bg-accent-light text-accent-dark' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </div>
      )}
      <CustomerFields form={form} onChange={setForm} />
      <p className="mt-3 text-xs text-ink-muted">
        State decides the tax split on invoices — same state as the company → CGST + SGST, otherwise IGST.
        {!editing && ' On save the system generates a portal login and emails it to the customer.'}
      </p>
      <div className="mt-5 flex gap-2">
        <button onClick={save} className="btn-primary">{editing ? 'Save changes' : 'Save customer'}</button>
        <button onClick={() => nav('/app/retail/customers')} className="btn-ghost">Cancel</button>
      </div>
    </Card>
  );

  if (!editing) return <div className="max-w-2xl"><PageHeader eyebrow="Retail" title="New customer" />{detailsCard}</div>;

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Retail" title={`Edit customer — ${form.name}`} />
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'details', label: 'Details' },
        { key: 'documents', label: `Documents (${docs.length})` },
      ]} />
      {tab === 'details' && detailsCard}
      {tab === 'documents' && (
        <Card title="Customer documents">
          <DocumentManager
            docs={docs}
            uploadUrl={`/retail/customers/${id}/documents`}
            deleteUrl={(docId) => `/retail/customers/${id}/documents/${docId}`}
            onChange={setDocs}
          />
        </Card>
      )}
    </div>
  );
}
