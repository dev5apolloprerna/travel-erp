import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useArea } from '../../context/AreaContext';
import { availableAreas, visibleMenu } from '../../menuConfig';

const ICONS = { website: '🌐', booking: '🧳', account: '🧾', master: '🗂️', reports: '📊' };

// Reusable Switch-Section popup (req #1/#2). Opened from the header profile dropdown AND once
// automatically after login — one component, one source of truth for the section list + routing.
// Only sections the signed-in user is authorised for are shown (availableAreas), so the user is
// never sent to a page their role/permissions don't allow. Existing authorization middleware still
// guards the destinations.
export default function SectionSwitcher({ open, onClose }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { setActiveArea } = useArea();
  if (!open) return null;

  const areas = availableAreas(user);
  const groups = visibleMenu(user);

  const pick = (key) => {
    setActiveArea(key);
    const first = groups.find((g) => g.area === key)?.items?.[0];
    nav(first ? first.to : '/app');
    onClose?.();
  };

  return (
    <Modal title="Switch section" onClose={onClose} maxWidth="max-w-xl">
      {areas.length === 0 ? (
        <p className="text-sm text-ink-muted">You don't have access to any sections yet. Please contact your administrator.</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-ink-muted">Choose the section you want to work in.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {areas.map((a) => (
              <button key={a.key} type="button" onClick={() => pick(a.key)}
                className="rounded-xl2 border border-line bg-white p-4 text-left shadow-card transition hover:border-brand hover:shadow-pop focus:outline-none focus:ring-2 focus:ring-brand/40">
                <div className="mb-1 text-2xl">{ICONS[a.key] || '📁'}</div>
                <div className="text-base font-extrabold text-ink">{a.label}</div>
                <p className="mt-0.5 text-[13px] text-ink-muted">{a.desc}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
