import { describe, expect, it } from 'vitest';
import { filterProjects, matchesProject } from '../../src/lib/filters';

const projects = [
  { name: 'Villa Sunset', location: 'Miami' },
  { name: 'Villa Ochoa', location: 'Punta Gorda' },
  { name: 'Villa Nukes', location: 'Lehigh Acres' },
  { name: 'DDC Wellness Center', location: 'Miami' },
];

describe('matchesProject', () => {
  it('matches everything when the filter is empty', () => {
    expect(projects.every((p) => matchesProject(p, { query: '', location: '' }))).toBe(true);
  });

  it('is case-insensitive and matches substrings by default', () => {
    expect(matchesProject(projects[0], { query: 'SUNSET', location: '' })).toBe(true);
    expect(matchesProject(projects[0], { query: 'villa', location: '' })).toBe(true);
  });

  it('supports exact matching', () => {
    expect(matchesProject(projects[0], { query: 'villa sunset', location: '', matchMode: 'exact' })).toBe(true);
    expect(matchesProject(projects[0], { query: 'sunset', location: '', matchMode: 'exact' })).toBe(false);
  });

  it('ignores surrounding whitespace in the query', () => {
    expect(matchesProject(projects[0], { query: '  sunset  ', location: '' })).toBe(true);
  });

  it('treats "All" and "" as no location filter', () => {
    expect(matchesProject(projects[1], { query: '', location: 'All' })).toBe(true);
    expect(matchesProject(projects[1], { query: '', location: '' })).toBe(true);
  });

  it('filters by exact location otherwise', () => {
    expect(matchesProject(projects[1], { query: '', location: 'Miami' })).toBe(false);
    expect(matchesProject(projects[1], { query: '', location: 'Punta Gorda' })).toBe(true);
  });
});

describe('filterProjects', () => {
  it('combines name and location filters', () => {
    expect(filterProjects(projects, { query: 'villa', location: 'Miami' })).toEqual([
      { name: 'Villa Sunset', location: 'Miami' },
    ]);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterProjects(projects, { query: 'chalet', location: '' })).toEqual([]);
  });

  it('does not mutate the input', () => {
    const copy = [...projects];
    filterProjects(projects, { query: 'villa', location: 'Miami' });
    expect(projects).toEqual(copy);
  });
});
