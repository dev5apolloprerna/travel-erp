import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Field, Input, Select, Textarea, Toggle } from '../../components/ui';

// Renders one field based on its type.
// - ref  : dynamic dropdown from the related master (stores id, shows name). Supports
//          excludeSelf (Group Parent can't be its own parent, #6).
// - enum : fixed dropdown from field.options (#4/#7/#8).
// - textarea : Remark/Notes/etc (#5).
export default function MasterField({ field, value, onChange, excludeId }) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    if (field.type === 'ref' && field.ref) {
      const params = field.excludeSelf && excludeId ? { exclude: excludeId } : {};
      api.get(`/owner/masters/${field.ref}/options`, { params })
        .then((r) => setOptions(r.data)).catch(() => setOptions([]));
    }
  }, [field, excludeId]);

  const req = field.required;
  const label = <>{field.label}{req && <span className="text-red-500"> *</span>}</>;

  if (field.type === 'ref') {
    return (
      <Field label={label}>
        <Select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select {field.label}…</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </Field>
    );
  }

  if (field.type === 'enum') {
    return (
      <Field label={label}>
        <Select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select {field.label}…</option>
          {(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
      </Field>
    );
  }

  if (field.type === 'boolean') {
    return (
      <Field label={field.label}>
        <Toggle checked={!!value} onChange={onChange} label={value ? 'Yes' : 'No'} />
      </Field>
    );
  }

  if (field.type === 'textarea') {
    return <Field label={label}><Textarea rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></Field>;
  }

  const inputType = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text';
  const v = field.type === 'date' && value ? String(value).slice(0, 10) : (value ?? '');
  return <Field label={label}><Input type={inputType} value={v} onChange={(e) => onChange(e.target.value)} /></Field>;
}
