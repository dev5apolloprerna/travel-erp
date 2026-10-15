// Small shared UI primitives used across all modules.
import { useNavigate, useLocation } from 'react-router-dom';

// Inner pages (Add / Edit / View / detail) get an automatic, consistent Back button (req #1).
// A page counts as "inner" when its last path segment is a record id or an action word
// (new/create/edit/generate) — covering detail and form pages across every role without editing
// each file. Listing / section pages (last segment a plain word like "orders") get none, and pages
// that already render their own back control (the master-engine pages) don't use PageHeader, so
// there's no duplication. Pass `back={false}` to suppress, or `back="/path"` to force it with an
// explicit fallback target.
const INNER_LAST = new Set(['new', 'create', 'edit', 'generate']);
const looksLikeId = (seg) => /^[0-9a-f]{24}$/i.test(seg) || /^\d+$/.test(seg);

export function PageHeader({ eyebrow, title, actions, back }) {
  const nav = useNavigate();
  const loc = useLocation();
  const segs = loc.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  const last = segs[segs.length - 1] || '';
  const auto = INNER_LAST.has(last) || looksLikeId(last);
  const show = back === false ? false : (back ? true : auto);
  const fallback = typeof back === 'string' ? back : '/' + segs.slice(0, -1).join('/');

  // Prefer in-app history; a 'default' location key means this was a direct/deep load with no
  // in-app history to go back to, so route to the parent listing instead of leaving the app.
  const goBack = () => { if (loc.key && loc.key !== 'default') nav(-1); else nav(fallback || '/app'); };

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {show && (
          <button type="button" onClick={goBack} aria-label="Go back"
            className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-ink-soft transition hover:bg-faint focus:outline-none focus:ring-2 focus:ring-brand/40">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
              <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <div>
          {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
          <h1 className="text-[27px] font-extrabold leading-tight text-ink">{title}</h1>
        </div>
      </div>
      {actions && <div className="flex gap-2.5">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = '' }) {
  return (
    <div className={`card p-6 ${className}`}>
      {title && <div className="mb-4 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{title}</div>}
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function Input(props) { return <input {...props} className={`input ${props.className || ''}`} />; }
export function Select(props) { return <select {...props} className={`input ${props.className || ''}`} />; }
export function Textarea(props) { return <textarea {...props} className={`input ${props.className || ''}`} />; }

export function StatCard({ value, label }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-bold text-ink">{value}</div>
      <div className="mt-1 text-xs text-ink-muted">{label}</div>
    </div>
  );
}

const badgeStyles = {
  PAID: 'bg-accent-light text-accent-dark',
  PARTIAL: 'bg-amber-100 text-amber-700',
  UNPAID: 'bg-slate-100 text-slate-500',
};
export function Badge({ status, children }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeStyles[status] || 'bg-brand-light text-brand'}`}>
      {children || status}
    </span>
  );
}

export function Table({ head, children }) {
  return (
    // overflow-x-auto (not hidden) so wide tables scroll horizontally instead of clipping
    // columns / action controls on narrow viewports (req #3).
    <div className="card overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-line bg-canvas">
          <tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyRow({ span, text = 'Nothing here yet.' }) {
  return <tr><td className="td text-ink-muted" colSpan={span}>{text}</td></tr>;
}

export function money(n) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN');
}

// Inline Edit/Delete actions for list rows
export function RowActions({ onEdit, onDelete, extra }) {
  return (
    <div className="flex gap-2">
      {extra}
      {onEdit && <button onClick={onEdit} className="btn-ghost btn-sm">Edit</button>}
      {onDelete && <button onClick={onDelete} className="btn-danger btn-sm">Delete</button>}
    </div>
  );
}

// Simple tab bar. tabs = [{key,label}], active = key, onChange(key)
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="mb-5 flex gap-1 border-b border-line">
      {tabs.map((t) => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`tab ${active === t.key ? 'tab-active' : 'tab-idle'}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// Modal shell — wireframe style with header/close and pop shadow.
// The card is capped to the viewport height and its body scrolls when the content is
// taller than the screen, so action buttons (Create/Save/Cancel) inside the body stay
// reachable on any resolution. Short modals are unaffected (the cap only bounds tall ones).
export function Modal({ title, children, onClose, maxWidth = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-6" onClick={onClose}>
      <div className={`flex max-h-[90vh] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl bg-white shadow-pop`} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-subtle px-6 py-5">
            <h3 className="text-lg font-extrabold text-ink">{title}</h3>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg bg-faint text-ink-muted hover:bg-subtle">×</button>
          </div>
        )}
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

// Yes/No chip
export function Chip({ yes, children }) {
  return <span className={`chip ${yes ? 'chip-yes' : 'chip-no'}`}>{children || (yes ? 'Yes' : 'No')}</span>;
}

// Toggle switch (wireframe boolean control)
export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 pt-1">
      <span className="relative inline-block h-[22px] w-[38px]">
        <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="absolute inset-0 cursor-pointer rounded-full bg-line transition peer-checked:bg-brand"></span>
        <span className="absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4"></span>
      </span>
      {label && <span className="text-sm text-ink-soft">{label}</span>}
    </label>
  );
}
