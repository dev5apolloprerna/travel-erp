import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { areaForPath } from '../menuConfig';

// Shared "active section" (Website / Booking / Account / Master) for the header selector and the
// sidebar. Replaces the four in-sidebar buttons (v40, req #3).
const AreaContext = createContext(null);
export const useArea = () => useContext(AreaContext) || { activeArea: null, setActiveArea: () => {} };
const AREA_KEY = 'activeArea';

export function AreaProvider({ children }) {
  const { pathname } = useLocation();
  const [activeArea, setActiveArea] = useState(() => {
    try { return areaForPath(pathname) || window.localStorage.getItem(AREA_KEY) || 'booking'; }
    catch { return areaForPath(pathname) || 'booking'; }
  });

  // Keep the active section in step with the current page.
  useEffect(() => {
    const a = areaForPath(pathname);
    if (a && a !== activeArea) setActiveArea(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    try { if (activeArea) window.localStorage.setItem(AREA_KEY, activeArea); } catch { /* non-critical */ }
  }, [activeArea]);

  return <AreaContext.Provider value={{ activeArea, setActiveArea }}>{children}</AreaContext.Provider>;
}
