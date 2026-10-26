import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SectionSwitcher from './SectionSwitcher';
import { AreaProvider } from '../../context/AreaContext';

// One-shot flag set by AuthContext.login() — consumed here so the Switch-Section popup opens once
// right after login and NOT on every refresh/navigation (req #2).
const POST_LOGIN_KEY = 'postLoginSwitch';
// Desktop sidebar collapse preference (shared across the app and owner shells). Kept separate from
// the mobile drawer state so the two never conflict.
const COLLAPSE_KEY = 'sidebarCollapsed';

export default function AppLayout() {
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  const [switcher, setSwitcher] = useState(false);
  const { pathname } = useLocation();
  // close the mobile drawer on navigation
  useEffect(() => { setDrawer(false); }, [pathname]);

  const toggleCollapse = () => setCollapsed((c) => {
    const next = !c;
    try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* non-critical */ }
    return next;
  });

  // Auto-open the section popup exactly once after a successful login.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(POST_LOGIN_KEY)) {
        sessionStorage.removeItem(POST_LOGIN_KEY);
        setSwitcher(true);
      }
    } catch { /* storage unavailable — skip the auto-open */ }
  }, []);

  return (
    <AreaProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Mobile overlay */}
        {drawer && <div className="fixed inset-0 z-30 bg-ink/40 md:hidden" onClick={() => setDrawer(false)} />}
        <Sidebar drawer={drawer} collapsed={collapsed} onClose={() => setDrawer(false)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar onMenu={() => setDrawer(true)} collapsed={collapsed} onToggleCollapse={toggleCollapse} onSwitchSection={() => setSwitcher(true)} />
          <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 md:px-8 md:py-6">
            <Outlet />
          </main>
        </div>
      </div>
      <SectionSwitcher open={switcher} onClose={() => setSwitcher(false)} />
    </AreaProvider>
  );
}
