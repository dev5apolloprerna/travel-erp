import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useArea } from '../../context/AreaContext';
import { availableAreas, visibleMenu } from '../../menuConfig';

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { activeArea, setActiveArea } = useArea();
  const areas = availableAreas(user);
  const groups = visibleMenu(user);
  const out = () => { logout(); nav('/login/employee'); };

  // Compact section selector (req #3) — replaces the four buttons that were inside the sidebar.
  const pick = (key) => {
    setActiveArea(key);
    const first = groups.find((g) => g.area === key)?.items?.[0];
    if (first) nav(first.to);
  };

  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-white/80 px-4 py-3 backdrop-blur sm:px-6 md:px-8">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button onClick={onMenu} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-soft md:hidden" aria-label="Open menu">
          <span className="text-lg leading-none">☰</span>
        </button>

        {/* Section selector: segmented control on wider screens, dropdown on small screens. */}
        {areas.length > 0 && (
          <>
            <div className="hidden items-center gap-1 rounded-xl2 border border-line bg-canvas p-1 sm:flex">
              {areas.map((a) => (
                <button key={a.key} type="button" onClick={() => pick(a.key)}
                  aria-pressed={activeArea === a.key}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand/40 ${
                    activeArea === a.key ? 'bg-brand text-white shadow-sm' : 'text-ink-soft hover:bg-white'}`}>
                  {a.label}
                </button>
              ))}
            </div>
            <label className="sm:hidden">
              <span className="sr-only">Section</span>
              <select value={activeArea || ''} onChange={(e) => pick(e.target.value)}
                className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm font-semibold text-ink-soft">
                {areas.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
            </label>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-sm text-ink-muted sm:block">
          {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role === 'COMPANY_OWNER' ? 'Company Owner' : `Employee · ${user?.employeeType || 'Staff'}`}
        </div>
        <button onClick={out} className="btn-ghost btn-sm">Sign out</button>
      </div>
    </header>
  );
}
