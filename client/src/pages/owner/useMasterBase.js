import { useLocation } from 'react-router-dom';

// The master-engine pages are mounted in two shells:
//   • /owner            — the Company Owner shell (OwnerLayout)
//   • /app/master-data  — the Super Admin panel (AppLayout), req #5
// This returns the correct UI base for the current shell so every in-page link/redirect stays
// inside it — a Super Admin never gets bounced into the Company Owner area, and vice-versa.
// The backend API path (/owner/masters/...) is unchanged; only client navigation is derived here.
export function useMasterBase() {
  const { pathname } = useLocation();
  return pathname.startsWith('/app/master-data') ? '/app/master-data' : '/owner';
}
