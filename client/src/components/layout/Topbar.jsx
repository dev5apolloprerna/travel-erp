import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const out = () => { logout(); nav('/login/employee'); };
  return (
    <header className="flex items-center justify-between border-b border-line bg-white/80 px-8 py-3 backdrop-blur">
      <div className="text-sm text-ink-muted">
        {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : `Employee · ${user?.employeeType || 'Staff'}`}
      </div>
      <button onClick={out} className="btn-ghost btn-sm">Sign out</button>
    </header>
  );
}
