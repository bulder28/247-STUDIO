import * as XLSX from 'xlsx';

export interface ExcelSheetInput {
  name: string;
  rows: Record<string, unknown>[];
}

function computeColWidths(rows: Record<string, unknown>[]): XLSX.ColInfo[] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.map((key) => {
    let maxLen = key.length;
    for (const row of rows) {
      const val = row[key];
      const len = val == null ? 0 : String(val).length;
      if (len > maxLen) maxLen = len;
    }
    return { wch: Math.min(42, Math.max(12, maxLen + 3)) };
  });
}

/**
 * Exporta una o varias hojas a un archivo .xlsx descargable.
 */
export function exportWorkbook(filename: string, sheets: ExcelSheetInput[]): void {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const safeRows = sheet.rows.length > 0 ? sheet.rows : [{ Sin_datos: 'Sin registros' }];
    const ws = XLSX.utils.json_to_sheet(safeRows);
    ws['!cols'] = computeColWidths(safeRows);
    const safeName = sheet.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Datos';
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }
  const finalName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, finalName);
}

/**
 * Lee la primera hoja de un archivo .xlsx, .xls o .csv como array de objetos.
 */
export async function readExcelRows(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return [];
  const ws = wb.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
}

/**
 * Normaliza fechas de Excel (Date, serial numérico, DD/MM/YYYY o YYYY-MM-DD) a YYYY-MM-DD.
 */
export function normalizeExcelDate(val: unknown): string | null {
  if (val == null || val === '') return null;

  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (typeof val === 'number' && Number.isFinite(val)) {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }

  const raw = String(val).trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const esMatch = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (esMatch) {
    const [, d, m, y] = esMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

