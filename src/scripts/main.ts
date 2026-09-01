import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

import { initSmoothScroll } from './modules/scroll';
import { initHeader } from './modules/header';
import { initHoverLinks } from './modules/links';
import { initReveals } from './modules/reveals';
import { initCover } from './modules/cover';
import { initCounters } from './modules/counters';
import { initProcessAccordion } from './modules/process';
import { initCarousels } from './modules/carousels';
import { initTeam, initTeamAccordion } from './modules/team';
import { initProjectsList } from './modules/projectsList';
import { initProjectDetails, initLightboxTriggers } from './modules/gallery';
import { initTechCards } from './modules/techCards';
import { initContactForm, initInvestmentDialog } from './modules/forms';
import { initEstimate } from './modules/estimate';
import { initEstimateSuccess } from './modules/estimateSuccess';

gsap.registerPlugin(ScrollTrigger, SplitText);

function boot(): void {
  initSmoothScroll();
  initHeader();
  initHoverLinks();
  initCover();
  initReveals();
  initCounters();
  initProcessAccordion();
  initTeam();
  initTeamAccordion();
  initProjectsList();
  initProjectDetails();
  initLightboxTriggers();
  initTechCards();
  initContactForm();
  initInvestmentDialog();
  initEstimate();
  initEstimateSuccess();
  void initCarousels();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
