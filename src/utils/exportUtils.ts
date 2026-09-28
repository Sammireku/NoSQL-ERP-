/**
 * Utility for exporting raw javascript objects into downloadable CSV files.
 * Correctly handles cell shielding, quotes escaping, and trigger events.
 * Supports both signatures:
 * 1. exportToCSV(filename, headers, rows)
 * 2. exportToCSV(dataObjectsArray, filename)
 */
export function exportToCSV(
  arg1: string | Record<string, any>[],
  arg2?: string[] | string,
  arg3?: (string | number | boolean | null | undefined)[][]
) {
  let filename: string;
  let headers: string[];
  let rows: (string | number | boolean | null | undefined)[][];

  if (Array.isArray(arg1)) {
    // Called as: exportToCSV(dataObjects, filename)
    filename = typeof arg2 === 'string' ? arg2 : 'export.csv';
    if (arg1.length === 0) {
      headers = [];
      rows = [];
    } else {
      headers = Object.keys(arg1[0]);
      rows = arg1.map(item => headers.map(key => item[key]));
    }
  } else {
    // Called as: exportToCSV(filename, headers, rows)
    filename = arg1;
    headers = Array.isArray(arg2) ? arg2 : [];
    rows = Array.isArray(arg3) ? arg3 : [];
  }

  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(val => {
        if (val === undefined || val === null) return '""';
        const strVal = String(val);
        // Escape quotes by doubling them, wrap field in quotes if it contains commas, newlines, or quotes
        if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n') || strVal.includes('\r')) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return `"${strVal}"`;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
