import { Field, Input, Select } from '../../components/ui';
import { formFor, isHotelLike } from './serviceForms';

/**
 * Renders the booking-detail form for one service.
 * Booking details only — no price or tax (those are added at invoice generation).
 *
 * props:
 *   serviceName   e.g. "Flight", "Railway", "Hotel"
 *   value         the line object being edited
 *   onChange      (nextLine) => void
 */
export default function ServiceBookingForm({ serviceName, value, onChange }) {
  const fields = formFor(serviceName);
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });

  const rooms = value.rooms || [];
  const setRoom = (i, key, v) => {
    const next = rooms.map((r, x) => (x === i ? { ...r, [key]: v } : r));
    onChange({ ...value, rooms: next });
  };
  const addRoom = () => onChange({ ...value, rooms: [...rooms, { roomType: '', mealPlan: '', roomCount: '', persons: '' }] });
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
          {rooms.map((r, i) => (
            <div key={i} className="mb-2 grid gap-2 sm:grid-cols-[1.4fr_1.4fr_0.8fr_0.8fr_auto]">
              <Input placeholder="Room Type" value={r.roomType || ''} onChange={(e) => setRoom(i, 'roomType', e.target.value)} />
              <Input placeholder="Meal Plan" value={r.mealPlan || ''} onChange={(e) => setRoom(i, 'mealPlan', e.target.value)} />
              <Input type="number" placeholder="Rooms" value={r.roomCount || ''} onChange={(e) => setRoom(i, 'roomCount', e.target.value)} />
              <Input type="number" placeholder="Persons" value={r.persons || ''} onChange={(e) => setRoom(i, 'persons', e.target.value)} />
              <button type="button" onClick={() => removeRoom(i)} className="btn-ghost btn-sm">Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
