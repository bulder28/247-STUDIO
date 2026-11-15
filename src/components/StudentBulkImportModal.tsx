import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { exportWorkbook, normalizeExcelDate, readExcelRows } from '@/lib/excel';

export interface ImportPlanOption {
  id: string;
  name: string;
  price_eur: number;
}

interface StudentBulkImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => Promise<void> | void;
  plans: ImportPlanOption[];
  existingEmails: Set<string>;
  currentMonth: string;
}

interface ParsedStudentRow {
  rowNumber: number;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string | null;
  belt: string | null;
  planId: string | null;
  planName: string;
  paidNow: boolean;
  paymentMethod: 'Efectivo' | 'Bizum';
  isFounder: boolean;
  tutorName: string;
  tutorPhone: string;
  errors: string[];
}

interface ImportResultRow {
  Fila: number;
  Nombre: string;
  Email: string;
  Tarifa: string;
  Estado: 'Creado' | 'Error' | 'Omitido';
  Clave_temporal: string;
  Detalle: string;
}

const VALID_BELTS = [
  'Blanco',
  'Gris',
  'Amarillo',
  'Naranja',
  'Verde',
  'Azul',
  'Morado',
  'Marrón',
  'Negro',
];

function normalizeKeyMap(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const norm = k
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
    out[norm] = v;
  }
  return out;
}

function getStr(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const val = row[k];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

function parseYesNo(raw: string): boolean {
  const norm = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return norm === 'si' || norm === 'yes' || norm === '1' || norm === 'true' || norm === 'x';
}

function getAgeYears(birthDate: string): number | null {
  const d = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

function resolveBelt(raw: string): { belt: string | null; valid: boolean } {
  const clean = raw.trim();
  if (!clean) return { belt: null, valid: true };
  const norm = clean
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (norm === 'sin cinturon' || norm === 'ninguno' || norm === '-') {
    return { belt: null, valid: true };
  }
  const found = VALID_BELTS.find(
    (b) =>
      b
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') === norm
  );
  return found ? { belt: found, valid: true } : { belt: null, valid: false };
}

export function StudentBulkImportModal({
  open,
  onClose,
  onImported,
  plans,
  existingEmails,
  currentMonth,
}: StudentBulkImportModalProps) {
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ImportResultRow[] | null>(null);

  const validRows = useMemo(() => parsedRows.filter((r) => r.errors.length === 0), [parsedRows]);
  const invalidRows = useMemo(() => parsedRows.filter((r) => r.errors.length > 0), [parsedRows]);

  if (!open) return null;

  const resetState = () => {
    setFileName('');
    setParsedRows([]);
    setParseError(null);
    setImporting(false);
    setProgress({ done: 0, total: 0 });
    setResults(null);
  };

  const handleClose = () => {
    if (importing) return;
    resetState();
    onClose();
  };

  const handleDownloadTemplate = () => {
    const samplePlan = plans[0]?.name ?? 'BJJ Ilimitado';
    const templateRows = [
      {
        nombre_apellidos: 'Carlos Pérez García',
        email: 'carlos.perez@ejemplo.com',
        telefono: '600123456',
        fecha_nacimiento: '1994-05-18',
        cinturon: 'Blanco',
        tarifa: samplePlan,
        pagado: 'SI',
        metodo_pago: 'Bizum',
        socio_fundador: 'NO',
        tutor_nombre: '',
        tutor_telefono: '',
      },
      {
        nombre_apellidos: 'Lucía Martín López',
        email: 'lucia.martin@ejemplo.com',
        telefono: '611987654',
        fecha_nacimiento: '2014-09-10',
        cinturon: 'Sin cinturón',
        tarifa: '',
        pagado: 'NO',
        metodo_pago: 'Efectivo',
        socio_fundador: 'NO',
        tutor_nombre: 'Ana López',
        tutor_telefono: '622334455',
      },
    ];

    const infoRows = [
      { Campo: 'nombre_apellidos', Obligatorio: 'Sí', Notas: 'Nombre y apellidos del alumno' },
      { Campo: 'email', Obligatorio: 'Sí', Notas: 'Email único para acceder a la app' },
      { Campo: 'telefono', Obligatorio: 'No', Notas: 'Teléfono de contacto' },
      { Campo: 'fecha_nacimiento', Obligatorio: 'No', Notas: 'Formato YYYY-MM-DD o DD/MM/YYYY' },
      {
        Campo: 'cinturon',
        Obligatorio: 'No',
        Notas: `Opcional (ej. Grappling/MMA). Valores: Sin cinturón, ${VALID_BELTS.join(', ')}`,
      },
      {
        Campo: 'tarifa',
        Obligatorio: 'No',
        Notas: `Nombre exacto: ${plans.map((p) => p.name).join(' | ') || 'Sin tarifas'}`,
      },
      { Campo: 'pagado', Obligatorio: 'No', Notas: 'SI o NO (aplica al mes actual si hay tarifa)' },
      { Campo: 'metodo_pago', Obligatorio: 'No', Notas: 'Efectivo o Bizum' },
      { Campo: 'socio_fundador', Obligatorio: 'No', Notas: 'SI o NO' },
      { Campo: 'tutor_nombre', Obligatorio: 'Si ≤14 años', Notas: 'Nombre del padre/madre o tutor' },
      { Campo: 'tutor_telefono', Obligatorio: 'Si ≤14 años', Notas: 'Teléfono del tutor' },
    ];

    exportWorkbook('plantilla_alumnos_247.xlsx', [
      { name: 'Alumnos', rows: templateRows },
      { name: 'Instrucciones', rows: infoRows },
    ]);
  };

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setParseError(null);
    setResults(null);
    setFileName(file.name);

    try {
      const rawRows = await readExcelRows(file);
      if (rawRows.length === 0) {
        setParsedRows([]);
        setParseError('El archivo no contiene filas de datos.');
        return;
      }

      const seenInFile = new Set<string>();
      const planMap = new Map(plans.map((p) => [p.name.trim().toLowerCase(), p]));

      const mapped: ParsedStudentRow[] = rawRows.map((raw, idx) => {
        const row = normalizeKeyMap(raw);
        const rowNumber = idx + 2;
        const errors: string[] = [];

        const fullName = getStr(row, 'nombre_apellidos', 'nombre', 'full_name', 'alumno');
        const email = getStr(row, 'email', 'correo').toLowerCase();
        const phone = getStr(row, 'telefono', 'phone', 'movil');
        const rawBirth = row['fecha_nacimiento'] ?? row['birth_date'] ?? '';
        const birthDate = normalizeExcelDate(rawBirth);
        const rawBelt = getStr(row, 'cinturon', 'belt');
        const rawPlan = getStr(row, 'tarifa', 'plan');
        const rawPaid = getStr(row, 'pagado', 'paid');
        const rawMethod = getStr(row, 'metodo_pago', 'payment_method', 'metodo');
        const rawFounder = getStr(row, 'socio_fundador', 'fundador', 'is_founder');
        const tutorName = getStr(row, 'tutor_nombre', 'father_name', 'tutor');
        const tutorPhone = getStr(row, 'tutor_telefono', 'father_phone');

        if (!fullName) errors.push('Falta nombre');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push('Email inválido');
        } else if (existingEmails.has(email)) {
          errors.push('Email ya registrado');
        } else if (seenInFile.has(email)) {
          errors.push('Email duplicado en Excel');
        }
        if (email) seenInFile.add(email);

        if (rawBirth !== '' && rawBirth !== null && rawBirth !== undefined && !birthDate) {
          errors.push('Fecha inválida');
        }

        if (birthDate) {
          const age = getAgeYears(birthDate);
          if (age !== null && age <= 14 && (!tutorName || !tutorPhone)) {
            errors.push('Menor ≤14 años requiere tutor y teléfono');
          }
        }

        const beltRes = resolveBelt(rawBelt);
        if (!beltRes.valid) errors.push(`Cinturón inválido (${rawBelt})`);

        let planId: string | null = null;
        let planName = '';
        if (rawPlan) {
          const matchedPlan = planMap.get(rawPlan.toLowerCase());
          if (!matchedPlan) {
            errors.push(`Tarifa no encontrada (${rawPlan})`);
          } else {
            planId = matchedPlan.id;
            planName = matchedPlan.name;
          }
        }

        const paidNow = planId ? parseYesNo(rawPaid) : false;
        const paymentMethod: 'Efectivo' | 'Bizum' = rawMethod.toLowerCase().includes('bizum')
          ? 'Bizum'
          : 'Efectivo';
        const isFounder = parseYesNo(rawFounder);

        return {
          rowNumber,
          fullName,
          email,
          phone,
          birthDate,
          belt: beltRes.belt,
          planId,
          planName,
          paidNow,
          paymentMethod,
          isFounder,
          tutorName,
          tutorPhone,
          errors,
        };
      });

      setParsedRows(mapped);
    } catch (err) {
      setParsedRows([]);
      setParseError(
        err instanceof Error ? `No se pudo leer el Excel: ${err.message}` : 'Error leyendo el archivo'
      );
    }
  };

  const handleRunImport = async () => {
    if (validRows.length === 0 || importing) return;
    setImporting(true);
    setProgress({ done: 0, total: validRows.length });

    const out: ImportResultRow[] = invalidRows.map((r) => ({
      Fila: r.rowNumber,
      Nombre: r.fullName || '—',
      Email: r.email || '—',
      Tarifa: r.planName || 'Sin tarifa',
      Estado: 'Omitido',
      Clave_temporal: '',
      Detalle: r.errors.join('; '),
    }));

    for (let i = 0; i < validRows.length; i += 1) {
      const r = validRows[i];
      try {
        const { data, error } = await supabase.functions.invoke('create-student', {
          body: {
            email: r.email,
            full_name: r.fullName,
            phone: r.phone,
            birth_date: r.birthDate,
            belt: r.belt,
            role: 'client',
            guardian_user_id: null,
            father_name: r.tutorName || null,
            father_phone: r.tutorPhone || null,
            mother_name: null,
            mother_phone: null,
            is_founder: r.isFounder,
            plan_id: r.planId,
            month_year: currentMonth,
            paid_now: r.paidNow,
            payment_method: r.paymentMethod,
            first_training_at: null,
            trial_guest_id: null,
          },
        });

        if (error || data?.error) {
          out.push({
            Fila: r.rowNumber,
            Nombre: r.fullName,
            Email: r.email,
            Tarifa: r.planName || 'Sin tarifa',
            Estado: 'Error',
            Clave_temporal: '',
            Detalle: data?.error ?? error?.message ?? 'Error al crear alumno',
          });
        } else {
          out.push({
            Fila: r.rowNumber,
            Nombre: r.fullName,
            Email: r.email,
            Tarifa: r.planName || 'Sin tarifa',
            Estado: 'Creado',
            Clave_temporal: String(data?.tempPassword ?? ''),
            Detalle: 'Alta completada',
          });
        }
      } catch (err) {
        out.push({
          Fila: r.rowNumber,
          Nombre: r.fullName,
          Email: r.email,
          Tarifa: r.planName || 'Sin tarifa',
          Estado: 'Error',
          Clave_temporal: '',
          Detalle: err instanceof Error ? err.message : 'Error de red',
        });
      }

      setProgress({ done: i + 1, total: validRows.length });
    }

    out.sort((a, b) => a.Fila - b.Fila);
    setResults(out);
    setImporting(false);
    await onImported();
  };

  const handleDownloadResults = () => {
    if (!results) return;
    exportWorkbook(`resultado_importacion_${currentMonth}.xlsx`, [
      { name: 'Resultado_Importacion', rows: results as unknown as Record<string, unknown>[] },
    ]);
  };

  const createdCount = results?.filter((r) => r.Estado === 'Creado').length ?? 0;
  const errorCount = results?.filter((r) => r.Estado !== 'Creado').length ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl studio-panel border border-white/15 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileSpreadsheet className="w-5 h-5 text-red-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-headline text-xl text-white truncate">
                Importación masiva de alumnos
              </h2>
              <p className="text-xs text-slate-400">
                Descarga la plantilla Excel, rellénala y sube el archivo para dar de alta en lote.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={importing}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Paso 1: Plantilla + Subida */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={importing}
              className="flex items-center justify-between gap-3 rounded-xl studio-panel-inset border border-white/10 hover:border-white/25 px-4 py-3 text-left transition disabled:opacity-50"
            >
              <div>
                <p className="text-sm font-semibold text-white">1. Descargar plantilla (.xlsx)</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Incluye columnas válidas y tarifas actuales del gimnasio
                </p>
              </div>
              <Download className="w-4 h-4 text-red-400 shrink-0" />
            </button>

            <label className="flex items-center justify-between gap-3 rounded-xl studio-panel-inset border border-dashed border-white/20 hover:border-red-400/60 px-4 py-3 cursor-pointer transition">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">2. Seleccionar Excel (.xlsx / .csv)</p>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {fileName || 'Ningún archivo seleccionado'}
                </p>
              </div>
              <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                disabled={importing}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void handleFileChange(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          {parseError && (
            <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-4 py-3 text-xs text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Barra de progreso durante importación */}
          {importing && (
            <div className="rounded-xl studio-panel-inset border border-white/10 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-200">
                <span className="inline-flex items-center gap-2 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                  Creando alumnos y asignando tarifas...
                </span>
                <span>
                  {progress.done} / {progress.total}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950/70 overflow-hidden">
                <div
                  className="h-full w-full origin-left bg-red-500 transition-transform duration-200"
                  style={{
                    transform: `scaleX(${progress.total > 0 ? Math.round((progress.done / progress.total) * 100) / 100 : 0})`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Resultado final */}
          {results && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Importación finalizada: {createdCount} creados · {errorCount} omitidos/error
                </p>
                <p className="text-xs text-slate-300">
                  Descarga el Excel de resultado para obtener las claves temporales generadas.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadResults}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white shrink-0"
              >
                <Download className="w-4 h-4" />
                Descargar claves (.xlsx)
              </button>
            </div>
          )}

          {/* Vista previa de filas */}
          {parsedRows.length > 0 && !results && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-300">
                  Previsualización ({parsedRows.length} filas):{' '}
                  <strong className="text-emerald-300">{validRows.length} válidas</strong>
                  {invalidRows.length > 0 && (
                    <>
                      {' · '}
                      <strong className="text-amber-300">{invalidRows.length} con errores</strong>
                    </>
                  )}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10 max-h-72">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.04] text-slate-400 uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Fila</th>
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Tarifa</th>
                      <th className="px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {parsedRows.map((r) => (
                      <tr key={r.rowNumber} className="hover:bg-white/[0.02]">
                        <td className="px-3 py-2 text-slate-400">{r.rowNumber}</td>
                        <td className="px-3 py-2 text-white font-medium">{r.fullName || '—'}</td>
                        <td className="px-3 py-2 text-slate-300">{r.email || '—'}</td>
                        <td className="px-3 py-2 text-slate-300">{r.planName || 'Sin tarifa'}</td>
                        <td className="px-3 py-2">
                          {r.errors.length === 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Válida
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-300">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              {r.errors.join(', ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-white/10 bg-black/20">
          <button
            type="button"
            onClick={handleClose}
            disabled={importing}
            className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-50"
          >
            {results ? 'Cerrar' : 'Cancelar'}
          </button>
          {!results && (
            <button
              type="button"
              onClick={handleRunImport}
              disabled={importing || validRows.length === 0}
              className="inline-flex items-center gap-2 rounded-xl studio-btn px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Importar {validRows.length} alumno{validRows.length === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

