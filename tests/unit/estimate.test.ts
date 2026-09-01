import { describe, expect, it } from 'vitest';
import zones from '../../src/data/zones.json';
import {
  breakEvenSale,
  calcEstimate,
  monthlyDelayCost,
  profitAt,
  RULES,
  type ZoneParams,
} from '../../src/lib/estimate';

const pinecrest = zones.pinecrest as ZoneParams;

describe('calcEstimate — financed, Pinecrest (RBI LOI #19890 calibration)', () => {
  const est = calcEstimate(pinecrest, 'financed');

  it('builds the lender cost basis from land + construction + 10% contingency', () => {
    expect(est.construction).toBe(6000 * 320);
    expect(est.contingency).toBeCloseTo(192000, 0);
    expect(est.basis).toBeCloseTo(3612000, 0);
  });

  it('sizes the loan at 83% LTC and the down payment at 17%', () => {
    expect(est.loan).toBeCloseTo(0.83 * 3612000, 0);
    expect(est.down + est.loan).toBeCloseTo(est.basis, 6);
  });

  it('reproduces the LOI interest reserve rule: six months of full-draw interest', () => {
    // At the LOI's exact loan of $2,979,700 the rule yields its $141,535.75.
    expect((2979700 * RULES.interestRate) / 2).toBeCloseTo(141535.75, 2);
    expect(est.reserve).toBeCloseTo((est.loan * RULES.interestRate) / 2, 6);
  });

  it('reproduces the LOI closing-cost decomposition: 3.5% of loan + $41,617 fixed', () => {
    // At the LOI's exact loan: 3.5% × $2,979,700 + $41,617 ≈ $145,906.
    expect(0.035 * 2979700 + 41617).toBeCloseTo(145906.5, 1);
    expect(est.closing).toBeCloseTo(0.035 * est.loan + 41617, 6);
  });

  it('lands near the LOI economics: ~$1.22M cash in, ~96% cash-on-cash', () => {
    expect(est.cashRequired).toBeCloseTo(1220271, 0);
    expect(est.netProfit).toBeCloseTo(1175769, 0);
    expect(est.cashOnCash).toBeGreaterThan(0.9);
    expect(est.cashOnCash).toBeLessThan(1.05);
    expect(est.equityMultiple).toBeCloseTo(1 + est.cashOnCash, 6);
  });
});

describe('calcEstimate — all cash', () => {
  const est = calcEstimate(pinecrest, 'cash');

  it('strips every debt line from the stack', () => {
    expect(est.loan).toBe(0);
    expect(est.closing).toBe(0);
    expect(est.reserve).toBe(0);
    expect(est.interestBeyond).toBe(0);
  });

  it('cash required is basis + soft + acquisition fee + holding', () => {
    expect(est.cashRequired).toBeCloseTo(est.basis + est.soft + est.acquisitionFee + est.holding, 6);
  });

  it('returns less per dollar than the financed deal', () => {
    const financed = calcEstimate(pinecrest, 'financed');
    expect(est.cashOnCash).toBeLessThan(financed.cashOnCash);
    expect(est.netProfit).toBeGreaterThan(financed.netProfit);
  });
});

describe('sensitivity helpers', () => {
  const est = calcEstimate(pinecrest, 'financed');

  it('profitAt at target sale with no overrun matches the base estimate', () => {
    const base = profitAt(est, pinecrest.arv, 0);
    expect(base.profit).toBeCloseTo(est.netProfit, 6);
    expect(base.cashOnCash).toBeCloseTo(est.cashOnCash, 6);
  });

  it('overruns are funded with cash and shrink the return twice over', () => {
    const overrun = profitAt(est, pinecrest.arv, 0.1);
    expect(overrun.profit).toBeLessThan(est.netProfit);
    expect(overrun.cashOnCash).toBeLessThan(est.cashOnCash);
  });

  it('break-even sale nets zero profit', () => {
    const sale = breakEvenSale(est);
    expect(profitAt(est, sale, 0).profit).toBeCloseTo(0, 6);
  });

  it('a month of delay costs full-draw interest plus holding', () => {
    expect(monthlyDelayCost(est)).toBeCloseTo((est.loan * RULES.interestRate) / 12 + 3000, 6);
  });
});

describe('zone assumptions', () => {
  it('Sunset builds at $300/ft², the others at $320/ft²', () => {
    expect((zones.sunset as ZoneParams).rate).toBe(300);
    expect((zones.pinecrest as ZoneParams).rate).toBe(320);
    expect((zones.grove as ZoneParams).rate).toBe(320);
  });

  it('every zone clears RBI’s 65% loan-to-ARV cap', () => {
    for (const zone of Object.values(zones) as ZoneParams[]) {
      const est = calcEstimate(zone, 'financed');
      expect(est.loan / zone.arv).toBeLessThan(0.65);
    }
  });
});
