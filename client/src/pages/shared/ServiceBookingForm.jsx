import { useEffect, useState } from 'react';
import { Field, Input, Select } from '../../components/ui';
import api from '../../api/client';
import { formFor, isHotelLike } from './serviceForms';

// Dropdown that loads its options from a me_ master collection via the staff options API.
function MRefSelect({ masterKey, value, onChange }) {
  const [options, setOptions] = useState([]);
  useEffect(() => {
    let alive = true;
    api.get(`/services/master-options/${masterKey}`)
      .then((r) => { if (alive) setOptions(r.data || []); })
      .catch(() => { if (alive) setOptions([]); });
    return () => { alive = false; };
  }, [masterKey]);
  return (
    <Select value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select…</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
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
            ) : type === 'mref' ? (
              <MRefSelect masterKey={options} value={value[key]} onChange={setVal(key)} />
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
              <Input placeholder="Meal Plan" value={r.mealPlan || ''} onChange={(e) => setRoom(i, 'mealPlan', e.target.value)} />
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
