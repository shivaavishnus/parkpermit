import { parseCsv } from './parseCsv.js';
import { normaliseLots, normaliseApplications } from './normalise.js';

/** Parse and validate both CSVs. Blocking errors are in `errors`. */
export function ingest({ applicationsCsv, lotsCsv }) {
  const lotsParsed = parseCsv(lotsCsv);
  const appsParsed = parseCsv(applicationsCsv);
  const lotsResult = normaliseLots(lotsParsed);
  const appsResult = normaliseApplications(
    appsParsed,
    lotsResult.lots.map((l) => l.lotId),
  );
  const errors = [
    ...lotsParsed.parseErrors.map((e) => ({ file: 'lots', field: '', ...e })),
    ...appsParsed.parseErrors.map((e) => ({ file: 'applications', field: '', ...e })),
    ...lotsResult.errors,
    ...appsResult.errors,
  ];
  if (!lotsResult.lots.length && !lotsResult.errors.length)
    errors.push({ file: 'lots', row: 1, field: '', message: 'lots.csv has no rows.' });
  if (!appsResult.applicants.length && !appsResult.errors.length)
    errors.push({ file: 'applications', row: 1, field: '', message: 'applications.csv has no rows.' });
  return {
    lots: lotsResult.lots,
    applicants: appsResult.applicants,
    errors,
    warnings: [...lotsResult.warnings, ...appsResult.warnings],
    summary: {
      lots: lotsResult.lots.length,
      applicants: appsResult.applicants.length,
      rowsRead: appsParsed.rows.length,
      issues: { ...appsResult.issues, pastOccupancyContextOnly: lotsParsed.headers.includes('past_peak_count') },
    },
  };
}
