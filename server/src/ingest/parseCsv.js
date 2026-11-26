import Papa from 'papaparse';

/** Parse CSV text into row objects with trimmed, lower-cased headers. */
export function parseCsv(text) {
  const result = Papa.parse(String(text ?? '').replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase(),
    transform: (v) => (typeof v === 'string' ? v.trim() : v),
  });
  return {
    rows: result.data,
    headers: result.meta.fields ?? [],
    parseErrors: result.errors.map((e) => ({ row: (e.row ?? 0) + 2, message: e.message })),
  };
}
