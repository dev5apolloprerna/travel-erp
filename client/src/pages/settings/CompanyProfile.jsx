import { useEffect, useState } from 'react';
import api from '../../api/client';
import { PageHeader, Card, Field, Input, Select, Textarea, Tabs } from '../../components/ui';

export default function CompanyProfile() {
  const [tab, setTab] = useState('company');
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const [testTo, setTestTo] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  useEffect(() => { api.get('/settings').then((r) => { setForm(r.data); setTestTo(r.data.email || ''); }); }, []);

  const save = async () => {
    setMsg(null);
    try {
      const res = await api.put('/settings', form);
      setForm(res.data);
      setMsg({ type: 'ok', text: 'Settings saved successfully.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Could not save settings.' });
    }
  };

  const testSmtp = async () => {
    setMsg(null);
    try {
      const res = await api.post('/settings/test-smtp', { to: testTo });
      setMsg({ type: 'ok', text: res.data.message });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'SMTP test failed.' });
    }
  };

  if (!form) return <div className="text-ink-muted">Loading…</div>;

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Administration" title="Company Profile Settings"
        actions={<button onClick={save} className="btn-primary">Save settings</button>} />

      {msg && (
        <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${msg.type === 'ok' ? 'bg-accent-light text-accent-dark' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </div>
      )}

      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'company', label: 'Company & GST' },
        { key: 'bank', label: 'Bank Details' },
        { key: 'smtp', label: 'SMTP / Email' },
        { key: 'gateways', label: 'Payment Gateways' },
      ]} />

      {tab === 'company' && (
        <Card title="Legal details (printed on invoices)">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Company name"><Input value={form.companyName || ''} onChange={set('companyName')} /></Field></div>
            <Field label="GST number"><Input value={form.gstNumber || ''} onChange={set('gstNumber')} placeholder="24ABCDE1234F1Z5" /></Field>
            <Field label="PAN"><Input value={form.pan || ''} onChange={set('pan')} /></Field>
            <div className="sm:col-span-2"><Field label="Address line 1"><Input value={form.addressLine1 || ''} onChange={set('addressLine1')} /></Field></div>
            <div className="sm:col-span-2"><Field label="Address line 2"><Input value={form.addressLine2 || ''} onChange={set('addressLine2')} /></Field></div>
            <Field label="City"><Input value={form.city || ''} onChange={set('city')} /></Field>
            <Field label="State (home state)"><Input value={form.state || ''} onChange={set('state')} placeholder="Gujarat" /></Field>
            <Field label="State code"><Input value={form.stateCode || ''} onChange={set('stateCode')} placeholder="24" /></Field>
            <Field label="Pincode"><Input value={form.pincode || ''} onChange={set('pincode')} /></Field>
            <Field label="Phone"><Input value={form.phone || ''} onChange={set('phone')} /></Field>
            <Field label="Email"><Input value={form.email || ''} onChange={set('email')} /></Field>
            <div className="sm:col-span-2"><Field label="Website"><Input value={form.website || ''} onChange={set('website')} /></Field></div>
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            The <b>home state</b> decides the tax split on every invoice: same state as the customer → CGST + SGST, different state → IGST.
          </p>
        </Card>
      )}

      {tab === 'bank' && (
        <Card title="Bank details (optional, shown on invoice)">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Bank name"><Input value={form.bankName || ''} onChange={set('bankName')} /></Field></div>
            <Field label="Account number"><Input value={form.bankAccount || ''} onChange={set('bankAccount')} /></Field>
            <Field label="IFSC code"><Input value={form.bankIfsc || ''} onChange={set('bankIfsc')} /></Field>
          </div>
        </Card>
      )}

      {tab === 'gateways' && (
        <Card title="Payment gateways (website bookings)">
          <p className="mb-4 text-sm text-ink-soft">
            Domestic packages are charged through <b>Razorpay</b>, international packages through <b>Stripe</b>.
            These keys are used by the public website only.
          </p>

          <div className="mb-6 rounded-lg border border-line p-4">
            <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <input type="checkbox" checked={!!form.razorpayEnabled} onChange={set('razorpayEnabled')} />
              Enable Razorpay (domestic — INR)
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Razorpay Key ID"><Input value={form.razorpayKeyId || ''} onChange={set('razorpayKeyId')} placeholder="rzp_live_..." /></Field>
              <Field label="Razorpay Key Secret"><Input type="password" value={form.razorpayKeySecret || ''} onChange={set('razorpayKeySecret')} placeholder="********" /></Field>
              <Field label="Domestic currency"><Input value={form.currencyDomestic || 'INR'} onChange={set('currencyDomestic')} /></Field>
            </div>
          </div>

          <div className="mb-6 rounded-lg border border-line p-4">
            <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <input type="checkbox" checked={!!form.stripeEnabled} onChange={set('stripeEnabled')} />
              Enable Stripe (international)
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Stripe Publishable Key"><Input value={form.stripePublishableKey || ''} onChange={set('stripePublishableKey')} placeholder="pk_live_..." /></Field>
              <Field label="Stripe Secret Key"><Input type="password" value={form.stripeSecretKey || ''} onChange={set('stripeSecretKey')} placeholder="********" /></Field>
              <Field label="Stripe Webhook Secret"><Input type="password" value={form.stripeWebhookSecret || ''} onChange={set('stripeWebhookSecret')} placeholder="whsec_..." /></Field>
              <Field label="International currency"><Input value={form.currencyInternational || 'USD'} onChange={set('currencyInternational')} /></Field>
            </div>
          </div>

          <Field label="Public website URL"><Input value={form.websiteUrl || ''} onChange={set('websiteUrl')} placeholder="https://www.360travelcon.com" /></Field>

          <div className="mt-4 rounded-lg bg-canvas p-3 text-xs text-ink-muted">
            <b>Webhook URLs</b> to configure in your gateway dashboards:<br />
            Razorpay: <span className="font-mono">{'{your-api}'}/api/public/webhooks/razorpay</span><br />
            Stripe: <span className="font-mono">{'{your-api}'}/api/public/webhooks/stripe</span>
          </div>
        </Card>
      )}

      {tab === 'smtp' && (
        <Card title="Outgoing email (SMTP)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SMTP host"><Input value={form.smtpHost || ''} onChange={set('smtpHost')} placeholder="smtp.hostinger.com" /></Field>
            <Field label="SMTP port"><Input type="number" value={form.smtpPort || 587} onChange={set('smtpPort')} /></Field>
            <Field label="SMTP username"><Input value={form.smtpUser || ''} onChange={set('smtpUser')} /></Field>
            <Field label="SMTP password"><Input type="password" value={form.smtpPassword || ''} onChange={set('smtpPassword')} placeholder="********" /></Field>
            <Field label="From name"><Input value={form.smtpFromName || ''} onChange={set('smtpFromName')} /></Field>
            <Field label="From email"><Input value={form.smtpFromEmail || ''} onChange={set('smtpFromEmail')} /></Field>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" checked={!!form.smtpSecure} onChange={set('smtpSecure')} />
                Use SSL/TLS (tick for port 465, leave off for 587)
              </label>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-line bg-canvas p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">Test configuration</div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[220px] flex-1"><Field label="Send test email to"><Input value={testTo} onChange={(e) => setTestTo(e.target.value)} /></Field></div>
              <button onClick={testSmtp} className="btn-accent">Send test email</button>
            </div>
            <p className="mt-2 text-xs text-ink-muted">Save your settings first, then send the test.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
