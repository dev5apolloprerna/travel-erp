import ServiceBookingForm from './ServiceBookingForm';
import { Field, Input } from '../../components/ui';

/**
 * Multiple numbered entries of the SAME service, like the ePrompt
 * "Entry for [New Service] [001]" screen. Each entry is a full service form
 * plus its own passenger(s).
 *
 * props:
 *   serviceName        e.g. "Flight"
 *   entries            array of entry objects [{ ...fields, rooms?, passengers:[] }]
 *   onChange           (nextEntries) => void
 *   withPassengers     show per-entry passenger rows (default true).
 *                      Society passes false — its passenger is the searched doctor.
 */
export default function MultiEntryBookingForm({ serviceName, entries, onChange, withPassengers = true }) {
  const seq = (i) => String(i + 1).padStart(3, '0');   // 001, 002, ...

  const setEntry = (i, next) => onChange(entries.map((e, x) => (x === i ? next : e)));
  const addEntry = () => onChange([...entries, { passengers: withPassengers ? [{ name: '' }] : [] }]);
  const removeEntry = (i) => onChange(entries.filter((_, x) => x !== i));

  const setPassenger = (ei, pi, name) => {
    const e = entries[ei];
    const passengers = (e.passengers || []).map((p, x) => (x === pi ? { ...p, name } : p));
    setEntry(ei, { ...e, passengers });
  };
  const addPassenger = (ei) => {
    const e = entries[ei];
    setEntry(ei, { ...e, passengers: [...(e.passengers || []), { name: '' }] });
  };
  const removePassenger = (ei, pi) => {
    const e = entries[ei];
    setEntry(ei, { ...e, passengers: (e.passengers || []).filter((_, x) => x !== pi) });
  };

  return (
    <div className="space-y-4">
      {entries.map((entry, i) => (
        <div key={i} className="rounded-lg border border-line">
          <div className="flex items-center justify-between border-b border-line bg-canvas px-3 py-2">
            <span className="text-sm font-semibold text-ink">
              Entry for {serviceName} <span className="ml-1 font-mono text-brand">{seq(i)}</span>
            </span>
            {entries.length > 1 && (
              <button type="button" onClick={() => removeEntry(i)} className="btn-danger btn-sm">Remove entry</button>
            )}
          </div>

          <div className="p-3">
            <ServiceBookingForm serviceName={serviceName} value={entry} onChange={(next) => setEntry(i, next)} />

            {withPassengers && (
              <div className="mt-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Passengers</div>
                {(entry.passengers || []).map((p, pi) => (
                  <div key={pi} className="mb-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Input placeholder="Passenger name" value={p.name || ''} onChange={(e) => setPassenger(i, pi, e.target.value)} />
                    {(entry.passengers || []).length > 1 && (
                      <button type="button" onClick={() => removePassenger(i, pi)} className="btn-ghost btn-sm">Remove</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addPassenger(i)} className="btn-ghost btn-sm">+ Add passenger</button>
              </div>
            )}
          </div>
        </div>
      ))}

      <button type="button" onClick={addEntry} className="btn-accent btn-sm">+ Add another {serviceName} entry</button>
    </div>
  );
}
