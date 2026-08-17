import { Field, Input, Textarea } from '../../components/ui';

// Shared customer field grid, used by both the full page and the inline "+ New customer" popup,
// so the two forms never drift apart.
export const emptyCustomer = { name: '', mobile: '', email: '', city: '', state: '', stateCode: '', gstNumber: '', address: '' };

export default function CustomerFields({ form, onChange }) {
  const set = (k) => (e) => onChange({ ...form, [k]: e.target.value });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name"><Input value={form.name} onChange={set('name')} /></Field>
      <Field label="Mobile number"><Input value={form.mobile} onChange={set('mobile')} /></Field>
      <Field label="Email address"><Input type="email" value={form.email} onChange={set('email')} /></Field>
      <Field label="City"><Input value={form.city} onChange={set('city')} /></Field>
      <Field label="State"><Input value={form.state} onChange={set('state')} placeholder="e.g. Gujarat" /></Field>
      <Field label="State code"><Input value={form.stateCode} onChange={set('stateCode')} placeholder="e.g. 24" /></Field>
      <Field label="GST number (optional)"><Input value={form.gstNumber} onChange={set('gstNumber')} /></Field>
      <div className="sm:col-span-2"><Field label="Address"><Textarea rows={2} value={form.address} onChange={set('address')} /></Field></div>
    </div>
  );
}
