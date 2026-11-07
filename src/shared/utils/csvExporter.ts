import { UserDomainModel } from '@/shared/domain/types';

/**
 * Exporta el Censo Completo de Alumnos a formato CSV / Excel compatible
 */
export function exportStudentsToCsv(students: UserDomainModel[]) {
  const headers = [
    'Alias',
    'Email de Contacto',
    'Teléfono',
    'Cinturón',
    'Grados',
    'Sistema',
    'Tarifa',
    'Estado',
    'Media OVR',
    'Contacto de Emergencia',
    'Teléfono de Emergencia',
    'Notas Médicas',
  ];

  const rows = students.map((s) => {
    const statsVals = s.stats ? Object.values(s.stats) : [];
    const ovr = statsVals.length
      ? Math.round(statsVals.reduce((a, b) => a + (b || 50), 0) / statsVals.length)
      : 70;

    return [
      `"${s.alias.replace(/"/g, '""')}"`,
      `"${s.contactEmail || ''}"`,
      `"${s.phone || ''}"`,
      `"${s.belt}"`,
      s.stripes,
      `"${s.beltSystem}"`,
      `"${s.pricingTier}"`,
      `"${s.accountStatus}"`,
      ovr,
      `"${(s.emergencyContactName || '').replace(/"/g, '""')}"`,
      `"${s.emergencyContactPhone || ''}"`,
      `"${(s.medicalNotes || '').replace(/"/g, '""')}"`,
    ];
  });

  const csvContent =
    '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Censo_Alumnos_247Studio_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
