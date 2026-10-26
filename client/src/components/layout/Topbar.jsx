import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import UserMenu from './UserMenu';

// Header for the Super Admin / Employee shell. The four direct section links were removed in v45;
// section switching + logout live in the shared UserMenu dropdown (req #1 — same dropdown for all
// three roles). The Switch-section popup also opens once after login (AppLayout).
export default function Topbar({ onMenu, onSwitchSection, collapsed = false, onToggleCollapse }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const roleLabel = user?.role === 'SUPER_ADMIN' ? 'Super Admin'
    : user?.role === 'COMPANY_OWNER' ? 'Company Owner'
    : `Employee · ${user?.employeeType || 'Staff'}`;

  const out = () => { logout(); nav('/login/employee'); };

  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-white/80 px-4 py-3 backdrop-blur sm:px-6 md:px-8">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only: opens the off-canvas drawer */}
        <button onClick={onMenu} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-soft md:hidden" aria-label="Open menu">
          <span className="text-lg leading-none">☰</span>
        </button>
        {/* Collapse/expand toggle — desktop only: hides/shows the sidebar and lets the main content
            use the full width. Accessible label + tooltip reflect the current state. */}
        {onToggleCollapse && (
          <button type="button" onClick={onToggleCollapse}
            className="hidden h-9 w-9 place-items-center rounded-lg border border-line text-ink-soft transition hover:bg-faint focus:outline-none focus:ring-2 focus:ring-brand/40 md:grid"
            aria-label={collapsed ? 'Show sidebar' : 'Hide sidebar'}
            aria-pressed={collapsed}
            title={collapsed ? 'Show sidebar' : 'Hide sidebar'}>
            {collapsed
              // Collapsed → an obvious "open menu / expand" icon (three lines + a right chevron).
              ? <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden="true">
                  <line x1="3" y1="5.5" x2="12" y2="5.5" strokeLinecap="round" />
                  <line x1="3" y1="10" x2="12" y2="10" strokeLinecap="round" />
                  <line x1="3" y1="14.5" x2="12" y2="14.5" strokeLinecap="round" />
                  <path d="M15 7l2.5 3-2.5 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              // Expanded → a "collapse the panel" icon (sidebar panel + a left chevron).
              : <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden="true">
                  <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
                  <line x1="7.5" y1="3.5" x2="7.5" y2="16.5" />
                  <path d="M13.5 7.5L11 10l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>}
          </button>
        )}
      </div>

      <UserMenu user={user} roleLabel={roleLabel} onLogout={out}
        items={[{ label: 'Switch section', icon: '🗂️', onClick: onSwitchSection }]} />
    </header>
  );
}
