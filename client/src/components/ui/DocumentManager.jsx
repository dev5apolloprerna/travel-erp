import { useState } from 'react';
import api from '../../api/client';
import { useConfirm } from './ConfirmDialog';
import { Field, Input, Table, EmptyRow } from './index';

/**
 * Reusable document list + uploader.
 * Used for Retail customers, B2B companies, and FIT DR/members.
 *
 * Props:
 *   docs        current document array
 *   uploadUrl   POST endpoint (multipart: name + file)
 *   deleteUrl   fn(docId) -> DELETE endpoint
 *   onChange    called with the updated array
 *   readOnly    hide the upload/delete controls
 */
export default function DocumentManager({ docs = [], uploadUrl, deleteUrl, onChange, readOnly = false }) {
  const confirm = useConfirm();
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const apiBase = api.defaults.baseURL.replace(/\/api$/, '');
  const fileHref = (url) => (url?.startsWith('http') ? url : `${apiBase}${url}`);

  const submit = async () => {
    if (!file) return setError('Please choose a file to upload.');
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('name', name || file.name);
      fd.append('file', file);
      const res = await api.post(uploadUrl, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onChange?.(res.data);
      setName(''); setFile(null);
      // reset the native file input
      const el = document.getElementById('doc-file-input');
      if (el) el.value = '';
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally { setBusy(false); }
  };

  const remove = async (doc) => {
    if (!(await confirm({ title: 'Delete document?', message: `“${doc.name}” will be permanently removed.` }))) return;
    const res = await api.delete(deleteUrl(doc._id));
    onChange?.(res.data);
  };

  return (
    <div>
      <Table head={readOnly ? ['Document', 'Uploaded', 'File'] : ['Document', 'Uploaded', 'File', 'Actions']}>
        {docs.length === 0 && <EmptyRow span={readOnly ? 3 : 4} text="No documents uploaded yet." />}
        {docs.map((d) => (
          <tr key={d._id}>
            <td className="td font-medium text-ink">{d.name}</td>
            <td className="td">{d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : '—'}</td>
            <td className="td">
              <a href={fileHref(d.fileUrl)} target="_blank" rel="noreferrer" className="text-brand hover:underline">View / Download</a>
            </td>
            {!readOnly && (
              <td className="td"><button onClick={() => remove(d)} className="btn-danger btn-sm">Delete</button></td>
            )}
          </tr>
        ))}
      </Table>

      {!readOnly && (
        <div className="mt-4 rounded-lg border border-line bg-canvas p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-3">Upload document</div>
          {error && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <Field label="Document name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PAN Card, Passport, Agreement" />
              </Field>
            </div>
            <div className="min-w-[200px] flex-1">
              <Field label="File (PDF / image / doc — max 10MB)">
                <input id="doc-file-input" type="file" onChange={(e) => setFile(e.target.files[0])}
                  className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-sm" />
              </Field>
            </div>
            <button onClick={submit} disabled={busy} className="btn-primary">{busy ? 'Uploading…' : 'Upload'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
