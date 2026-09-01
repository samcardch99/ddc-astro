/**
 * Deal model for the /estimate wizard.
 *
 * Every constant is calibrated against DDC's model project at 13325 SW 84th
 * Ave, Pinecrest (RBI Private Lending LOI #19890, Aug 27 2026):
 *
 * - The interest reserve charged at closing equals exactly six months of
 *   full-draw interest: $2,979,700 × 9.5% / 2 = $141,535.75 — the LOI's number.
 * - Loan closing costs decompose into 1.5% origination + 2% broker on the loan
 *   plus $41,617 of fixed fees (underwriting $6,440, draw inspections $2,800,
 *   title & other $32,377): 3.5% × $2,979,700 + $41,617 = $145,906.
 * - Soft costs scale with the construction budget at the model's ratio
 *   ($200,000 per $1.9M of construction).
 *
 * Pure functions only — the DOM wiring lives in scripts/modules/estimate.ts.
 */

export type Funding = 'financed' | 'cash';

export interface ZoneParams {
  key: string;
  /** Zone-average land acquisition, USD. */
  land: number;
  /** Buildable area assumed for the zone, ft². */
  sqft: number;
  /** DDC construction rate for the zone, USD per ft². */
  rate: number;
  /** Target sale price (after-repair value), USD. */
  arv: number;
  /** True when the figures come from the RBI LOI model project. */
  benchmark: boolean;
}

export const RULES = {
  /** Lender-required contingency on the construction budget. */
  contingency: 0.1,
  /** RBI's binding constraint — max loan-to-cost on land + build + contingency. */
  ltc: 0.83,
  /** Interest-only, non-Dutch: charged on the drawn balance. */
  interestRate: 0.095,
  /** Origination 1.5% + broker 2%, both on the loan amount. */
  closingPctOfLoan: 0.035,
  /** Underwriting + draw inspections + title, fixed per the LOI. */
  closingFixed: 41617,
  /** Months 11–12 of interest once the 6-month reserve is exhausted. */
  interestBeyondPctOfLoan: 0.0114,
  /** DDC acquisition fee on the land price. */
  acquisitionPct: 0.03,
  /** Soft costs per construction dollar ($200K per $1.9M in the model). */
  softPerConstructionDollar: 200000 / 1900000,
  /** Taxes, insurance and utilities while the project holds. */
  holdingPerMonth: 3000,
  /** Sale at Certificate of Occupancy, 12 months after permits. */
  months: 12,
  /** 6% brokerage + ~1% closing, paid from sale proceeds. */
  sellingPct: 0.07,
} as const;

export interface Estimate {
  zone: ZoneParams;
  funding: Funding;
  construction: number;
  contingency: number;
  /** Lender cost basis: land + construction + contingency. */
  basis: number;
  soft: number;
  acquisitionFee: number;
  holding: number;
  /** 0 when funding is all cash. */
  loan: number;
  down: number;
  closing: number;
  reserve: number;
  interestBeyond: number;
  /** Everything the investor wires — the cash-on-cash denominator. */
  cashRequired: number;
  netProfit: number;
  cashOnCash: number;
  equityMultiple: number;
}

export function calcEstimate(zone: ZoneParams, funding: Funding): Estimate {
  const construction = zone.sqft * zone.rate;
  const contingency = RULES.contingency * construction;
  const basis = zone.land + construction + contingency;
  const soft = RULES.softPerConstructionDollar * construction;
  const acquisitionFee = RULES.acquisitionPct * zone.land;
  const holding = RULES.holdingPerMonth * RULES.months;

  let loan = 0;
  let down = 0;
  let closing = 0;
  let reserve = 0;
  let interestBeyond = 0;
  let cashRequired: number;

  if (funding === 'financed') {
    loan = RULES.ltc * basis;
    down = basis - loan;
    closing = RULES.closingPctOfLoan * loan + RULES.closingFixed;
    reserve = (loan * RULES.interestRate) / 2;
    interestBeyond = loan * RULES.interestBeyondPctOfLoan;
    cashRequired = down + closing + soft + acquisitionFee + reserve + interestBeyond + holding;
  } else {
    cashRequired = basis + soft + acquisitionFee + holding;
  }

  const netProfit = zone.arv * (1 - RULES.sellingPct) - loan - cashRequired;

  return {
    zone,
    funding,
    construction,
    contingency,
    basis,
    soft,
    acquisitionFee,
    holding,
    loan,
    down,
    closing,
    reserve,
    interestBeyond,
    cashRequired,
    netProfit,
    cashOnCash: netProfit / cashRequired,
    equityMultiple: (netProfit + cashRequired) / cashRequired,
  };
}

/** Profit and cash-on-cash at a given sale price and construction overrun. */
export function profitAt(
  estimate: Estimate,
  salePrice: number,
  overrunPct: number,
): { profit: number; cashOnCash: number } {
  const extra = overrunPct * estimate.construction;
  const invested = estimate.cashRequired + extra;
  const profit = salePrice * (1 - RULES.sellingPct) - estimate.loan - invested;
  return { profit, cashOnCash: profit / invested };
}

/** Sale price at which the project returns capital and nothing more. */
export function breakEvenSale(estimate: Estimate): number {
  return (estimate.loan + estimate.cashRequired) / (1 - RULES.sellingPct);
}

/** Cost of one extra month at full draw (interest + holding). */
export function monthlyDelayCost(estimate: Estimate): number {
  return (estimate.loan * RULES.interestRate) / 12 + RULES.holdingPerMonth;
}
