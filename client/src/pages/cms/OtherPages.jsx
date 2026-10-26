import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Field, Input, Table, EmptyRow, Modal } from '../../components/ui';
import RichText from '../../components/ui/RichText';

const MENU = 'cms-other-pages';

// Plain-text preview for the listing: strip HTML tags + decode common entities, collapse whitespace.
const stripHtml = (html = '') => String(html)
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ').trim();

// Website → Other Pages (v58). Static content pages (Privacy Policy, Terms, etc.).
// List with two actions only: View detail (eye) and Edit. No create / delete.
export default function OtherPages() {
  const { can } = useAuth();
  const canEdit = can(MENU, 'EDIT');
  const [rows, setRows] = useState([]);
  const [edit, setEdit] = useState(null);   // { _id, pagename, description }
  const [view, setView] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/cms/other-pages').then((r) => setRows(r.data)).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setError('');
    if (!edit.pagename.trim()) return setError('Page name is required.');
    try {
      await api.put(`/cms/other-pages/${edit._id}`, { pagename: edit.pagename, description: edit.description });
      setEdit(null); load();
    } catch (err) { setError(err.response?.data?.message || 'Could not save the page.'); }
  };

  return (
    <div>
      <PageHeader eyebrow="Website" title="Other Pages" />

      <Table head={['Page name', 'Description', 'Actions']}>
        {rows.length === 0 && <EmptyRow span={3} text="No pages yet." />}
        {rows.map((r) => (
          <tr key={r._id}>
            <td className="td font-medium text-ink">{r.pagename}</td>
            <td className="td max-w-[480px] truncate text-ink-muted">{stripHtml(r.description).slice(0, 120) || '—'}</td>
            <td className="td">
              <div className="flex gap-2">
                {/* View detail (eye) */}
                <button onClick={() => setView(r)} className="btn-ghost btn-sm" title="View detail" aria-label="View detail">👁️</button>
                {/* Edit */}
                {canEdit && (
                  <button onClick={() => { setEdit({ _id: r._id, pagename: r.pagename, description: r.description || '' }); setError(''); }}
                    className="btn-ghost btn-sm" title="Edit" aria-label="Edit">✏️</button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {/* View detail */}
      {view && (
        <Modal title={view.pagename} onClose={() => setView(null)} maxWidth="max-w-2xl">
          <div className="max-h-[65vh] space-y-3 overflow-y-auto">
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Page name</div>
              <div className="text-sm font-medium text-ink">{view.pagename}</div>
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Description</div>
              {view.description
                ? <div className="prose prose-sm max-w-none rounded-lg border border-line bg-faint p-3 text-sm text-ink-soft" dangerouslySetInnerHTML={{ __html: view.description }} />
                : <div className="rounded-lg border border-line bg-faint p-3 text-sm text-ink-muted">—</div>}
            </div>
          </div>
          <div className="mt-4 text-right"><button onClick={() => setView(null)} className="btn-ghost">Close</button></div>
        </Modal>
      )}

      {/* Edit */}
      {edit && (
        <Modal title="Edit page" onClose={() => setEdit(null)} maxWidth="max-w-2xl">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="space-y-3">
            <Field label="Page name *"><Input value={edit.pagename} onChange={(e) => setEdit({ ...edit, pagename: e.target.value })} /></Field>
            <Field label="Description"><RichText value={edit.description} onChange={(html) => setEdit({ ...edit, description: html })} placeholder="Write the page content…" /></Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setEdit(null)} className="btn-ghost">Cancel</button>
            <button onClick={save} className="btn-primary">Save changes</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
