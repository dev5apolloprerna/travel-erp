import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api/client';
import { useAuth } from '../../../context/AuthContext';
import { Tabs } from '../../../components/ui';
import { FieldsGrid, DetailGrid } from './formHelpers';
import { useMasterBase } from '../useMasterBase';

// Contact Add/Edit — three tabs (requirement #4): Personal / Family / Employee.
// Personal uses the existing `contactHead` master. Family & Employee are repeatable
// child grids (contactFamily / contactEmployee), each persisted and scoped to this head.

const TABS = [
  { key: 'personal', label: 'Personal Information' },
  { key: 'family', label: 'Family Information' },
  { key: 'employee', label: 'Employee Information' },
];

const PERSONAL_FIELDS = [
  'intAccountID', 'tintContactHeadType', 'strContactHeadName',
  'strContactHeadContactNo', 'strContactHeadWhatsAppNumber', 'tintContactHeadGender',
  'strContactHeadEmail', 'strContactHeadAddress',
  'dtContactHeadBirthDate', 'dtContactHeadAnniversaryDate',
  'intProfessionID', 'intReligionID', 'intCityID', 'strContactHeadPostalCode',
  'intReferenceAccountID', 'strContactHeadPassportNo', 'strContactHeadIssuePlace', 'strContactHeadPAN',
  'intNationalityID', 'intProofID',
  'dtContactHeadPassportIssueDate', 'dtContactHeadPassportExpiryDate', 'strContactHeadProofNumber',
  'intContactHeadFoodID', 'strContactHeadFrequentNo', 'dtContactHeadKYCDate',
  'intEmployeeID', 'intVehModelID', 'strContactHeadNotes',
  'intContactHeadFilterID1', 'intContactHeadFilterID2',
];

export default function ContactForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const editing = !!id;

  const [def, setDef] = useState(null);
  const [form, setForm] = useState({});
  const [tab, setTab] = useState('personal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { api.get('/owner/masters/contactHead/def').then((r) => setDef(r.data)); }, []);
  useEffect(() => { if (editing) api.get(`/owner/masters/contactHead/${id}`).then((r) => setForm(r.data)); }, [id, editing]);

  const setField = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const base = useMasterBase();
  const backToList = () => nav(`${base}/contactHead`);

  // Save the head (Personal). On first create, stay on the page in edit mode so the
  // Family / Employee grids become usable against the new record.
  const save = async ({ stay } = {}) => {
    setError(''); setNotice(''); setSaving(true);
    try {
      if (editing) {
        await api.put(`/owner/masters/contactHead/${id}`, form);
        if (!stay) return backToList();
        setNotice('Personal information saved.');
      } else {
        const r = await api.post('/owner/masters/contactHead', form);
        if (stay && r.data?._id) {
          nav(`${base}/contactHead/${r.data._id}/edit`, { replace: true });
          setNotice('Contact created. You can now add family and employee records.');
        } else backToList();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save this contact.');
      setTab('personal');
    } finally { setSaving(false); }
  };

  if (!def) return <div className="text-ink-muted">Loading…</div>;

  return (
    <div className="pb-24">
      <div className="eyebrow mb-1.5">Master · Contact · {editing ? 'Edit' : 'Add'}</div>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <button onClick={backToList} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-brand hover:underline">
          ← Back to Contact list
        </button>
        {user?.name && <span className="text-[12.5px] text-ink-muted">User: <strong className="text-ink-soft">{user.name}</strong></span>}
      </div>
      <h1 className="text-[27px] font-extrabold leading-tight text-ink">{editing ? 'Edit' : 'Add'} Contact</h1>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      {notice && <div className="mt-4 rounded-lg bg-ok-light px-3 py-2 text-sm text-ok">{notice}</div>}

      <div className="mt-5 w-full rounded-xl2 border border-line bg-white p-4 shadow-card sm:p-7">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        <div className={tab === 'personal' ? '' : 'hidden'}>
          <FieldsGrid def={def} keys={PERSONAL_FIELDS} form={form} setField={setField} editId={id} />
        </div>

        {tab === 'family' && (
          <DetailGrid
            masterKey="contactFamily" parentId={editing ? id : null} parentField="intContactHeadID"
            title="Family Member"
            columns={['strFamilyName', 'intRelationID', 'tintFamilyGender', 'strFamilyContactNo', 'strFamilyEmail']}
            savePrompt="Save the contact (Personal Information) first, then you can add family members."
          />
        )}

        {tab === 'employee' && (
          <DetailGrid
            masterKey="contactEmployee" parentId={editing ? id : null} parentField="intContactHeadID"
            title="Employee"
            columns={['strCEmpName', 'intDepartmentID', 'intDesignationID', 'strCEmpContactNo', 'strCEmpEmail']}
            savePrompt="Save the contact (Personal Information) first, then you can add employee records."
          />
        )}
      </div>

      <div className="fixed bottom-0 right-0 left-0 z-40 flex justify-end gap-2.5 border-t border-line bg-white px-4 py-3.5 shadow-[0_-2px_10px_rgba(16,24,40,.08)] sm:px-10 md:left-[264px]">
        <button onClick={backToList} className="btn-ghost">Cancel</button>
        {!editing && <button onClick={() => save({ stay: true })} disabled={saving} className="btn-ghost">{saving ? 'Saving…' : 'Save & add details'}</button>}
        <button onClick={() => save({ stay: false })} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Contact'}</button>
      </div>
    </div>
  );
}
