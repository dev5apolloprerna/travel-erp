import { useEffect, useState } from 'react';
import api from '../../../api/client';
import MasterField from '../MasterField';
import { Modal, Table, EmptyRow, RowActions, Chip } from '../../../components/ui';
import { useConfirm } from '../../../components/ui/ConfirmDialog';

/**
 * Render a set of fields (by key) from a master definition into a responsive grid.
 * Reuses the shared MasterField renderer so every dropdown / date / toggle behaves
 * exactly like the generic MasterForm. Values are never reset on tab switch because
 * the parent form owns a single `form` object across all tabs.
 */
export function FieldsGrid({ def, keys, form, setField, editId }) {
  const byKey = Object.fromEntries((def?.fields || []).map((f) => [f.key, f]));
  return (
    <div className="grid gap-x-[18px] gap-y-4 sm:grid-cols-2">
      {keys.map((k) => {
        const field = byKey[k];
        if (!field) return null;
        return (
          <div key={k} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
            <MasterField field={field} value={form[k]} onChange={setField(k)} excludeId={editId} />
          </div>
        );
      })}
    </div>
  );
}

/**
 * A repeatable child-record grid (Contact Family / Employee, Hotel Room / Season).
 * Lists the parent's children and provides Add / Edit / Delete through a modal that
 * reuses MasterField. All data is real — persisted via the owner master API,
 * scoped to the parent head with `parentId`.
 *
 * Props:
 *  - masterKey   detail master key (e.g. 'contactFamily')
 *  - parentId    saved head id (null until the head is saved)
 *  - parentField fk column on the detail (e.g. 'intContactHeadID')
 *  - title       singular label, e.g. 'Family Member'
 *  - columns     optional list columns override
 *  - savePrompt  message shown when parentId is missing
 */
export function DetailGrid({ masterKey, parentId, parentField, title, columns, savePrompt }) {
  const confirm = useConfirm();
  const [def, setDef] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);     // row being edited, or null for add
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get(`/owner/masters/${masterKey}/def`).then((r) => setDef(r.data)); }, [masterKey]);

  const loadRows = () => {
    if (!parentId) { setRows([]); return; }
    setLoading(true);
    api.get(`/owner/masters/${masterKey}`, { params: { parentId, limit: 200 } })
      .then((r) => setRows(r.data.rows || []))
      .finally(() => setLoading(false));
  };
  useEffect(loadRows, [masterKey, parentId]);

  const cols = columns || def?.listColumns || [];
  const byKey = Object.fromEntries((def?.fields || []).map((f) => [f.key, f]));
  const labelFor = (c) => byKey[c]?.label || c;
  const cell = (row, c) => {
    const field = byKey[c];
    if (field?.type === 'boolean') return <Chip yes={!!row[c]} />;
    if (field?.type === 'ref') return row.__display?.[c] || <span className="text-ink-muted">—</span>;
    const v = row[c];
    if (v === undefined || v === null || v === '') return <span className="text-ink-muted">—</span>;
    if (field?.type === 'date') return String(v).slice(0, 10);
    return String(v);
  };

  const startAdd = () => { setEditRow(null); setForm({}); setError(''); setOpen(true); };
  const startEdit = (row) => { setEditRow(row); setForm({ ...row }); setError(''); setOpen(true); };
  const setField = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError(''); setSaving(true);
    try {
      const payload = { ...form, [parentField]: parentId };
      if (editRow) await api.put(`/owner/masters/${masterKey}/${editRow._id}`, payload);
      else await api.post(`/owner/masters/${masterKey}`, payload);
      setOpen(false);
      loadRows();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save this record.');
    } finally { setSaving(false); }
  };

  const del = async (row) => {
    if (await confirm({ title: `Delete ${title}?`, message: 'This record will be removed.' })) {
      await api.delete(`/owner/masters/${masterKey}/${row._id}`);
      loadRows();
    }
  };

  if (!parentId) {
    return (
      <div className="rounded-xl2 border border-dashed border-line bg-faint px-4 py-8 text-center text-sm text-ink-muted">
        {savePrompt || `Save this record first, then you can add ${title.toLowerCase()} records.`}
      </div>
    );
  }

  // modal fields = every field except the parent fk
  const modalFields = (def?.fields || []).filter((f) => f.key !== parentField);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-ink">{title} list</h3>
        <button onClick={startAdd} className="btn-primary btn-sm">+ Add {title}</button>
      </div>

      <div className="-mx-1 overflow-x-auto">
        <div className="min-w-[560px] px-1">
          <Table head={[...cols.map(labelFor), 'Actions']}>
            {loading && <EmptyRow span={cols.length + 1} text="Loading…" />}
            {!loading && rows.length === 0 && <EmptyRow span={cols.length + 1} text={`No ${title.toLowerCase()} records yet.`} />}
            {!loading && rows.map((row) => (
              <tr key={row._id} className="hover:bg-faint">
                {cols.map((c) => <td key={c} className="td">{cell(row, c)}</td>)}
                <td className="td whitespace-nowrap">
                  <RowActions onEdit={() => startEdit(row)} onDelete={() => del(row)} />
                </td>
              </tr>
            ))}
          </Table>
        </div>
      </div>

      {open && (
        <Modal title={`${editRow ? 'Edit' : 'Add'} ${title}`} onClose={() => setOpen(false)} maxWidth="max-w-5xl">
          {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="grid gap-x-[18px] gap-y-4 sm:grid-cols-2">
            {modalFields.map((field) => (
              <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <MasterField field={field} value={form[field.key]} onChange={setField(field.key)} />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-2.5">
            <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={submit} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editRow ? 'Update' : 'Submit'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Checklist for multi-select fields (Hotel meal plans / facilities / weekend days). */
export function MultiCheck({ label, options, value, onChange, columns = 2 }) {
  const selected = Array.isArray(value) ? value : [];
  const toggle = (v) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <div>
      <label className="label">{label}</label>
      <div className={`max-h-56 overflow-y-auto rounded-lg border border-line bg-white p-2.5`}>
        <div className={`grid gap-1.5 ${columns === 1 ? '' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {options.length === 0 && <span className="text-sm text-ink-muted">No options available.</span>}
          {options.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
              {o.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
