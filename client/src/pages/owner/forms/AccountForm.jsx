import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api/client';
import { useAuth } from '../../../context/AuthContext';
import { Tabs } from '../../../components/ui';
import { FieldsGrid } from './formHelpers';
import { useMasterBase } from '../useMasterBase';

// Account Add/Edit — six tabs (requirement #3), in the exact order of the screenshots.
// Reuses the existing `account` master definition and the /owner/masters/account API.
// A single `form` object spans every tab, so values are never lost on tab switch.

const TABS = [
  { key: 'primary', label: 'Primary Information' },
  { key: 'contact', label: 'Contact Information' },
  { key: 'statutory', label: 'Statutory Information' },
  { key: 'additional', label: 'Additional Information' },
  { key: 'tdsForex', label: 'TDS & Forex Information' },
  { key: 'ticket', label: 'Ticket Information' },
];

const TAB_FIELDS = {
  primary: [
    'strAccountName', 'strAccountAlias', 'intGroupID',
    'decAccountOpeningBalance', 'strAccountOpeningType', 'decAccountClosingBalance',
    'intCurrencyID', 'decAccountRateOfExchange', 'decAccountForexAmount',
    'intAccountAnalysisCode', 'strAccountRemark',
    'bitAccountActiveStatus', 'dtAccountKYCDate', 'bitAccountBlackListed',
    'bitMaintainBalanceBillwise', 'strAccountApprovalControl',
    'intAccountCreditLimit', 'intAccountCreditDays',
  ],
  contact: [
    'strAccountAddress', 'intCityID', 'strAccountPostalCode',
    'strAccountPhone', 'strAccountPhoneRes', 'strAccountMobile', 'strAccountFax',
    'strAccountEmail', 'bitAccountAutoemail', 'strAccountWebsite',
    'strAccountLocation', 'strAccountAddressAlternate',
  ],
  statutory: [
    'intNatureofSupplyID', 'tintAccountGSTINType', 'strAccountGSTIN', 'dtAccountGSTINDate',
    'strAccountLegalTradeName', 'bitAccounteCOMOperator', 'strAccounteCOMMerchantID',
    'strAccountReverseChargesPurchase', 'strAccountReverseChargesSales', 'strAccountCenvatCredit',
    'decAccountRefundableTaxPer', 'strAccountTaxNo', 'strAccountDoNotCalTax',
    'tintAccountTaxRoundMethod', 'tintAccountTACRoundMethod', 'strAccountNameofResponsible',
    'strAccountMSMENo', 'strAccountPAN', 'strAccountTAN', 'strAccountAadhar', 'dtAccountBirthDate',
    'bitAccountTDSExempt', 'intAccountTDSLimit', 'decAccountTDSPer', 'tintAccountTDSRoundMethod',
    'decAccountTCSPer', 'tintAccountTCSRoundMethod',
  ],
  additional: [
    'strAccountBank', 'strAccountPerson', 'strAccountPersonMobile',
    'intAccountHandleByID', 'intAccountAllotedToID', 'intAccountSubAgentID', 'intAccountReferenceID',
    'strAccountPrintingName', 'strAccountPrintingNotes',
    'tintAccountPrintDetailAirTax', 'tintAccountPrintDetailOtherTax',
    'tintAccountAgencyType', 'strAccountAgencyCode',
  ],
  tdsForex: [
    'bitAccountIsTDS', 'tintAccountTDSType', 'bitAccountIsForexGainLoss', 'decAccountDepreciationPer',
    'tintAccountForexAgencyType', 'strAccountRBILicenseNo',
    'dtAccountRBILicenseIssueDate', 'dtAccountRBILicenseExpiryDate',
  ],
  ticket: ['strAccountAirCode', 'strAccountAirPrefix', 'bitAccountLCCCarrier', 'strAccountTrainNo'],
};

export default function AccountForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const editing = !!id;

  const [def, setDef] = useState(null);
  const [form, setForm] = useState({});
  const [tab, setTab] = useState('primary');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/owner/masters/account/def').then((r) => setDef(r.data)); }, []);
  useEffect(() => { if (editing) api.get(`/owner/masters/account/${id}`).then((r) => setForm(r.data)); }, [id, editing]);

  const setField = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const base = useMasterBase();
  const backToList = () => nav(`${base}/account`);

  // Any existing field not explicitly placed is shown under the Additional tab so nothing is dropped.
  const remainingKeys = useMemo(() => {
    if (!def) return [];
    const placed = new Set(Object.values(TAB_FIELDS).flat());
    return def.fields.map((f) => f.key).filter((k) => !placed.has(k));
  }, [def]);

  const save = async () => {
    setError(''); setSaving(true);
    try {
      if (editing) await api.put(`/owner/masters/account/${id}`, form);
      else await api.post('/owner/masters/account', form);
      backToList();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save this account.');
      setTab('primary');
    } finally { setSaving(false); }
  };

  if (!def) return <div className="text-ink-muted">Loading…</div>;

  return (
    <div className="pb-24">
      <div className="eyebrow mb-1.5">Master · Account · {editing ? 'Edit' : 'Add'}</div>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <button onClick={backToList} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-brand hover:underline">
          ← Back to Account list
        </button>
        {user?.name && <span className="text-[12.5px] text-ink-muted">Prepare by: <strong className="text-ink-soft">{user.name}</strong></span>}
      </div>
      <h1 className="text-[27px] font-extrabold leading-tight text-ink">{editing ? 'Edit' : 'Add'} Account</h1>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="mt-5 w-full rounded-xl2 border border-line bg-white p-4 shadow-card sm:p-7">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        {/* All tabs stay mounted so entered values never reset on switch; only the active one shows. */}
        {TABS.map((t) => (
          <div key={t.key} className={tab === t.key ? '' : 'hidden'}>
            <FieldsGrid def={def} keys={TAB_FIELDS[t.key]} form={form} setField={setField} editId={id} />
            {t.key === 'additional' && remainingKeys.length > 0 && (
              <>
                <div className="mb-3 mt-7 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Other information</div>
                <FieldsGrid def={def} keys={remainingKeys} form={form} setField={setField} editId={id} />
              </>
            )}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 right-0 left-0 z-40 flex justify-end gap-2.5 border-t border-line bg-white px-4 py-3.5 shadow-[0_-2px_10px_rgba(16,24,40,.08)] sm:px-10 md:left-[264px]">
        <button onClick={backToList} className="btn-ghost">Cancel</button>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Account'}</button>
      </div>
    </div>
  );
}
