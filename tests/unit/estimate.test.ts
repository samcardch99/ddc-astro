import { describe, expect, it } from 'vitest';
import zones from '../../src/data/zones.json';
import {
  breakEvenSale,
  calcEstimate,
  monthlyDelayCost,
  profitAt,
  RULES,
  type Profile,
  type ZoneParams,
} from '../../src/lib/estimate';

const pinecrest = zones.pinecrest as ZoneParams;
const profiles: Profile[] = ['resident', 'foreign'];

describe('calcEstimate — financed, Pinecrest (RBI LOI #19890 calibration)', () => {
  const est = calcEstimate(pinecrest, 'financed', 'resident');

  it('builds the lender cost basis from land + construction + 10% contingency', () => {
    expect(est.construction).toBe(6000 * 320);
    expect(est.contingency).toBeCloseTo(192000, 0);
    expect(est.basis).toBeCloseTo(3612000, 0);
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

  it('requires 73% of investor cash up front and stages the remaining 27%', () => {
    expect(est.upfront).toBeCloseTo(est.cashRequired * 0.73, 6);
    expect(est.staged).toBeCloseTo(est.cashRequired * 0.27, 6);
    expect(est.upfront + est.staged).toBeCloseTo(est.cashRequired, 6);
  });
});

describe('loan-to-cost follows the investor profile', () => {
  it('underwrites a U.S. resident at 83% and a foreign national at 80%', () => {
    expect(RULES.ltc.resident).toBe(0.83);
    expect(RULES.ltc.foreign).toBe(0.8);
  });

  it.each(profiles)('sizes the %s loan and down payment off that rate', (profile) => {
    const est = calcEstimate(pinecrest, 'financed', profile);
    expect(est.profile).toBe(profile);
    expect(est.ltc).toBe(RULES.ltc[profile]);
    expect(est.loan).toBeCloseTo(RULES.ltc[profile] * 3612000, 0);
    expect(est.down).toBeCloseTo((1 - RULES.ltc[profile]) * 3612000, 0);
    expect(est.down + est.loan).toBeCloseTo(est.basis, 6);
  });

  it('resident: ~$1.22M cash in, ~96.7% cash-on-cash on the model project', () => {
    const est = calcEstimate(pinecrest, 'financed', 'resident');
    expect(est.loan).toBeCloseTo(2997960, 2);
    expect(est.cashRequired).toBeCloseTo(1218165.44, 2);
    expect(est.netProfit).toBeCloseTo(1177874.56, 2);
    expect(est.cashOnCash).toBeCloseTo(0.96692, 5);
    expect(est.equityMultiple).toBeCloseTo(1 + est.cashOnCash, 6);
  });

  it('foreign national: ~$1.32M cash in, ~90.3% cash-on-cash', () => {
    const est = calcEstimate(pinecrest, 'financed', 'foreign');
    expect(est.loan).toBeCloseTo(2889600, 2);
    expect(est.cashRequired).toBeCloseTo(1316350.44, 2);
    expect(est.netProfit).toBeCloseTo(1188049.56, 2);
    expect(est.cashOnCash).toBeCloseTo(0.90253, 5);
  });

  it('more leverage means less cash in and a better return per dollar', () => {
    const resident = calcEstimate(pinecrest, 'financed', 'resident');
    const foreign = calcEstimate(pinecrest, 'financed', 'foreign');
    expect(resident.cashRequired).toBeLessThan(foreign.cashRequired);
    expect(resident.cashOnCash).toBeGreaterThan(foreign.cashOnCash);
    // The extra 3 points of debt cost interest, so the absolute profit is lower.
    expect(resident.netProfit).toBeLessThan(foreign.netProfit);
  });

  it('leaves an all-cash deal identical for both profiles', () => {
    const resident = calcEstimate(pinecrest, 'cash', 'resident');
    const foreign = calcEstimate(pinecrest, 'cash', 'foreign');
    expect(resident.cashRequired).toBe(foreign.cashRequired);
    expect(resident.netProfit).toBe(foreign.netProfit);
  });
});

describe('calcEstimate — all cash', () => {
  const est = calcEstimate(pinecrest, 'cash', 'resident');

  it('strips every debt line from the stack', () => {
    expect(est.loan).toBe(0);
    expect(est.closing).toBe(0);
    expect(est.reserve).toBe(0);
    expect(est.interestBeyond).toBe(0);
  });

  it('cash required is basis + soft + acquisition fee + holding', () => {
    expect(est.cashRequired).toBeCloseTo(est.basis + est.soft + est.acquisitionFee + est.holding, 6);
  });

  it('requires 83% of investor cash up front and stages the remaining 17%', () => {
    expect(est.upfront).toBeCloseTo(est.cashRequired * 0.83, 6);
    expect(est.staged).toBeCloseTo(est.cashRequired * 0.17, 6);
    expect(est.upfront + est.staged).toBeCloseTo(est.cashRequired, 6);
  });

  it.each(profiles)('returns less per dollar than the financed deal for a %s', (profile) => {
    const financed = calcEstimate(pinecrest, 'financed', profile);
    expect(est.cashOnCash).toBeLessThan(financed.cashOnCash);
    expect(est.netProfit).toBeGreaterThan(financed.netProfit);
  });
});

describe('sensitivity helpers', () => {
  const est = calcEstimate(pinecrest, 'financed', 'resident');

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

  it('derives every build budget as buildable area × the zone rate', () => {
    for (const zone of Object.values(zones) as ZoneParams[]) {
      expect(calcEstimate(zone, 'financed', 'resident').construction).toBe(zone.sqft * zone.rate);
    }
  });

  it('every zone clears RBI’s 65% loan-to-ARV cap, on either profile', () => {
    for (const zone of Object.values(zones) as ZoneParams[]) {
      for (const profile of profiles) {
        const est = calcEstimate(zone, 'financed', profile);
        expect(est.loan / zone.arv).toBeLessThan(0.65);
      }
    }
  });
});
