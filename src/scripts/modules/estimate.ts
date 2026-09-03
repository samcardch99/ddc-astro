import gsap from 'gsap';
import { $, $$, prefersReducedMotion, readJson } from '../utils';
import { toast } from '../toast';
import zoneGeometry from '../../data/zoneGeometry.json';
import type { EstimateMapApi } from './estimateMap';
import {
  breakEvenSale,
  calcEstimate,
  monthlyDelayCost,
  profitAt,
  ratePerSqft,
  RULES,
  type Estimate,
  type Funding,
  type ZoneParams,
} from '../../lib/estimate';

type Step = 'zone' | 'profile' | 'funding' | 'results';
const STEPS: Step[] = ['zone', 'profile', 'funding', 'results'];

interface Messages {
  step_label: string;
  coc_tag: string;
  leverage_note: string;
  breakeven: string;
  on_budget: string;
  overrun: string;
  target: string;
  sale_col: string;
  cap_loan: string;
  cap_down: string;
  cap_extra: string;
  cap_cash_only: string;
  context_financed: string;
  context_cash: string;
  context_resident: string;
  context_foreign: string;
  net_f: string;
  total_f_financed: string;
  total_f_cash: string;
  upfront_financed: string;
  upfront_cash: string;
  construction_f: string;
  zone_names: Record<string, string>;
  invalid: string;
  sending: string;
  fail_title: string;
}

/** `"{a} of {b}"` → token replacement without a template engine. */
function fill(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => tokens[key] ?? `{${key}}`);
}

export function initEstimate(): void {
  const root = $<HTMLElement>('[data-estimate]');
  if (!root) return;

  /** Narrowed alias — closures below are hoisted past the null guard. */
  const scope: HTMLElement = root;
  const lang = root.dataset.lang === 'es' ? 'es' : 'en';
  const locale = lang === 'es' ? 'es-US' : 'en-US';
  const zones = readJson<Record<string, ZoneParams>>(root, 'data-zones', {});
  const msg = readJson<Messages>(root, 'data-messages', {} as Messages);
  const reduced = prefersReducedMotion();

  const nf0 = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const usd = (n: number): string => '$' + nf0.format(Math.round(n));
  const usdCompact = (n: number): string => {
    const abs = Math.abs(n);
    if (abs >= 1e6) return '$' + nf2.format(Math.round(n / 10000) / 100) + 'M';
    return '$' + nf0.format(Math.round(n / 1000)) + 'K';
  };
  const pct = (n: number): string => nf2.format(Math.round(n * 1000) / 10) + '%';

  /* ---------------- state ---------------- */
  const state: {
    step: number;
    zone: string | null;
    profile: 'resident' | 'foreign' | null;
    funding: Funding | null;
  } = {
    step: 0,
    zone: null,
    profile: null,
    funding: null,
  };

  const panels = new Map<Step, HTMLElement>();
  STEPS.forEach((step) => {
    const el = $<HTMLElement>(`[data-est-panel="${step}"]`, scope);
    if (el) panels.set(step, el);
  });

  const prevBtn = $<HTMLButtonElement>('[data-est-prev]', scope);
  const nextBtn = $<HTMLButtonElement>('[data-est-next]', scope);
  const restartBtn = $<HTMLButtonElement>('[data-est-restart]', scope);
  const stepLabel = $<HTMLElement>('[data-est-step-label]', scope);
  const progress = $<HTMLElement>('[data-est-progress]', scope);

  const stepComplete = (index: number): boolean => {
    const step = STEPS[index];
    if (step === 'zone') return state.zone !== null;
    if (step === 'profile') return state.profile !== null;
    if (step === 'funding') return state.funding !== null;
    return true;
  };

  /* ---------------- transitions ---------------- */
  let animating = false;

  function show(step: Step): void {
    const panel = panels.get(step);
    if (!panel) return;
    panel.hidden = false;
    if (reduced) return;
    const children = Array.from(panel.children) as HTMLElement[];
    gsap.fromTo(
      children,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.05, clearProps: 'opacity,transform' },
    );
  }

  function goTo(index: number): void {
    if (animating || index < 0 || index >= STEPS.length || index === state.step) return;
    if (index > state.step) {
      for (let i = state.step; i < index; i += 1) if (!stepComplete(i)) return;
    }
    const from = panels.get(STEPS[state.step]);
    const to = STEPS[index];
    state.step = index;
    syncChrome();
    if (to === 'funding') renderFundingTags();
    if (to === 'results') renderResults();

    const swap = (): void => {
      if (from) from.hidden = true;
      show(to);
      if (to === 'results') {
        panels.get('results')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      }
      animating = false;
    };

    if (reduced || !from || from.hidden) {
      swap();
      return;
    }
    animating = true;
    gsap.to(from, { opacity: 0, y: -10, duration: 0.22, ease: 'power2.in', onComplete: () => {
      gsap.set(from, { clearProps: 'opacity,transform' });
      swap();
    } });
  }

  function syncChrome(): void {
    if (stepLabel) stepLabel.textContent = fill(msg.step_label ?? 'Step {n} of 4', { n: String(state.step + 1) });
    if (progress) {
      const width = `${((state.step + 1) / STEPS.length) * 100}%`;
      if (reduced) progress.style.width = width;
      else gsap.to(progress, { width, duration: 0.45, ease: 'power2.out' });
    }
    if (prevBtn) prevBtn.disabled = state.step === 0;
    if (nextBtn) {
      const onResults = state.step === STEPS.length - 1;
      /* On the results step the proposal form is the one closing action. */
      nextBtn.hidden = onResults;
      nextBtn.disabled = !onResults && !stepComplete(state.step);
      nextBtn.textContent =
        state.step === STEPS.length - 2
          ? (nextBtn.dataset.labelResults ?? nextBtn.textContent)
          : (nextBtn.dataset.labelNext ?? nextBtn.textContent);
    }
    restartBtn?.classList.toggle('invisible', state.step === 0);
  }

  /* ---------------- selections ---------------- */
  function select(attr: string, value: string): void {
    $$<HTMLElement>(`[${attr}]`, scope).forEach((el) => {
      el.setAttribute('aria-pressed', String(el.getAttribute(attr) === value));
    });
  }

  const nav = $<HTMLElement>('[data-est-nav]', scope);
  /** After a selection, bring Back/Next into view so the path forward is obvious. */
  const revealNav = (): void => {
    nav?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
  };

  let mapApi: EstimateMapApi | null = null;

  const pickZone = (key: string): void => {
    state.zone = key;
    select('data-zone-option', key);
    mapApi?.setSelected(key);
    syncChrome();
    revealNav();
  };

  $$<HTMLElement>('[data-zone-option]', scope).forEach((el) => {
    el.addEventListener('click', () => pickZone(el.getAttribute('data-zone-option') ?? ''));
  });

  const mapContainer = $<HTMLElement>('[data-zone-leaflet]', scope);
  if (mapContainer) {
    void import('./estimateMap').then(async ({ initEstimateMap }) => {
      mapApi = await initEstimateMap(mapContainer, {
        geometry: zoneGeometry as unknown as Record<string, Array<[number, number]>>,
        names: msg.zone_names ?? {},
        onPick: pickZone,
      });
      if (state.zone) mapApi.setSelected(state.zone);
    });
  }

  $$<HTMLElement>('[data-profile-option]', scope).forEach((el) => {
    el.addEventListener('click', () => {
      state.profile = el.getAttribute('data-profile-option') as 'resident' | 'foreign';
      select('data-profile-option', state.profile);
      syncChrome();
      revealNav();
    });
  });

  $$<HTMLElement>('[data-funding-option]', scope).forEach((el) => {
    el.addEventListener('click', () => {
      state.funding = el.getAttribute('data-funding-option') as Funding;
      select('data-funding-option', state.funding);
      syncChrome();
      revealNav();
    });
  });

  prevBtn?.addEventListener('click', () => goTo(state.step - 1));
  nextBtn?.addEventListener('click', () => goTo(state.step + 1));
  restartBtn?.addEventListener('click', () => {
    state.zone = null;
    state.profile = null;
    state.funding = null;
    select('data-zone-option', '');
    mapApi?.setSelected(null);
    select('data-profile-option', '');
    select('data-funding-option', '');
    goTo(0);
  });

  /* ---------------- step content ---------------- */
  function renderFundingTags(): void {
    if (!state.zone) return;
    const zone = zones[state.zone];
    const financed = calcEstimate(zone, 'financed');
    const cash = calcEstimate(zone, 'cash');
    const tagF = $<HTMLElement>('[data-coc-tag="financed"]', scope);
    const tagC = $<HTMLElement>('[data-coc-tag="cash"]', scope);
    if (tagF) tagF.textContent = fill(msg.coc_tag ?? '{pct}', { pct: pct(financed.cashOnCash) });
    if (tagC) tagC.textContent = fill(msg.coc_tag ?? '{pct}', { pct: pct(cash.cashOnCash) });
    const note = $<HTMLElement>('[data-leverage-note]', scope);
    if (note) {
      note.classList.remove('hidden');
      note.textContent = fill(msg.leverage_note ?? '', {
        zone: msg.zone_names?.[state.zone] ?? zone.key,
        cash: pct(cash.cashOnCash),
        financed: pct(financed.cashOnCash),
        debt: usdCompact(financed.closing + financed.reserve + financed.interestBeyond),
      });
    }
  }

  function setCell(name: string, value: string): void {
    const cell = $<HTMLElement>(`[data-cell="${name}"]`, scope);
    if (cell) cell.textContent = value;
  }

  function countMetric(name: string, target: number, format: (n: number) => string): void {
    const el = $<HTMLElement>(`[data-m="${name}"]`, scope);
    if (!el) return;
    if (reduced) {
      el.textContent = format(target);
      return;
    }
    const proxy = { value: Number(el.dataset.value ?? 0) };
    el.dataset.value = String(target);
    gsap.to(proxy, {
      value: target,
      duration: 0.65,
      ease: 'power3.out',
      onUpdate: () => {
        el.textContent = format(proxy.value);
      },
    });
  }

  function renderResults(): void {
    if (!state.zone || !state.funding) return;
    const zone = zones[state.zone];
    const est: Estimate = calcEstimate(zone, state.funding);
    const financed = est.funding === 'financed';

    const context = $<HTMLElement>('[data-est-context]', scope);
    if (context) {
      const profile = state.profile === 'foreign' ? msg.context_foreign : msg.context_resident;
      const funding = financed ? msg.context_financed : msg.context_cash;
      context.textContent = `${msg.zone_names?.[state.zone] ?? zone.key} · ${profile ?? ''} · ${funding ?? ''}`;
    }

    countMetric('cash', est.upfront, usdCompact);
    const cashLabel = $<HTMLElement>('[data-m-label="cash"]', scope);
    if (cashLabel) cashLabel.textContent = financed ? msg.upfront_financed : msg.upfront_cash;
    countMetric('profit', est.netProfit, usdCompact);
    countMetric('coc', est.cashOnCash, pct);
    const mult = $<HTMLElement>('[data-m="mult"]', scope);
    if (mult) mult.textContent = nf2.format(Math.round(est.equityMultiple * 100) / 100) + 'x';

    /* capital bar */
    const total = est.cashRequired + est.loan;
    const seg = (name: string, width: number, label: string): void => {
      const el = $<HTMLElement>(`[data-cap="${name}"]`, scope);
      if (!el) return;
      el.style.width = `${(width / total) * 100}%`;
      el.textContent = label;
    };
    const legend = $<HTMLElement>('[data-cap-legend]', scope);
    if (financed) {
      seg('loan', est.loan, `${usdCompact(est.loan)}`);
      seg('down', est.down, '17%');
      seg('extra', est.cashRequired - est.down, '');
      if (legend)
        legend.innerHTML = [
          `<span>■ ${msg.cap_loan ?? ''} · ${usdCompact(est.loan)}</span>`,
          `<span>■ ${msg.cap_down ?? ''} · ${usdCompact(est.down)}</span>`,
          `<span>■ ${msg.cap_extra ?? ''} · ${usdCompact(est.cashRequired - est.down)}</span>`,
        ].join('');
    } else {
      seg('loan', 0, '');
      seg('down', total, usdCompact(total));
      seg('extra', 0, '');
      if (legend) legend.innerHTML = `<span>■ ${msg.cap_cash_only ?? ''}</span>`;
    }

    /* debt-only rows */
    $$<HTMLElement>('[data-debt-row]', scope).forEach((row) => {
      row.hidden = !financed;
    });

    /* cost ledger */
    setCell('land', usd(zone.land));
    setCell('acq', usd(est.acquisitionFee));
    setCell('construction', usd(est.construction));
    setCell('contingency', usd(est.contingency));
    setCell('soft', usd(est.soft));
    if (financed) {
      setCell('closing', usd(est.closing));
      setCell('reserve', usd(est.reserve));
      setCell('beyond', usd(est.interestBeyond));
    }
    setCell('holding', usd(est.holding));
    setCell('total', usd(est.cashRequired));
    const constructionFormula = $<HTMLElement>('[data-f="construction"]', scope);
    if (constructionFormula)
      constructionFormula.textContent = fill(msg.construction_f ?? '', {
        sqft: nf0.format(zone.sqft),
        rate: nf0.format(Math.round(ratePerSqft(zone))),
      });
    const totalFormula = $<HTMLElement>('[data-f="total"]', scope);
    if (totalFormula) totalFormula.textContent = financed ? (msg.total_f_financed ?? '') : (msg.total_f_cash ?? '');

    /* waterfall */
    setCell('sale', usd(zone.arv));
    setCell('selling', '−' + usd(zone.arv * RULES.sellingPct));
    if (financed) setCell('payoff', '−' + usd(est.loan));
    setCell('capitalBack', '−' + usd(est.cashRequired));
    setCell('net', usd(est.netProfit));
    const netFormula = $<HTMLElement>('[data-f="net"]', scope);
    if (netFormula) netFormula.textContent = fill(msg.net_f ?? '', { pct: pct(est.cashOnCash) });

    /* sensitivity */
    const sense = $<HTMLElement>('[data-sense]', scope);
    if (sense) {
      const sales = [
        { label: '−10%', value: zone.arv * 0.9 },
        { label: msg.target ?? 'Target', value: zone.arv },
        { label: '+5%', value: zone.arv * 1.05 },
      ];
      const overruns = [
        { label: msg.on_budget ?? '', value: 0 },
        { label: fill(msg.overrun ?? '', { pct: '5' }), value: 0.05 },
        { label: fill(msg.overrun ?? '', { pct: '10' }), value: 0.1 },
      ];
      const th = 'border border-white/10 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-grey';
      const td = 'border border-white/10 px-2 py-2 text-right tabular-nums';
      let html = `<thead><tr><th class="${th} text-left">${msg.sale_col ?? ''}</th>`;
      overruns.forEach((overrun) => {
        html += `<th class="${th} text-right">${overrun.label}</th>`;
      });
      html += '</tr></thead><tbody>';
      sales.forEach((sale) => {
        html += `<tr><td class="${td} text-left">${usdCompact(sale.value)} (${sale.label})</td>`;
        overruns.forEach((overrun) => {
          const result = profitAt(est, sale.value, overrun.value);
          const isBase = sale.value === zone.arv && overrun.value === 0;
          const tone = result.profit < 0 ? ' est-neg' : isBase ? ' est-pos' : '';
          html += `<td class="${td}${tone}${isBase ? ' bg-primary/10 font-bold' : ''}">${usdCompact(result.profit)} · ${pct(result.cashOnCash)}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody>';
      sense.innerHTML = html;
    }
    const senseCaption = $<HTMLElement>('[data-sense-caption]', scope);
    if (senseCaption) {
      const breakEven = breakEvenSale(est);
      senseCaption.textContent = fill(msg.breakeven ?? '', {
        price: usdCompact(breakEven),
        pct: pct(1 - breakEven / zone.arv),
        monthly: usdCompact(monthlyDelayCost(est)),
      });
    }
  }

  /* ---------------- lead form → EmailJS ---------------- */
  const leadForm = $<HTMLFormElement>('[data-lead-form]', scope);
  leadForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    void (async () => {
      const name = ($<HTMLInputElement>('#est-name', scope)?.value ?? '').trim();
      const email = ($<HTMLInputElement>('#est-email', scope)?.value ?? '').trim();
      const phone = ($<HTMLInputElement>('#est-phone', scope)?.value ?? '').trim();
      if (!name || !/.+@.+\..+/.test(email)) {
        toast.error(msg.invalid ?? 'Invalid form');
        return;
      }
      if (!state.zone || !state.funding) return;

      const serviceId = import.meta.env.PUBLIC_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.PUBLIC_EMAILJS_ESTIMATE_TEMPLATE_ID;
      const publicKey = import.meta.env.PUBLIC_EMAILJS_PUBLIC_KEY;
      if (!serviceId || !templateId || !publicKey) {
        toast.error(msg.fail_title ?? 'Error');
        return;
      }

      const submitBtn = leadForm.querySelector<HTMLButtonElement>('button[type="submit"]');
      const submitLabel = submitBtn?.textContent ?? '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = msg.sending ?? submitLabel;
      }

      const zone = zones[state.zone];
      const est = calcEstimate(zone, state.funding);
      const financed = est.funding === 'financed';
      const dash = '\u2014';
      /* Keys mirror the EmailJS "Investment Estimate" template variables. */
      const params = {
        name,
        email,
        phone: phone || dash,
        lang,
        time: new Date().toLocaleString(locale),
        zone: msg.zone_names?.[state.zone] ?? zone.key,
        profile: state.profile === 'foreign' ? msg.context_foreign : msg.context_resident,
        funding: financed ? msg.context_financed : msg.context_cash,
        cash_required: usd(est.cashRequired),
        upfront_payment: usd(est.upfront),
        staged_contributions: usd(est.staged),
        net_profit: usd(est.netProfit),
        cash_on_cash: pct(est.cashOnCash),
        equity_multiple: nf2.format(Math.round(est.equityMultiple * 100) / 100) + 'x',
        land: usd(zone.land),
        acquisition_fee: usd(est.acquisitionFee),
        construction: usd(est.construction),
        sqft: nf0.format(zone.sqft),
        rate: nf0.format(Math.round(ratePerSqft(zone))),
        contingency: usd(est.contingency),
        soft_costs: usd(est.soft),
        loan: financed ? usd(est.loan) : dash,
        down_payment: financed ? usd(est.down) : dash,
        loan_closing: financed ? usd(est.closing) : dash,
        interest_reserve: financed ? usd(est.reserve) : dash,
        interest_beyond: financed ? usd(est.interestBeyond) : dash,
        holding: usd(est.holding),
        sale_price: usd(zone.arv),
        selling_costs: usd(zone.arv * RULES.sellingPct),
        break_even: usd(breakEvenSale(est)),
      };

      try {
        const emailjs = (await import('@emailjs/browser')).default;
        await emailjs.send(serviceId, templateId, params, { publicKey });
        /* Delivered — the success page is the confirmation. */
        window.location.assign(scope.dataset.successUrl ?? '/estimate/success');
      } catch (error) {
        console.warn('[ddc] estimate EmailJS delivery failed', error);
        toast.error(msg.fail_title ?? 'Error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitLabel;
        }
      }
    })();
  });

  /* ---------------- boot ---------------- */
  if (nextBtn) {
    nextBtn.dataset.labelNext = nextBtn.textContent ?? '';
  }
  syncChrome();
}
