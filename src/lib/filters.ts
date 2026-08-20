/** Project list filtering — the logic behind /projects, without the DOM. */

export type MatchMode = 'contains' | 'exact';

export type FilterableProject = {
  name: string;
  location: string;
};

export type ProjectFilter = {
  query: string;
  location: string;
  matchMode?: MatchMode;
};

export function matchesProject(project: FilterableProject, filter: ProjectFilter): boolean {
  const query = filter.query.trim().toLowerCase();
  const title = project.name.toLowerCase();
  const matchMode = filter.matchMode ?? 'contains';

  const nameOk =
    query.length === 0 ? true : matchMode === 'exact' ? title === query : title.includes(query);

  const locOk =
    filter.location === 'All' || filter.location === '' ? true : project.location === filter.location;

  return nameOk && locOk;
}

export function filterProjects<T extends FilterableProject>(
  projects: readonly T[],
  filter: ProjectFilter,
): T[] {
  return projects.filter((project) => matchesProject(project, filter));
}
