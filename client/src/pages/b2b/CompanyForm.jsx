import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Card, Field, Input, Select, Textarea } from '../../components/ui';

export default function CompanyForm() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', gst: '', contactPerson: '', contactNumber: '', email: '', billingAddress: '', creditTerms: 'None' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    const res = await api.post('/b2b/companies', form);
    nav(`/app/b2b/companies/${res.data._id}`);
  };

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="B2B" title="New company" />
      <Card title="Company details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name"><Input value={form.name} onChange={set('name')} /></Field>
          <Field label="GST number"><Input value={form.gst} onChange={set('gst')} /></Field>
          <Field label="Contact person"><Input value={form.contactPerson} onChange={set('contactPerson')} /></Field>
          <Field label="Contact number"><Input value={form.contactNumber} onChange={set('contactNumber')} /></Field>
          <Field label="Company email"><Input value={form.email} onChange={set('email')} /></Field>
          <Field label="Credit terms">
            <Select value={form.creditTerms} onChange={set('creditTerms')}>
              <option>None</option><option>Net 15</option><option>Net 30</option><option>Custom</option>
            </Select>
          </Field>
          <div className="sm:col-span-2"><Field label="Billing address"><Textarea rows={2} value={form.billingAddress} onChange={set('billingAddress')} /></Field></div>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={save} className="btn-primary">Save company</button>
          <button onClick={() => nav('/app/b2b/companies')} className="btn-ghost">Cancel</button>
        </div>
      </Card>
    </div>
  );
}
