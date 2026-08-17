import { useRef, useState } from 'react';
import api from '../../api/client';

/**
 * Avatar with upload / remove. Works for any user type.
 * `userId` omitted -> the logged-in user's own picture.
 */
export default function ProfilePicUpload({ value, userId, name = '', onChange, size = 96 }) {
  const [pic, setPic] = useState(value || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const apiBase = api.defaults.baseURL.replace(/\/api$/, '');
  const src = pic ? (pic.startsWith('http') ? pic : `${apiBase}${pic}`) : '';
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const endpoint = userId ? `/auth/profile-pic/${userId}` : '/auth/profile-pic';

  const pick = () => inputRef.current?.click();

  const upload = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) return setError('Please choose an image file.');
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post(endpoint, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPic(res.data.profilePic);
      onChange?.(res.data.profilePic);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.');
    } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true); setError('');
    try {
      await api.delete(endpoint);
      setPic('');
      onChange?.('');
    } catch {
      setError('Could not remove the picture.');
    } finally { setBusy(false); }
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className="grid shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-brand-light font-bold text-brand"
        style={{ width: size, height: size, fontSize: size / 3 }}
      >
        {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials}
      </div>

      <div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => upload(e.target.files[0])} />
        <div className="flex gap-2">
          <button type="button" onClick={pick} disabled={busy} className="btn-primary btn-sm">
            {busy ? 'Uploading…' : pic ? 'Change photo' : 'Upload photo'}
          </button>
          {pic && <button type="button" onClick={remove} disabled={busy} className="btn-ghost btn-sm">Remove</button>}
        </div>
        <p className="mt-1 text-xs text-ink-muted">JPG or PNG, up to 10MB.</p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
