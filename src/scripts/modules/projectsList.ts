import { filterProjects, type MatchMode } from '../../lib/filters';
import { $, $$ } from '../utils';

const FILTER_KEY = 'projectsFilter';

type StoredFilter = { query: string; location: string; view: string; matchMode: MatchMode };

function loadFilter(): Partial<StoredFilter> {
  try {
    const raw = sessionStorage.getItem(FILTER_KEY);
    return raw ? (JSON.parse(raw) as StoredFilter) : {};
  } catch {
    return {};
  }
}

function saveFilter(state: StoredFilter): void {
  try {
    sessionStorage.setItem(FILTER_KEY, JSON.stringify(state));
  } catch {
    /* private mode — filters simply do not persist */
  }
}

/** Search + location + list/grid for /projects, persisted like the React page. */
export function initProjectsList(): void {
  const list = $<HTMLElement>('[data-projects-list]');
  if (!list) return;

  const search = $<HTMLInputElement>('[data-projects-search]');
  const location = $<HTMLSelectElement>('[data-projects-location]');
  const empty = $<HTMLElement>('[data-projects-empty]');
  const viewButtons = $$<HTMLButtonElement>('[data-projects-view]');
  const cards = $$<HTMLElement>('[data-project-card]', list);

  const saved = loadFilter();
  const state: StoredFilter = {
    query: saved.query ?? '',
    location: saved.location ?? '',
    view: saved.view ?? 'grid',
    matchMode: saved.matchMode ?? 'contains',
  };

  const entries = cards.map((card) => ({
    card,
    name: card.dataset.name ?? '',
    location: card.dataset.location ?? '',
  }));

  const apply = (persist = true) => {
    const visible = new Set(
      filterProjects(entries, {
        query: state.query,
        location: state.location,
        matchMode: state.matchMode,
      }).map((entry) => entry.card),
    );

    entries.forEach(({ card }) => {
      card.hidden = !visible.has(card);
    });

    if (empty) empty.classList.toggle('hidden', visible.size > 0);

    list.dataset.view = state.view;
    viewButtons.forEach((button) => {
      button.setAttribute('aria-pressed', button.dataset.projectsView === state.view ? 'true' : 'false');
    });

    if (persist) saveFilter(state);
  };

  search?.addEventListener('input', () => {
    state.query = search.value;
    apply();
  });

  location?.addEventListener('change', () => {
    state.location = location.value;
    apply();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  viewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.view = button.dataset.projectsView ?? 'grid';
      apply();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  if (search) search.value = state.query;
  if (location) location.value = state.location;
  apply(false);
}
