// GST helpers.
// Intra-state (customer state == company home state) -> CGST + SGST (half each)
// Inter-state                                        -> IGST (full)

const norm = (s) => (s || '').trim().toLowerCase();

export const isInterState = (companyState, partyState) => {
  if (!companyState || !partyState) return false; // default to intra-state (CGST+SGST)
  return norm(companyState) !== norm(partyState);
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Calculate GST for one service line.
 * @param {number} amount      taxable value
 * @param {number} gstPercent  e.g. 5, 12, 18
 * @param {boolean} interState true -> IGST, false -> CGST+SGST
 */
export const calcLineGst = (amount, gstPercent, interState) => {
  const taxable = round2(amount);
  const pct = Number(gstPercent) || 0;
  const gstAmount = round2((taxable * pct) / 100);

  const cgst = interState ? 0 : round2(gstAmount / 2);
  const sgst = interState ? 0 : round2(gstAmount - cgst); // avoids rounding drift
  const igst = interState ? gstAmount : 0;

  return {
    taxableAmount: taxable,
    gstPercent: pct,
    cgst, sgst, igst,
    totalWithGst: round2(taxable + cgst + sgst + igst),
  };
};

/**
 * Apply GST to all service lines and return totals for the order.
 * Mutates each line with its GST fields.
 */
export const applyGstToServices = (services = [], interState = false) => {
  let subTotal = 0, cgstTotal = 0, sgstTotal = 0, igstTotal = 0;

  const lines = services.map((line) => {
    const g = calcLineGst(line.amount, line.gstPercent, interState);
    subTotal += g.taxableAmount;
    cgstTotal += g.cgst;
    sgstTotal += g.sgst;
    igstTotal += g.igst;
    return { ...line, ...g };
  });

  const gstTotal = round2(cgstTotal + sgstTotal + igstTotal);
  return {
    services: lines,
    subTotal: round2(subTotal),
    cgstTotal: round2(cgstTotal),
    sgstTotal: round2(sgstTotal),
    igstTotal: round2(igstTotal),
    gstTotal,
    totalAmount: round2(round2(subTotal) + gstTotal),
  };
};
