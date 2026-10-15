import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';

// Shared header user menu (req #1). The logged-in user's name + role opens a dropdown with optional
// items (e.g. "Switch section") and always a Log out action. Used by BOTH the Super Admin / Employee
// header (Topbar) and the Company Owner header so all three roles get the identical dropdown and UI.
// `items` is a list of { label, icon?, onClick }. `onLogout` runs the role-appropriate logout flow.
export default function UserMenu({ user, roleLabel, items = [], onLogout }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const run = (fn) => { setOpen(false); fn?.(); };

  return (
    <div className="relative" ref={boxRef}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}
        className="flex items-center gap-2.5 rounded-xl2 border border-line bg-white px-2.5 py-1.5 text-left transition hover:bg-faint focus:outline-none focus:ring-2 focus:ring-brand/40">
        <Avatar user={user} />
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-[13px] font-bold leading-tight text-ink">{user?.name || 'Account'}</span>
          {roleLabel && <span className="block truncate text-[11px] leading-tight text-ink-muted">{roleLabel}</span>}
        </span>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-1.5 w-52 overflow-hidden rounded-xl2 border border-line bg-white py-1 shadow-pop">
          <div className="border-b border-subtle px-3 py-2 sm:hidden">
            <div className="truncate text-[13px] font-bold text-ink">{user?.name || 'Account'}</div>
            {roleLabel && <div className="truncate text-[11px] text-ink-muted">{roleLabel}</div>}
          </div>
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" onClick={() => run(it.onClick)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13.5px] font-medium text-ink-soft hover:bg-faint">
              {it.icon && <span className="text-base">{it.icon}</span>} {it.label}
            </button>
          ))}
          <button type="button" role="menuitem" onClick={() => run(onLogout)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13.5px] font-medium text-ink-soft hover:bg-faint">
            <span className="text-base">↪</span> Log out
          </button>
        </div>
      )}
    </div>
  );
}

function Avatar({ user }) {
  const apiBase = api.defaults.baseURL.replace(/\/api$/, '');
  const src = user?.profilePic
    ? (user.profilePic.startsWith('http') ? user.profilePic : `${apiBase}${user.profilePic}`)
    : '';
  const initials = (user?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-brand-light text-xs font-bold text-brand">
      {src ? <img src={src} alt={user?.name} className="h-full w-full object-cover" /> : initials}
    </div>
  );
}
