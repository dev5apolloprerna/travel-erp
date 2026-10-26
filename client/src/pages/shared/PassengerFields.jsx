import { Field, Input, Select } from '../../components/ui';

// v62 — reusable passenger detail block for the booking forms. Captures the six
// fields (Name, Nationality, Gender, DOB, Passport Number, Passport Issue Date)
// for ONE passenger. Name stays required; the rest are optional (passport is not
// forced). Dates are plain <input type="date"> (YYYY-MM-DD) and stored as Dates.
//
// props:
//   value     passenger object { name, nationality, gender, dob, passportNumber, passportIssueDate }
//   index     0-based position (for the "Passenger NN" label)
//   onChange  (nextPassenger) => void
//   onRemove  () => void | undefined   (omit to hide the Remove button)
const asDateInput = (v) => {
  if (!v) return '';
  // Accept Date, ISO string, or already-YYYY-MM-DD.
  const s = typeof v === 'string' ? v : new Date(v).toISOString();
  return s.slice(0, 10);
};

export default function PassengerFields({ value = {}, index = 0, onChange, onRemove }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const num = String(index + 1).padStart(2, '0');

  return (
    <div className="mb-3 rounded-lg border border-line bg-faint/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Passenger {num}</span>
        {onRemove && (
          <button type="button" onClick={onRemove} className="btn-ghost btn-sm">Remove</button>
        )}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Passenger Name">
          <Input placeholder="Full name" value={value.name || ''} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Nationality">
          <Input placeholder="e.g. Indian" value={value.nationality || ''} onChange={(e) => set({ nationality: e.target.value })} />
        </Field>
        <Field label="Gender">
          <Select value={value.gender || ''} onChange={(e) => set({ gender: e.target.value })}>
            <option value="">Select…</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </Select>
        </Field>
        <Field label="Date of Birth">
          <Input type="date" value={asDateInput(value.dob)} onChange={(e) => set({ dob: e.target.value })} />
        </Field>
        <Field label="Passport Number">
          <Input placeholder="Optional" value={value.passportNumber || ''} onChange={(e) => set({ passportNumber: e.target.value })} />
        </Field>
        <Field label="Passport Issue Date">
          <Input type="date" value={asDateInput(value.passportIssueDate)} onChange={(e) => set({ passportIssueDate: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}
