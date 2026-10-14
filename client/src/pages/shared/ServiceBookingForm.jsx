import { useEffect, useRef, useState } from 'react';
import { Field, Input, Select } from '../../components/ui';
import api from '../../api/client';
import { formFor, isHotelLike } from './serviceForms';

// Dropdown that loads its options from a me_ master collection via the staff options API.
// byName=false (default): stores the record id (value). byName=true: stores the name (label),
// used where the booking/invoice expects the plain text value (e.g. Meal Plan, Quota).
// `service` is forwarded for service-scoped masters (the CRS "PNR From" dropdown, req #4).
function MRefSelect({ masterKey, value, onChange, byName = false, service }) {
  const [options, setOptions] = useState([]);
  useEffect(() => {
    let alive = true;
    const url = `/services/master-options/${masterKey}${service ? `?service=${encodeURIComponent(service)}` : ''}`;
    api.get(url)
      .then((r) => { if (alive) setOptions(r.data || []); })
      .catch(() => { if (alive) setOptions([]); });
    return () => { alive = false; };
  }, [masterKey, service]);   // re-fetch when the service changes so options stay in sync (req #4)
  return (
    <Select value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select…</option>
      {options.map((o) => {
        const v = byName ? o.label : o.value;
        return <option key={o.value} value={v}>{o.label}</option>;
      })}
    </Select>
  );
}

// Searchable autocomplete over a large master (the Account table) — server-side search so any
// eligible record is findable without loading them all at once (req #1/#2/#3). Stores the account
// NAME (so it prints on the invoice and existing bookings stay compatible); the saved value shows
// when editing. Debounced; closes on outside click.
function MSearchSelect({ masterKey, value, onChange, placeholder = 'Type to search…' }) {
  const [q, setQ] = useState(value || '');
  const [opts, setOpts] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  // Keep the input in sync when the parent value changes (e.g. loading a record to edit).
  useEffect(() => { setQ(value || ''); }, [value]);

  // Debounced server-side search whenever the box is open and the query changes.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      api.get(`/services/master-options/${masterKey}`, { params: { search: q || undefined, limit: 25 } })
        .then((r) => { if (alive) setOpts(r.data || []); })
        .catch(() => { if (alive) setOpts([]); })
        .finally(() => { if (alive) setLoading(false); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q, open, masterKey]);

  // Close when clicking outside.
  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (label) => { onChange(label); setQ(label); setOpen(false); };

  return (
    <div ref={boxRef} className="relative">
      <Input
        value={q}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); onChange(e.target.value); if (!open) setOpen(true); }}
      />
      {open && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-line bg-white py-1 shadow-card">
          {loading && <div className="px-3 py-2 text-sm text-ink-muted">Searching…</div>}
          {!loading && opts.length === 0 && <div className="px-3 py-2 text-sm text-ink-muted">No matching accounts.</div>}
          {!loading && opts.map((o) => (
            <button type="button" key={o.value}
              onMouseDown={(e) => { e.preventDefault(); pick(o.label); }}
              className="block w-full px-3 py-2 text-left text-sm text-ink-soft hover:bg-faint">
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Renders the booking-detail form for one service.
 * Booking details only — no price or tax (those are added at invoice generation),
 * except Hotel room rows which capture Rate + Tax% used by the Hotel invoice.
 */
export default function ServiceBookingForm({ serviceName, value, onChange }) {
  const fields = formFor(serviceName);
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const setVal = (k) => (v) => onChange({ ...value, [k]: v });

  const rooms = value.rooms || [];
  const setRoom = (i, key, v) => {
    const next = rooms.map((r, x) => (x === i ? { ...r, [key]: v } : r));
    onChange({ ...value, rooms: next });
  };
  const addRoom = () => onChange({ ...value, rooms: [...rooms, { roomType: '', mealPlan: '', roomCount: '', persons: '', rate: '', taxPercent: '' }] });
  const removeRoom = (i) => onChange({ ...value, rooms: rooms.filter((_, x) => x !== i) });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {fields.map(([key, label, type, options]) => (
          <Field key={key} label={label}>
            {type === 'select' ? (
              <Select value={value[key] || ''} onChange={set(key)}>
                {(options || []).map((o) => <option key={o} value={o}>{o || 'Select…'}</option>)}
              </Select>
            ) : type === 'msearch' ? (
              <MSearchSelect masterKey={options} value={value[key]} onChange={setVal(key)} />
            ) : type === 'mref' ? (
              <MRefSelect masterKey={options} value={value[key]} onChange={setVal(key)}
                service={options === 'cRS' ? serviceName : undefined} />
            ) : type === 'mname' ? (
              <MRefSelect masterKey={options} value={value[key]} onChange={setVal(key)} byName
                service={options === 'cRS' ? serviceName : undefined} />
            ) : (
              <Input type={type || 'text'} value={value[key] || ''} onChange={set(key)} />
            )}
          </Field>
        ))}
      </div>

      {isHotelLike(serviceName) && (
        <div className="rounded-lg border border-line p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Rooms</span>
            <button type="button" onClick={addRoom} className="btn-ghost btn-sm">+ Add room</button>
          </div>
          {rooms.length === 0 && <p className="text-sm text-ink-muted">No rooms added yet.</p>}
          {rooms.length > 0 && (
            <div className="mb-1 hidden gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted sm:grid sm:grid-cols-[1.3fr_1.1fr_0.7fr_0.7fr_0.8fr_0.7fr_auto]">
              <span>Room Type</span><span>Meal Plan</span><span>Rooms</span><span>Persons</span><span>Rate</span><span>Tax %</span><span></span>
            </div>
          )}
          {rooms.map((r, i) => (
            <div key={i} className="mb-2 grid gap-2 sm:grid-cols-[1.3fr_1.1fr_0.7fr_0.7fr_0.8fr_0.7fr_auto]">
              <Input placeholder="Room Type" value={r.roomType || ''} onChange={(e) => setRoom(i, 'roomType', e.target.value)} />
              <MRefSelect masterKey="mealPlan" value={r.mealPlan || ''} onChange={(v) => setRoom(i, 'mealPlan', v)} byName />
              <Input type="number" placeholder="Rooms" value={r.roomCount || ''} onChange={(e) => setRoom(i, 'roomCount', e.target.value)} />
              <Input type="number" placeholder="Persons" value={r.persons || ''} onChange={(e) => setRoom(i, 'persons', e.target.value)} />
              <Input type="number" placeholder="Rate" value={r.rate || ''} onChange={(e) => setRoom(i, 'rate', e.target.value)} />
              <Input type="number" placeholder="Tax %" value={r.taxPercent || ''} onChange={(e) => setRoom(i, 'taxPercent', e.target.value)} />
              <button type="button" onClick={() => removeRoom(i)} className="btn-ghost btn-sm">Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
