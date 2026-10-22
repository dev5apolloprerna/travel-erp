import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const out = () => { logout(); nav('/login/employee'); };
  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-white/80 px-4 py-3 backdrop-blur sm:px-6 md:px-8">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button onClick={onMenu} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-soft md:hidden" aria-label="Open menu">
          <span className="text-lg leading-none">☰</span>
        </button>
        <div className="text-sm text-ink-muted">
          {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : `Employee · ${user?.employeeType || 'Staff'}`}
        </div>
      </div>
      <button onClick={out} className="btn-ghost btn-sm">Sign out</button>
    </header>
  );
}
