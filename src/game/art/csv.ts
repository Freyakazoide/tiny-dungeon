/** Leitura dos CSVs de arte (UTF-8). Linhas vazias, que começam com `#` ou iguais a `---` são ignoradas. */
export interface CsvRow { cells: string[]; line: number }

const splitLine = (line: string): string[] => {
  const out: string[] = []; let cur = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') quoted = false; else cur += ch; }
    else if (ch === '"') quoted = true; else if (ch === ',') { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  out.push(cur.trim()); return out;
};

export function parseCsv(text: string): CsvRow[] {
  const rows: CsvRow[] = [];
  text.replace(/^﻿/, '').split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line === '---') return;
    rows.push({ cells: splitLine(line), line: index + 1 });
  });
  return rows;
}
/** Grade de chaves (uma linha de CSV por linha de pixels). */
export const parseGrid = (text: string): CsvRow[] => parseCsv(text);
