import { useRef, useState } from 'react';
import api from '../../api/client';

/**
 * Upload one image (banner/photo) or many (gallery/slider) to the CMS.
 * Stores and returns the public URL(s).
 */
export default function ImageUpload({ value, values, multiple = false, onChange, label = 'image' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const apiBase = api.defaults.baseURL.replace(/\/api$/, '');
  const src = (u) => (u?.startsWith('http') ? u : `${apiBase}${u}`);
  const list = multiple ? (values || []) : [];

  const pick = async (files) => {
    if (!files?.length) return;
    setBusy(true); setError('');
    try {
      const urls = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await api.post('/cms/images', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        urls.push(res.data.url);
      }
      onChange?.(multiple ? [...list, ...urls] : urls[0]);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (url) => {
    try { await api.delete('/cms/images', { data: { url } }); } catch { /* file may already be gone */ }
    onChange?.(multiple ? list.filter((u) => u !== url) : '');
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {!multiple && value && (
          <Thumb url={src(value)} onRemove={() => remove(value)} />
        )}
        {multiple && list.map((u) => <Thumb key={u} url={src(u)} onRemove={() => remove(u)} />)}

        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
          className="grid h-20 w-28 shrink-0 place-items-center rounded-lg border border-dashed border-line bg-canvas text-xs text-ink-muted transition hover:border-brand hover:text-brand">
          {busy ? 'Uploading…' : `+ Add ${label}`}
        </button>
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple={multiple} className="hidden"
        onChange={(e) => pick(Array.from(e.target.files || []))} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Thumb({ url, onRemove }) {
  return (
    <div className="group relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-line">
      <img src={url} alt="" className="h-full w-full object-cover" />
      <button type="button" onClick={onRemove}
        className="absolute right-1 top-1 hidden rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 group-hover:block">
        Remove
      </button>
    </div>
  );
}
