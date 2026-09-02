import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const [drawer, setDrawer] = useState(false);
  const { pathname } = useLocation();
  // close the mobile drawer on navigation
  useEffect(() => { setDrawer(false); }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {drawer && <div className="fixed inset-0 z-30 bg-ink/40 md:hidden" onClick={() => setDrawer(false)} />}
      <Sidebar drawer={drawer} onClose={() => setDrawer(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenu={() => setDrawer(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 md:px-8 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
