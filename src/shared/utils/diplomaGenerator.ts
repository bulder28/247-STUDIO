import { UserDomainModel } from '@/shared/domain/types';
import { beltLabelEs } from '@/widgets/Belt';

/**
 * Genera un Diploma Oficial de Graduación de BJJ en PDF de alta fidelidad
 * listo para imprimir o enviar al alumno.
 */
export async function generateGraduationDiplomaPdf(athlete: UserDomainModel, dateStr?: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  // Documento A4 apaisado (Landscape: 297mm x 210mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const dateFormatted = dateStr || new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // 1. Fondo elegante blanco hueso / pergamino marcial
  doc.setFillColor(253, 252, 248);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // 2. Marco exterior dorado
  doc.setDrawColor(212, 175, 55); // #D4AF37 Gold
  doc.setLineWidth(3);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // 3. Marco interior fino azul marino
  doc.setDrawColor(26, 29, 46); // #1A1D2E Navy
  doc.setLineWidth(0.8);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  // 4. Filete dorado decorativo interior
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.3);
  doc.rect(16, 16, pageWidth - 32, pageHeight - 32);

  // 5. Encabezado de la academia
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 29, 46);
  doc.setFontSize(26);
  doc.text('2 4 7   S T U D I O', pageWidth / 2, 36, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(225, 29, 46); // Studio Red
  doc.text('ACADEMIA DE BRAZILIAN JIU-JITSU & ARTES MARCIALES · PINTO, MADRID', pageWidth / 2, 43, {
    align: 'center',
  });

  // Línea divisoria dorada
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1);
  doc.line(60, 48, pageWidth - 60, 48);

  // 6. Título del Diploma
  doc.setFont('times', 'bolditalic');
  doc.setTextColor(26, 29, 46);
  doc.setFontSize(24);
  doc.text('Diploma Oficial de Graduación', pageWidth / 2, 64, { align: 'center' });

  // 7. Texto de certificación
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 90);
  doc.text('Por la presente se certifica que el / la atleta:', pageWidth / 2, 78, { align: 'center' });

  // 8. Nombre del Atleta en tipografía prominente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(26, 29, 46);
  doc.text(athlete.alias.toUpperCase(), pageWidth / 2, 94, { align: 'center' });

  // Subrayado dorado
  const nameWidth = doc.getTextWidth(athlete.alias.toUpperCase());
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1.5);
  doc.line((pageWidth - nameWidth) / 2 - 5, 98, (pageWidth + nameWidth) / 2 + 5, 98);

  // 9. Mérito y Grado
  const beltLabel = beltLabelEs(athlete.belt).toUpperCase();
  const stripesLabel = athlete.stripes > 0 ? ` CON ${athlete.stripes} GRADO(S)` : '';
  const gradeText = `CINTURÓN ${beltLabel}${stripesLabel}`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 90);
  doc.text(
    'Ha demostrado la constancia, el honor, la disciplina técnica y los valores del tatami necesarios para alcanzar el rango de:',
    pageWidth / 2,
    112,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(180, 130, 20); // Deep gold
  doc.text(gradeText, pageWidth / 2, 126, { align: 'center' });

  // 10. Fecha y Lugar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 110);
  doc.text(`Otorgado en Pinto (Madrid), a ${dateFormatted}.`, pageWidth / 2, 142, { align: 'center' });

  // 11. Firmas de los Instructores
  const signY = 175;

  // Firma Izquierda: Mario Rodríguez
  doc.setDrawColor(150, 150, 160);
  doc.setLineWidth(0.5);
  doc.line(45, signY, 110, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 29, 46);
  doc.text('Mario Rodríguez', 77.5, signY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 130);
  doc.text('Profesor Cinta Negra · 247Studio', 77.5, signY + 9, { align: 'center' });

  // Sello Central Circular
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1.2);
  doc.circle(pageWidth / 2, signY - 2, 12, 'S');
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(212, 175, 55);
  doc.text('心', pageWidth / 2, signY + 1, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('247 TATAMI', pageWidth / 2, signY + 6, { align: 'center' });

  // Firma Derecha: David Soto
  doc.line(pageWidth - 110, signY, pageWidth - 45, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 29, 46);
  doc.text('David Soto', pageWidth - 77.5, signY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 130);
  doc.text('Profesor Cinta Negra · 247Studio', pageWidth - 77.5, signY + 9, { align: 'center' });

  // Guardar y descargar el archivo
  const cleanAlias = athlete.alias.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Diploma_247Studio_${cleanAlias}.pdf`);
}

