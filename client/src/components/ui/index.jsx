// Small shared UI primitives used across all modules.

export function PageHeader({ eyebrow, title, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <div className="text-xs font-semibold uppercase tracking-widest text-accent-dark">{eyebrow}</div>}
        <h1 className="mt-1 text-2xl font-bold text-ink">{title}</h1>
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      {title && <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</div>}
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
    <div className="card overflow-hidden">
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

// Modal shell
export function Modal({ title, children, onClose, maxWidth = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div className={`card w-full ${maxWidth} p-6`} onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="mb-4 text-xl font-bold text-ink">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
