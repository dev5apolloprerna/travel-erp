// Service-wise invoice calculators.
// Each service has its OWN charge heads and formula. They share ONLY the common footer:
//   Net = Gross - Discount - TDS - TCS + Govt Tax
// All numeric parsing is null/undefined/''-safe and never concatenates strings.

const n = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const round2 = (v) => Math.round((n(v)) * 100) / 100;

// Common footer applied to every service's grossTotal.
export const applyFooter = (grossTotal, footer = {}) => {
  const discountAmount = n(footer.discountAmount);
  const tdsAmount = n(footer.tdsAmount);
  const tcsAmount = n(footer.tcsAmount);
  const govtTaxAmount = n(footer.govtTaxAmount);
  const netInvoiceAmount = round2(n(grossTotal) - discountAmount - tdsAmount - tcsAmount + govtTaxAmount);
  return { discountAmount, tdsAmount, tcsAmount, govtTaxAmount, netInvoiceAmount };
};

// ---- Per-service charge-head definitions (keys used on the invoice screen) ----
export const SERVICE_CHARGES = {
  FLIGHT: {
    charges: ['basic', 'yqTax', 'yrTax', 'k3Tax', 'ocTax', 'otherTax', 'processingCharges', 'otherCharges'],
    markups: ['markupBasic', 'markupYq', 'markupOther'],
    labels: {
      basic: 'Basic', yqTax: 'YQ Tax', yrTax: 'YR Tax', k3Tax: 'K3 Tax', ocTax: 'OC Tax',
      otherTax: 'Other Tax', processingCharges: 'Processing Charges', otherCharges: 'Other Charges',
      markupBasic: 'Markup Basic', markupYq: 'Markup YQ', markupOther: 'Markup Other',
    },
  },
  BUS: {
    charges: ['basic', 'taxI', 'gateway', 'processingCharges', 'delivery'],
    markups: ['markupBasic', 'markupTaxI', 'markupGateway'],
    labels: {
      basic: 'Basic', taxI: 'Tax I', gateway: 'Gateway', processingCharges: 'Processing Charges', delivery: 'Delivery',
      markupBasic: 'Markup Basic', markupTaxI: 'Markup Tax I', markupGateway: 'Markup Gateway',
    },
  },
  RAILWAY: {
    charges: ['basic', 'irctc', 'gateway', 'taxIII', 'processingCharges', 'delivery'],
    markups: ['markupBasic', 'markupIrctc', 'markupGateway'],
    labels: {
      basic: 'Basic', irctc: 'IRCTC', gateway: 'Gateway', taxIII: 'Tax III',
      processingCharges: 'Processing Charges', delivery: 'Delivery',
      markupBasic: 'Markup Basic', markupIrctc: 'Markup IRCTC', markupGateway: 'Markup Gateway',
    },
  },
  CAB: {
    charges: ['basicAmount', 'borderTax', 'tollParking', 'otherAmount'],
    markups: [],
    labels: { basicAmount: 'Basic Amount', borderTax: 'Border Tax', tollParking: 'Toll & Parking', otherAmount: 'Other Amount' },
  },
  // Event & Visa: no old-software reference — keep a simple flat charge-head model.
  EVENT: {
    charges: ['basic', 'serviceCharge', 'tax'],
    markups: ['markup'],
    labels: { basic: 'Basic', serviceCharge: 'Service Charge', tax: 'Tax', markup: 'Markup' },
  },
  VISA: {
    charges: ['fee', 'serviceCharge', 'tax'],
    markups: ['markup'],
    labels: { fee: 'Visa Fee', serviceCharge: 'Service Charge', tax: 'Tax', markup: 'Markup' },
  },
};
// Railway shares under TRAIN name too.
SERVICE_CHARGES.TRAIN = SERVICE_CHARGES.RAILWAY;
SERVICE_CHARGES.TAXI = SERVICE_CHARGES.CAB;

// Sum a set of head keys from an input object.
const sumHeads = (obj, keys) => round2(keys.reduce((s, k) => s + n(obj[k]), 0));

// ---- HOTEL: per-room calculation ----
// Each room: Room Amount = Rate × Rooms ; Tax Amount = Room Amount × Tax% ; Room Total = sum.
export const hotelCalc = (rooms = [], footer = {}) => {
  const perRoom = (rooms || []).map((r) => {
    const roomAmount = round2(n(r.rate) * n(r.roomCount || r.rooms));
    const taxAmount = round2(roomAmount * (n(r.taxPercent) / 100));
    return { roomAmount, taxAmount, roomTotal: round2(roomAmount + taxAmount) };
  });
  const totalRoomAmount = round2(perRoom.reduce((s, r) => s + r.roomAmount, 0));
  const totalHotelTax = round2(perRoom.reduce((s, r) => s + r.taxAmount, 0));
  const grossTotal = round2(totalRoomAmount + totalHotelTax);
  return { perRoom, totalRoomAmount, totalHotelTax, grossTotal, ...applyFooter(grossTotal, footer) };
};

// ---- Charge+Markup services (Flight, Bus, Railway, Cab, Event, Visa) ----
export const chargeCalc = (serviceType, charges = {}, footer = {}) => {
  const def = SERVICE_CHARGES[(serviceType || '').toUpperCase()] || SERVICE_CHARGES.FLIGHT;
  const chargesTotal = sumHeads(charges, def.charges);
  const markupTotal = sumHeads(charges, def.markups);
  const grossTotal = round2(chargesTotal + markupTotal);
  return { chargesTotal, markupTotal, grossTotal, ...applyFooter(grossTotal, footer) };
};

// Single entry point used by the controller & screen.
export const computeService = (serviceType, payload = {}) => {
  const t = (serviceType || '').toUpperCase();
  if (t === 'HOTEL') return { kind: 'hotel', ...hotelCalc(payload.rooms || [], payload) };
  return { kind: 'charge', serviceType: t, ...chargeCalc(t, payload.charges || {}, payload) };
};
