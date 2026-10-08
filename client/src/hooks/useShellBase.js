import { useLocation } from 'react-router-dom';

// The pages under Retail / B2B / Admin / Invoice are reused by two shells:
//   - the Super Admin / Employee shell  (routes under /app)
//   - the Company Owner shell            (routes under /owner)
// This hook returns the current shell's base path so a page's own navigation
// (Links, nav(), back buttons) stays inside the shell it is being viewed in,
// instead of hard-jumping a Company Owner into the /app (Super Admin) layout.
export function useShellBase() {
  const { pathname } = useLocation();
  return pathname.startsWith('/owner') ? '/owner' : '/app';
}
