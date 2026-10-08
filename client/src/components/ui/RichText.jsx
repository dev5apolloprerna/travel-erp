import { useEffect, useRef } from 'react';

// Lightweight rich-text editor (contentEditable). Stores HTML as a string.
// No external package — bold / italic / underline / lists / link.
const CMD = [
  ['bold', 'B', 'font-bold'],
  ['italic', 'I', 'italic'],
  ['underline', 'U', 'underline'],
  ['insertUnorderedList', '• List', ''],
  ['insertOrderedList', '1. List', ''],
];

export default function RichText({ value = '', onChange, placeholder = '' }) {
  const ref = useRef(null);

  // Keep the DOM in sync when the value is set from outside (e.g. on edit load),
  // without clobbering the caret while the user is typing.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (cmd) => {
    document.execCommand(cmd, false, null);
    ref.current?.focus();
    onChange?.(ref.current?.innerHTML || '');
  };
  const addLink = () => {
    const url = window.prompt('Link URL');
    if (url) { document.execCommand('createLink', false, url); onChange?.(ref.current?.innerHTML || ''); }
  };

  return (
    <div className="rounded-lg border border-line bg-white">
      <div className="flex flex-wrap gap-1 border-b border-line px-2 py-1.5">
        {CMD.map(([cmd, label, cls]) => (
          <button key={cmd} type="button" onMouseDown={(e) => { e.preventDefault(); exec(cmd); }}
            className={`rounded px-2 py-1 text-xs text-ink-soft hover:bg-faint ${cls}`}>{label}</button>
        ))}
        <button type="button" onMouseDown={(e) => { e.preventDefault(); addLink(); }}
          className="rounded px-2 py-1 text-xs text-ink-soft hover:bg-faint">🔗 Link</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange?.(e.currentTarget.innerHTML)}
        data-placeholder={placeholder}
        className="min-h-[120px] px-3 py-2.5 text-sm text-ink outline-none [&:empty:before]:text-ink-muted/60 [&:empty:before]:content-[attr(data-placeholder)]"
      />
    </div>
  );
}
