import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Shown while a Super Admin is viewing the app "as" a Company Owner (req #1).
// Rendered at the app root so it appears in both shells without touching the
// protected OwnerLayout. One explicit click returns to the Super Admin panel.
export default function ImpersonationBanner() {
  const { impersonating, user, returnToAdmin } = useAuth();
  const nav = useNavigate();
  if (!impersonating) return null;

  const back = async () => {
    try { await returnToAdmin(); } finally { nav('/app'); }
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow">
      <span>Viewing as Company Owner{user?.name ? ` — ${user.name}` : ''}</span>
      <button onClick={back} className="rounded-md bg-white/20 px-3 py-1 text-xs font-bold hover:bg-white/30">
        ← Return to Super Admin
      </button>
    </div>
  );
}
