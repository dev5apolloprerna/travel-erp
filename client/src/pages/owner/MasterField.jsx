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
    // ref + multiref both load their options from the related master.
    if ((field.type === 'ref' || field.type === 'multiref') && field.ref) {
      const params = field.excludeSelf && excludeId ? { exclude: excludeId } : {};
      api.get(`/owner/masters/${field.ref}/options`, { params })
        .then((r) => setOptions(r.data)).catch(() => setOptions([]));
    }
  }, [field, excludeId]);

  const req = field.required;
  const label = <>{field.label}{req && <span className="text-red-500"> *</span>}</>;

  // multi-select checklists: 'multiselect' uses field.options (strings or {value,label}),
  // 'multiref' uses options loaded from the related master. Value is an array.
  if (field.type === 'multiselect' || field.type === 'multiref') {
    const opts = field.type === 'multiref'
      ? options
      : (field.options || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
    const selected = Array.isArray(value) ? value.map(String) : [];
    const toggle = (v) => {
      const s = String(v);
      onChange(selected.includes(s) ? selected.filter((x) => x !== s) : [...selected, s]);
    };
    return (
      <Field label={label}>
        <div className="max-h-44 overflow-y-auto rounded-lg border border-line bg-white p-2.5">
          <div className="grid gap-1.5 sm:grid-cols-2">
            {opts.length === 0 && <span className="text-sm text-ink-muted">No options.</span>}
            {opts.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" checked={selected.includes(String(o.value))} onChange={() => toggle(o.value)} />
                {o.label}
              </label>
            ))}
          </div>
        </div>
      </Field>
    );
  }

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
