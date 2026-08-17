// Shared service form definitions, used by the Retail, B2B and FIT booking flows.

export const FIELDS = {
  FLIGHT: [['from', 'From'], ['to', 'To'], ['flight', 'Flight'], ['travelDate', 'Travel date', 'date'], ['pnr', 'PNR details']],
  HOTEL: [['hotelName', 'Hotel name'], ['checkIn', 'Check-in', 'date'], ['checkOut', 'Check-out', 'date'], ['nights', 'Nights', 'number'], ['roomType', 'Room type'], ['plan', 'Plan'], ['rooms', 'Rooms', 'number'], ['persons', 'Persons', 'number'], ['arrivalDetail', 'Arrival detail'], ['departureDetail', 'Departure detail']],
  CAB: [['hireVehicle', 'Hire vehicle'], ['startFrom', 'Start from'], ['endTo', 'End to'], ['noOfDays', 'No. of days', 'number'], ['arrivalDetail', 'Arrival detail'], ['departureDetail', 'Departure detail'], ['pickupAt', 'Pickup at'], ['pickupDateTime', 'Pickup date/time', 'datetime-local'], ['dropAt', 'Drop at'], ['dropDateTime', 'Drop date/time', 'datetime-local']],
  TAXI: [['hireVehicle', 'Hire vehicle'], ['startFrom', 'Start from'], ['endTo', 'End to'], ['noOfDays', 'No. of days', 'number'], ['pickupAt', 'Pickup at'], ['pickupDateTime', 'Pickup date/time', 'datetime-local'], ['dropAt', 'Drop at'], ['dropDateTime', 'Drop date/time', 'datetime-local']],
  TRAIN: [['trainNo', 'Train no.'], ['trainName', 'Train name'], ['pnr', 'PNR'], ['travelDate', 'Travel date', 'date']],
  BUS: [['busName', 'Bus name (optional)'], ['busNo', 'Bus no. (optional)'], ['pnr', 'PNR'], ['travelDate', 'Travel date', 'date']],
  EVENT: [['eventName', 'Event name'], ['eventDate', 'Date', 'date'], ['location', 'Location'], ['description', 'Description']],
  VISA: [['description', 'Visa details'], ['travelDate', 'Travel date', 'date']],
  REGISTRATION: [['description', 'Registration details'], ['eventDate', 'Date', 'date']],
};

export const ICONS = {
  FLIGHT: '✈', HOTEL: '🏨', CAB: '🚕', TAXI: '🚕', TRAIN: '🚆',
  BUS: '🚌', VISA: '📘', EVENT: '🎪', REGISTRATION: '📋',
};

export const fieldsFor = (name) => FIELDS[(name || '').toUpperCase()] || FIELDS.FLIGHT;
export const iconFor = (name) => ICONS[(name || '').toUpperCase()] || '🧾';

/** Live GST preview for one service line (the real split happens server-side). */
export const gstPreview = (amount, gstPercent) => {
  const amt = Number(amount) || 0;
  const pct = Number(gstPercent) || 0;
  const tax = Math.round(((amt * pct) / 100) * 100) / 100;
  return { amt, pct, tax, total: Math.round((amt + tax) * 100) / 100 };
};
