import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Field, Input, Select, Textarea } from '../../components/ui';

// Renders one field based on its type. Foreign-key ('ref') fields load their options
// from the related master and show a dropdown of names while storing the id.
export default function MasterField({ field, value, onChange }) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    if (field.type === 'ref' && field.ref) {
      api.get(`/owner/masters/${field.ref}/options`).then((r) => setOptions(r.data)).catch(() => setOptions([]));
    }
  }, [field]);

  if (field.type === 'ref') {
    return (
      <Field label={field.label}>
        <Select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select {field.label}…</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </Field>
    );
  }

  if (field.type === 'boolean') {
    return (
      <Field label={field.label}>
        <label className="flex items-center gap-2 pt-1 text-sm text-ink-soft">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          Yes
        </label>
      </Field>
    );
  }

  if (field.type === 'textarea') {
    return <Field label={field.label}><Textarea rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></Field>;
  }

  const inputType = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text';
  const v = field.type === 'date' && value ? String(value).slice(0, 10) : (value ?? '');
  return <Field label={field.label}><Input type={inputType} value={v} onChange={(e) => onChange(e.target.value)} /></Field>;
}
