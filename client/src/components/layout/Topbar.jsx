import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import UserMenu from './UserMenu';

// Header for the Super Admin / Employee shell. The four direct section links were removed in v45;
// section switching + logout live in the shared UserMenu dropdown (req #1 — same dropdown for all
// three roles). The Switch-section popup also opens once after login (AppLayout).
export default function Topbar({ onMenu, onSwitchSection }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const roleLabel = user?.role === 'SUPER_ADMIN' ? 'Super Admin'
    : user?.role === 'COMPANY_OWNER' ? 'Company Owner'
    : `Employee · ${user?.employeeType || 'Staff'}`;

  const out = () => { logout(); nav('/login/employee'); };

  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-white/80 px-4 py-3 backdrop-blur sm:px-6 md:px-8">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button onClick={onMenu} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-soft md:hidden" aria-label="Open menu">
          <span className="text-lg leading-none">☰</span>
        </button>
      </div>

      <UserMenu user={user} roleLabel={roleLabel} onLogout={out}
        items={[{ label: 'Switch section', icon: '🗂️', onClick: onSwitchSection }]} />
    </header>
  );
}
