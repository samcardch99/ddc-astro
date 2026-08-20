/**
 * Compact summary of a Playwright JSON report — the default reporters are too
 * noisy to scan when a whole suite is red.
 *
 *   node scripts/pw-summary.mjs <report.json>
 */
import fs from 'node:fs';

const file = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const rows = [];
const strip = (text) => (text ?? '').replace(/\[[0-9;]*m/g, '');

const walk = (suite, trail = []) => {
  const name = [...trail, suite.title].filter(Boolean);
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests) {
      const result = t.results.at(-1);
      rows.push({
        status: result?.status ?? t.status,
        title: [...name, spec.title].join(' > '),
        project: t.projectId,
        error: (result?.errors ?? [])
          .map((e) => strip(e.message).split('\n').slice(0, 6).join(' | '))
          .join(' ;; '),
      });
    }
  }
  for (const child of suite.suites ?? []) walk(child, name);
};

for (const suite of data.suites ?? []) walk(suite);

const failed = rows.filter((r) => r.status !== 'passed' && r.status !== 'skipped');
console.log(
  `total=${rows.length} passed=${rows.filter((r) => r.status === 'passed').length} ` +
    `skipped=${rows.filter((r) => r.status === 'skipped').length} failed=${failed.length}`,
);
for (const row of failed) {
  console.log(`\nFAIL [${row.project}] ${row.title}\n   ${row.error}`);
}
