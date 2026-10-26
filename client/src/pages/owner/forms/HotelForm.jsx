import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api/client';
import { useAuth } from '../../../context/AuthContext';
import { Tabs } from '../../../components/ui';
import { FieldsGrid, DetailGrid, MultiCheck } from './formHelpers';

// Hotel Add/Edit — four tabs (requirement #5): Basic / Room / Season / Terms.
// Basic uses the existing `hotelHead` master (+ additive multi-selects & terms fields).
// Room & Season are repeatable child grids (hotelRoom / hotelSeason), persisted and
// scoped to this hotel head.

const TABS = [
  { key: 'basic', label: 'Basic Information' },
  { key: 'room', label: 'Room Configuration' },
  { key: 'season', label: 'Season Configuration' },
  { key: 'terms', label: 'Terms and Conditions' },
];

const BASIC_FIELDS = [
  'intAccountID', 'intPropertyID', 'tintHotelStarCategory', 'intHotelNoofRoom',
  'strHotelInTime', 'strHotelOutTime', 'tintHotelChildAgeFrom', 'tintHotelChildAgeTo',
  'tintHotelTariffType', 'tintHotelSeasonIncludes', 'tintHotelTaxIn', 'tintHotelWeekEnd',
  'bitHotelActiveStatus',
];

const TERMS_FIELDS = [
  'strHotelIncludes', 'strHotelExcludes', 'strHotelTermsCondition', 'strHotelTCNotes',
  'strHotelCancellationPolicy', 'strHotelRefund', 'strHotelSupplement',
];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  .map((d) => ({ value: d, label: d }));

export default function HotelForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const editing = !!id;

  const [def, setDef] = useState(null);
  const [form, setForm] = useState({});
  const [tab, setTab] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mealPlans, setMealPlans] = useState([]);
  const [facilities, setFacilities] = useState([]);

  useEffect(() => { api.get('/owner/masters/hotelHead/def').then((r) => setDef(r.data)); }, []);
  useEffect(() => { if (editing) api.get(`/owner/masters/hotelHead/${id}`).then((r) => setForm(r.data)); }, [id, editing]);
  useEffect(() => {
    api.get('/owner/masters/mealPlan/options').then((r) => setMealPlans(r.data)).catch(() => setMealPlans([]));
    api.get('/owner/masters/facility/options').then((r) => setFacilities(r.data)).catch(() => setFacilities([]));
  }, []);

  const setField = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const backToList = () => nav('/owner/hotelHead');

  const save = async ({ stay } = {}) => {
    setError(''); setNotice(''); setSaving(true);
    try {
      if (editing) {
        await api.put(`/owner/masters/hotelHead/${id}`, form);
        if (!stay) return backToList();
        setNotice('Basic information saved.');
      } else {
        const r = await api.post('/owner/masters/hotelHead', form);
        if (stay && r.data?._id) {
          nav(`/owner/hotelHead/${r.data._id}/edit`, { replace: true });
          setNotice('Hotel created. You can now add room and season configurations.');
        } else backToList();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save this hotel.');
      setTab('basic');
    } finally { setSaving(false); }
  };

  if (!def) return <div className="text-ink-muted">Loading…</div>;

  return (
    <div className="pb-24">
      <div className="eyebrow mb-1.5">Master · Hotel · {editing ? 'Edit' : 'Add'}</div>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <button onClick={backToList} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-brand hover:underline">
          ← Back to Hotel list
        </button>
        {user?.name && <span className="text-[12.5px] text-ink-muted">User: <strong className="text-ink-soft">{user.name}</strong></span>}
      </div>
      <h1 className="text-[27px] font-extrabold leading-tight text-ink">{editing ? 'Edit' : 'Add'} Hotel</h1>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      {notice && <div className="mt-4 rounded-lg bg-ok-light px-3 py-2 text-sm text-ok">{notice}</div>}

      <div className="mt-5 w-full rounded-xl2 border border-line bg-white p-4 shadow-card sm:p-7">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        {/* Basic */}
        <div className={tab === 'basic' ? '' : 'hidden'}>
          <FieldsGrid def={def} keys={BASIC_FIELDS} form={form} setField={setField} editId={id} />
          <div className="mb-3 mt-7 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Meal Plan & Facilities</div>
          <div className="grid gap-x-[18px] gap-y-4 sm:grid-cols-2">
            <MultiCheck label="Meal Plan (Per Night)" options={mealPlans} value={form.arrHotelMealPlanPerNight} onChange={setField('arrHotelMealPlanPerNight')} />
            <MultiCheck label="Meal Plan (Package)" options={mealPlans} value={form.arrHotelMealPlanPackage} onChange={setField('arrHotelMealPlanPackage')} />
            <MultiCheck label="Facility" options={facilities} value={form.arrHotelFacility} onChange={setField('arrHotelFacility')} />
            <MultiCheck label="Weekend Days" options={WEEKDAYS} value={form.arrHotelWeekendDays} onChange={setField('arrHotelWeekendDays')} />
          </div>
        </div>

        {/* Room Configuration */}
        {tab === 'room' && (
          <DetailGrid
            masterKey="hotelRoom" parentId={editing ? id : null} parentField="intHotelHeadID"
            title="Room Configuration"
            columns={['intRoomTypeID', 'strRoomSharing', 'tintRoomRateFor', 'intRoomSharingCapacity', 'intRoomNoOfRooms']}
            savePrompt="Save the hotel (Basic Information) first, then you can add room configurations."
          />
        )}

        {/* Season Configuration */}
        {tab === 'season' && (
          <DetailGrid
            masterKey="hotelSeason" parentId={editing ? id : null} parentField="intHotelHeadID"
            title="Season Configuration"
            columns={['dtSeasonFrom', 'dtSeasonTo', 'tintSeasonRateFor', 'tintSeasonWeekend', 'decSeasonMealTaxPer']}
            savePrompt="Save the hotel (Basic Information) first, then you can add season configurations."
          />
        )}

        {/* Terms and Conditions */}
        <div className={tab === 'terms' ? '' : 'hidden'}>
          <FieldsGrid def={def} keys={TERMS_FIELDS} form={form} setField={setField} editId={id} />
        </div>
      </div>

      <div className="fixed bottom-0 right-0 left-0 z-40 flex justify-end gap-2.5 border-t border-line bg-white px-4 py-3.5 shadow-[0_-2px_10px_rgba(16,24,40,.08)] sm:px-10 md:left-[264px]">
        <button onClick={backToList} className="btn-ghost">Cancel</button>
        {!editing && <button onClick={() => save({ stay: true })} disabled={saving} className="btn-ghost">{saving ? 'Saving…' : 'Save & add details'}</button>}
        <button onClick={() => save({ stay: false })} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Hotel'}</button>
      </div>
    </div>
  );
}
