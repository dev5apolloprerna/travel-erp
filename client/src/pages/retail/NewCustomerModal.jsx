import { useState } from 'react';
import api from '../../api/client';
import { Modal } from '../../components/ui';
import CustomerFields, { emptyCustomer } from './CustomerFields';

/**
 * Inline "New customer" popup used from the booking screen.
 * Same fields as /app/retail/customers/new; on save it returns the created
 * customer so the caller can select it straight away.
 */
export default function NewCustomerModal({ onClose, onCreated }) {
  const [form, setForm] = useState(emptyCustomer);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    if (!form.name.trim()) return setError('Customer name is required.');
    setSaving(true);
    try {
      const res = await api.post('/retail/customers', form);
      // The create endpoint returns portal credentials + the customer.
      const customer = res.data.customer || res.data;
      onCreated(customer, res.data.credentials);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save customer.');
    } finally { setSaving(false); }
  };

  return (
    <Modal title="New customer" onClose={onClose} maxWidth="max-w-2xl">
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      <CustomerFields form={form} onChange={setForm} />
      <p className="mt-3 text-xs text-ink-muted">
        State decides the tax split on invoices. On save the system generates a portal login for the customer.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save customer'}</button>
      </div>
    </Modal>
  );
}
