// Per-service booking form definitions, matching the ePrompt entry screens.
// Each service maps a field list; the booking flows render these dynamically.
// Orders capture booking DETAILS ONLY — no price or tax (those move to invoice generation).

// field: [key, label, type?, options?]
// type defaults to 'text'. Supported: text, date, number, select, checkbox
const FLIGHT = [
  ['airline', 'Airline'],
  ['fromStock', 'From Stock?', 'select', ['', 'Yes', 'No']],
  ['pnrFrom', 'PNR From?', 'mref', 'cRS'],
  ['ticketNo', 'Ticket No.'],
  ['airlinePnr', 'Airline PNR'],
  ['crsPnr', 'CRS PNR'],
  ['documentNo', 'Document No.'],
  ['travelDate', 'Travel Date', 'date'],
  ['sectorFrom', 'Sector From'],
  ['sectorTo', 'Sector To'],
  ['class', 'Class'],
  ['flightNo', 'Flight No.'],
  ['fareBasis', 'Fare Basis'],
];

const RAILWAY = [
  ['train', 'Train'],
  ['status', 'Status', 'select', ['Confirm', 'RAC', 'Waitlist', 'Tatkal']],
  ['quota', 'Quota', 'select', ['General', 'Tatkal', 'Ladies', 'Senior Citizen', 'Premium Tatkal']],
  ['ticketNo', 'Ticket No.'],
  ['railwayPnr', 'Railway PNR'],
  ['coachNo', 'Coach No.'],
  ['seatNo', 'Seat No.'],
  ['documentNo', 'Document No.'],
  ['travelDate', 'Travel Date', 'date'],
  ['sectorFrom', 'Sector From'],
  ['sectorTo', 'Sector To'],
  ['class', 'Class'],
  ['trainNo', 'Train No.'],
  ['boardingAt', 'Boarding At'],
];

// Bus — same layout as railway, worded for buses.
const BUS = [
  ['bus', 'Bus'],
  ['busType', 'Bus Type', 'mref', 'busType'],
  ['status', 'Status', 'select', ['Confirm', 'RAC', 'Waitlist', 'Tatkal']],
  ['ticketNo', 'Ticket No.'],
  ['busPnr', 'Bus PNR'],
  ['seatNo', 'Seat No.'],
  ['documentNo', 'Document No.'],
  ['travelDate', 'Travel Date', 'date'],
  ['sectorFrom', 'Sector From'],
  ['sectorTo', 'Sector To'],
  ['class', 'Class'],
  ['busNo', 'Bus No.'],
  ['boardingAt', 'Boarding At'],
];

// Event — its own simple form.
const EVENT = [
  ['eventTitle', 'Event Title'],
  ['eventDescription', 'Event Description'],
  ['country', 'Country'],
  ['remarks', 'Remarks'],
];

// Visa — four fields.
const VISA = [
  ['visaCountry', 'Visa Country'],
  ['visaType', 'Visa Type', 'select', ['New', 'Renewal']],
  ['visaYears', 'Visa Years'],
  ['remarks', 'Remarks'],
];

// Cab — based on the ePrompt Transport Voucher (booking details only; amounts move to invoice).
const CAB = [
  ['serviceProvider', 'Service Provider'],
  ['guestName', 'Name of Guest'],
  ['forPackageInvoice', 'For Package Invoice?', 'select', ['', 'Yes', 'No']],
  ['paymentType', 'Payment', 'select', ['Direct payment', 'Credit', 'Advance']],
  ['adults', 'Adults', 'number'],
  ['children', 'Children', 'number'],
  ['infants', 'Infants', 'number'],
  ['startFrom', 'Start From', 'date'],
  ['endTo', 'End To', 'date'],
  ['days', 'No. of Days', 'number'],
  ['vehicle', 'Vehicle', 'mref', 'veh'],
  ['vehicleType', 'Type', 'select', ['AC', 'Non-AC']],
  ['tripType', 'Trip Type', 'select', ['Local', 'Outstation', 'Transfer']],
  ['noOfVehicles', 'No. of Vehicle', 'number'],
  ['kmsAllowed', 'Km(s) Allowed', 'number'],
  ['pickupFrom', 'Pick-up From'],
  ['dropAt', 'Drop At'],
  ['route', 'Route'],
  ['arrivalDetail', 'Arrival Detail'],
  ['departureDetail', 'Departure Detail'],
  ['inclusive', 'Inclusive'],
  ['confirmationBy', 'Confirmation By'],
  ['confirmationNo', 'Confirmation No.'],
  ['billingInstructions', 'Billing Instructions'],
  ['cnclDeadline', 'CNCL Deadline', 'date'],
  ['paymentDeadline', 'Payment Deadline', 'date'],
];

// Hotel has a repeatable room-row section handled specially in the form component.
const HOTEL = [
  ['hotelName', 'Hotel Name'],
  ['guestName', 'Name of Guest'],
  ['forPackageInvoice', 'For Package Invoice?', 'select', ['', 'Yes', 'No']],
  ['adults', 'Adults', 'number'],
  ['children', 'Children', 'number'],
  ['infants', 'Infants', 'number'],
  ['checkIn', 'Check In', 'date'],
  ['checkOut', 'Check Out', 'date'],
  ['nights', 'No. of Nights', 'number'],
  ['confirmationBy', 'Confirmation By'],
  ['confirmationNo', 'Confirmation No.'],
  ['cnclDeadline', 'CNCL Deadline', 'date'],
  ['paymentDeadline', 'Payment Deadline', 'date'],
  ['billingInstructions', 'Billing Instructions'],
];

// Generic fallback for services whose bespoke form hasn't been designed yet.
const GENERIC = [
  ['description', 'Details'],
  ['travelDate', 'Date', 'date'],
];

// Map by service NAME (upper-cased). Bus shares the railway form.
export const SERVICE_FORMS = {
  FLIGHT,
  RAILWAY,
  TRAIN: RAILWAY,
  BUS,
  EVENT,
  VISA,
  CAB,
  TAXI: CAB,
  HOTEL,
};

// Which services use the repeatable hotel-room section
export const HOTEL_LIKE = new Set(['HOTEL']);

export const formFor = (serviceName) => SERVICE_FORMS[(serviceName || '').toUpperCase()] || GENERIC;
export const isHotelLike = (serviceName) => HOTEL_LIKE.has((serviceName || '').toUpperCase());

export const ICONS = {
  FLIGHT: '✈', HOTEL: '🏨', CAB: '🚕', TAXI: '🚕', TRAIN: '🚆',
  RAILWAY: '🚆', BUS: '🚌', VISA: '📘', EVENT: '🎪', REGISTRATION: '📋',
  TRANSPORT: '🚐', EXCURSION: '🗺️',
};
export const iconFor = (name) => ICONS[(name || '').toUpperCase()] || '🧾';
