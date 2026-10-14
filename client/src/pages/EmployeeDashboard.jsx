import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useArea } from '../context/AreaContext';
import { PageHeader, Card } from '../components/ui';
import { availableAreas, visibleMenu } from '../menuConfig';

const ICONS = { website: '🌐', booking: '🧳', account: '🧾', master: '🗂️' };

/** Landing page: pick one of the four sections — Website, Booking, Account, Master.
 *  Only sections the user is authorised for are shown. */
export default function EmployeeDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { setActiveArea } = useArea();
  const areas = availableAreas(user);
  const groups = visibleMenu(user);

  const openArea = (key) => {
    setActiveArea(key);
    const first = groups.find((g) => g.area === key)?.items?.[0];
    nav(first ? first.to : '/app');
  };

  return (
    <div>
      <PageHeader eyebrow={`Welcome${user?.name ? `, ${user.name}` : ''}`} title="Dashboard" />
      <p className="mb-5 text-sm text-ink-muted">Choose a section to get started.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {areas.map((a) => (
          <button key={a.key} type="button" onClick={() => openArea(a.key)} className="text-left">
            <Card className="h-full transition hover:border-brand hover:shadow-pop">
              <div className="mb-2 text-3xl">{ICONS[a.key] || '📁'}</div>
              <div className="text-lg font-extrabold text-ink">{a.label}</div>
              <p className="mt-1 text-sm text-ink-muted">{a.desc}</p>
            </Card>
          </button>
        ))}
        {areas.length === 0 && (
          <Card><p className="text-sm text-ink-muted">You don't have access to any sections yet. Please contact your administrator.</p></Card>
        )}
      </div>
    </div>
  );
}
