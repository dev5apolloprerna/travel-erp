// v25 — Tabbed Account/Contact/Hotel forms (requirements #3/#4/#5).
//
// Two additive, backward-compatible changes applied on top of the generated MASTERS:
//   1) A handful of fields visible in the reference screenshots that the head masters
//      did not yet carry (Account: currency / opening-balance / forex; Hotel: meal-plan /
//      facility multi-selects + terms textareas). These are APPENDED to the existing
//      field list — no existing field is renamed or removed.
//   2) Four NEW detail masters for the repeatable grids shown in the screenshots:
//      contactFamily, contactEmployee (children of a Contact head) and
//      hotelRoom, hotelSeason (children of a Hotel head). They are stored the same way
//      as every other master (an `me_<key>` collection) and reuse the whole owner CRUD
//      pipeline. They are marked `hidden` so they never appear as standalone masters,
//      and carry a `parentField` so the list endpoint can scope them to their parent.
//
// Nothing here touches the protected OwnerLayout.jsx / MasterForm.jsx on the client.

import { MASTERS } from './masterDefs.js';
import './masterOverrides.js';   // ensure v17 overrides run first

// ---- small field builders -------------------------------------------------
const f = (key, label, type = 'text', extra = {}) => ({ key, label, type, ...extra });
const ref = (key, label, refKey, extra = {}) => ({ key, label, type: 'ref', ref: refKey, ...extra });
const enumf = (key, label, options, extra = {}) => ({ key, label, type: 'enum', options, ...extra });

const GENDER = ['Male', 'Female', 'Other'];
const RATE_FOR = ['Per Night', 'Per Package'];
const YES_NO = ['Yes', 'No'];

// Append a field to a master only if it is not already present (idempotent, safe to re-run).
const appendFields = (masterKey, fields) => {
  const m = MASTERS[masterKey];
  if (!m) return;
  for (const field of fields) {
    if (!m.fields.some((x) => x.key === field.key)) m.fields.push(field);
  }
};

// ---------------------------------------------------------------------------
// 1) Account — Primary-tab fields not present in the generated schema.
//    (Currency, Opening/Closing balance, Rate of Exchange, Forex Amount,
//     Opening Type, Approval Control.) All additive.
// ---------------------------------------------------------------------------
appendFields('account', [
  ref('intCurrencyID', 'Currency', 'currency'),
  f('decAccountOpeningBalance', 'Opening Balance', 'number'),
  enumf('strAccountOpeningType', 'Opening Type', ['Debit', 'Credit']),
  f('decAccountClosingBalance', 'Closing Balance', 'number'),
  f('decAccountRateOfExchange', 'Rate of Exchange', 'number'),
  f('decAccountForexAmount', 'Forex Amount', 'number'),
  f('strAccountApprovalControl', 'Approval Control', 'text'),
]);

// ---------------------------------------------------------------------------
// 2) Hotel — Basic-tab multi-selects + Terms & Conditions textareas.
//    Meal plan / facility options come from the existing mealPlan & facility
//    masters (loaded dynamically on the client), so nothing is invented here.
// ---------------------------------------------------------------------------
appendFields('hotelHead', [
  // multi-selects (arrays of ids/labels) — rendered as checklists on the client
  f('arrHotelMealPlanPerNight', 'Meal Plan (Per Night)', 'multiselect'),
  f('arrHotelMealPlanPackage', 'Meal Plan (Package)', 'multiselect'),
  f('arrHotelFacility', 'Facility', 'multiselect'),
  f('arrHotelWeekendDays', 'Weekend Days', 'multiselect'),
  // Terms & Conditions tab
  f('strHotelIncludes', 'Includes', 'textarea'),
  f('strHotelExcludes', 'Excludes', 'textarea'),
  f('strHotelTermsCondition', 'Terms and Condition', 'textarea'),
  f('strHotelTCNotes', 'Notes', 'textarea'),
  f('strHotelCancellationPolicy', 'Cancellation Policy', 'textarea'),
  f('strHotelRefund', 'Refund', 'textarea'),
  f('strHotelSupplement', 'Supplement', 'textarea'),
]);

// ---------------------------------------------------------------------------
// 2b) Employee form unification (req #1/#6). The Company Owner and the Super Admin
//     now use the SAME single Employee form — the login-User "Team / Employees"
//     form (which already carries the HR/personal fields). The old HR-only
//     `employee` wireframe master is therefore hidden from the Company Owner catalog
//     so there is no second, differently-designed Employee form. Its data is kept and
//     it stays usable as a dropdown source (e.g. Contact → Preferred Driver); only its
//     standalone form/menu entry is retired.
// ---------------------------------------------------------------------------
if (MASTERS.employee) MASTERS.employee.hidden = true;

// ---------------------------------------------------------------------------
// 3) New detail masters (hidden; parent-scoped).
// ---------------------------------------------------------------------------
const DETAILS = {
  // Contact → Family Information (image: Family Add/Edit popup)
  contactFamily: {
    key: 'contactFamily', label: 'Family Member', menu: 'Contact',
    table: 'tblContactFamilyDetail', pk: 'intContactFamilyID', titleField: 'strFamilyName',
    hidden: true, parentField: 'intContactHeadID',
    listColumns: ['strFamilyName', 'intRelationID', 'strFamilyContactNo', 'strFamilyEmail'],
    fields: [
      ref('intContactHeadID', 'Contact', 'contactHead'),
      f('strFamilyName', 'Name', 'text', { required: true }),
      enumf('tintFamilyGender', 'Gender', GENDER),
      ref('intRelationID', 'Relation', 'relation'),
      ref('intProfessionID', 'Profession', 'profession'),
      f('strFamilyContactNo', 'Contact No.', 'text'),
      f('strFamilyEmail', 'e-mail', 'text'),
      f('dtFamilyBirthDate', 'Birth Date', 'date'),
      f('dtFamilyAnniversaryDate', 'Anniversary Date', 'date'),
      ref('intFoodID', 'Prefered Food', 'food'),
      f('strFamilyPassportNo', 'Passport No.', 'text'),
      f('strFamilyIssuePlace', 'Issue Place', 'text'),
      ref('intNationalityID', 'Nationality', 'nationality'),
      f('dtFamilyIssueDate', 'Issue Date', 'date'),
      f('dtFamilyExpiryDate', 'Expiry Date', 'date'),
    ],
  },

  // Contact → Employee Information (image: Employee Add/Edit popup)
  contactEmployee: {
    key: 'contactEmployee', label: 'Employee', menu: 'Contact',
    table: 'tblContactEmployeeDetail', pk: 'intContactEmployeeID', titleField: 'strCEmpName',
    hidden: true, parentField: 'intContactHeadID',
    listColumns: ['strCEmpName', 'intDepartmentID', 'intDesignationID', 'strCEmpContactNo'],
    fields: [
      ref('intContactHeadID', 'Contact', 'contactHead'),
      f('strCEmpName', 'Name', 'text', { required: true }),
      f('strCEmpAddress', 'Address', 'textarea'),
      enumf('tintCEmpGender', 'Gender', GENDER),
      ref('intDepartmentID', 'Department', 'department'),
      ref('intDesignationID', 'Designation', 'designation'),
      f('strCEmpContactNo', 'Contact No.', 'text'),
      f('strCEmpEmail', 'e-mail', 'text'),
      f('dtCEmpBirthDate', 'Birth Date', 'date'),
      f('dtCEmpAnniversaryDate', 'Anniversary Date', 'date'),
      ref('intFoodID', 'Prefered Food', 'food'),
      f('strCEmpPassportNo', 'Passport No.', 'text'),
      f('strCEmpIssuePlace', 'Issue Place', 'text'),
      ref('intNationalityID', 'Nationality', 'nationality'),
      f('dtCEmpIssueDate', 'Issue Date', 'date'),
      f('dtCEmpExpiryDate', 'Expiry Date', 'date'),
      f('strCEmpNotes', 'Notes', 'textarea'),
    ],
  },

  // Hotel → Room Configuration (image: Room Config Add/Edit)
  hotelRoom: {
    key: 'hotelRoom', label: 'Room Configuration', menu: 'Tour',
    table: 'tblHotelRoomDetail', pk: 'intHotelRoomID', titleField: 'intRoomTypeID',
    hidden: true, parentField: 'intHotelHeadID',
    listColumns: ['intRoomTypeID', 'strRoomSharing', 'intRoomSharingCapacity', 'intRoomNoOfRooms'],
    fields: [
      ref('intHotelHeadID', 'Hotel', 'hotelHead'),
      ref('intRoomTypeID', 'Room Type', 'roomType', { required: true }),
      enumf('strRoomSharing', 'Sharing', ['Both', 'Single', 'Double', 'Triple']),
      enumf('tintRoomRateFor', 'Rate for', RATE_FOR),
      f('intRoomSharingCapacity', 'Sharing Capacity', 'number'),
      f('intRoomNoOfPackage', 'No. of Package', 'number'),
      f('intRoomNoOfRooms', 'No. of Room/s', 'number'),
      f('strRoomNotes', 'Notes', 'text'),
      f('intRoomDisplayOrder', 'Display Order', 'number'),
    ],
  },

  // Hotel → Season Configuration (image: Season Config Add/Edit)
  hotelSeason: {
    key: 'hotelSeason', label: 'Season Configuration', menu: 'Tour',
    table: 'tblHotelSeasonDetail', pk: 'intHotelSeasonID', titleField: 'dtSeasonFrom',
    hidden: true, parentField: 'intHotelHeadID',
    listColumns: ['dtSeasonFrom', 'dtSeasonTo', 'tintSeasonRateFor', 'tintSeasonWeekend'],
    fields: [
      ref('intHotelHeadID', 'Hotel', 'hotelHead'),
      f('dtSeasonFrom', 'From', 'date', { required: true }),
      f('dtSeasonTo', 'To', 'date'),
      enumf('tintSeasonRateFor', 'Rate for', RATE_FOR),
      enumf('tintSeasonWeekend', 'Weekend', YES_NO),
      // Meal rates
      f('decSeasonAdultBreakfast', 'Adult Breakfast', 'number'),
      f('decSeasonAdultLunch', 'Adult Lunch', 'number'),
      f('decSeasonAdultDinner', 'Adult Dinner', 'number'),
      f('decSeasonChildBreakfast', 'Child Breakfast', 'number'),
      f('decSeasonChildLunch', 'Child Lunch', 'number'),
      f('decSeasonChildDinner', 'Child Dinner', 'number'),
      f('decSeasonMealTaxPer', 'Meal Tax %', 'number'),
      // Commission % Received
      f('decSeasonCommSingle', 'Commission Single', 'number'),
      f('decSeasonCommDouble', 'Commission Double', 'number'),
      f('decSeasonCommExtraAdult', 'Commission Extra Adult', 'number'),
      f('decSeasonCommChildWB', 'Commission Child WB', 'number'),
      f('decSeasonCommChildNB', 'Commission Child NB', 'number'),
      // Discount % Paid
      f('decSeasonDiscSingle', 'Discount Single', 'number'),
      f('decSeasonDiscDouble', 'Discount Double', 'number'),
      f('decSeasonDiscExtraAdult', 'Discount Extra Adult', 'number'),
      f('decSeasonDiscChildWB', 'Discount Child WB', 'number'),
      f('decSeasonDiscChildNB', 'Discount Child NB', 'number'),
      f('strSeasonNotes', 'Notes', 'textarea'),
    ],
  },
};

for (const [key, def] of Object.entries(DETAILS)) {
  if (!MASTERS[key]) MASTERS[key] = def;
}

export { MASTERS };
