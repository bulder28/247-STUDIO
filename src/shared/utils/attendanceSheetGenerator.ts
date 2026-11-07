/**
 * 247 STUDIO - Mat Attendance Roll-Call Sheet Generator (PDF)
 * Produces an elegant A4 printable sheet for coaches on the tatami
 */
import { jsPDF } from 'jspdf';

export interface ClassSheetStudent {
  alias: string;
  belt: string;
  stripes: number;
  phone?: string;
}

export interface AttendanceSheetData {
  className: string;
  scheduleTime: string;
  dateStr: string;
  instructor: string;
  students: ClassSheetStudent[];
}

export function generateAttendanceSheetPdf(data: AttendanceSheetData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('247 STUDIO PINTO - HOJA DE ASISTENCIA EN TATAMI', 15, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Clase: ${data.className}  |  Horario: ${data.scheduleTime}  |  Fecha: ${data.dateStr}  |  Sensei: ${data.instructor}`, 15, 22);

  // Table headers
  const startY = 36;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(15, startY, 180, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(15, startY, 180, 8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Nº', 18, startY + 5.5);
  doc.text('ALUMNO / ALIAS', 28, startY + 5.5);
  doc.text('GRADO / CINTURÓN', 95, startY + 5.5);
  doc.text('ASISTIÓ [ X ]', 142, startY + 5.5);
  doc.text('NOTAS / TÉCNICA', 170, startY + 5.5);

  let curY = startY + 8;
  const rowHeight = 7.5;

  const rowsToPrint = Math.max(data.students.length, 25); // At least 25 blank lines for walk-ins
  for (let i = 0; i < rowsToPrint; i++) {
    const student = data.students[i];

    doc.rect(15, curY, 180, rowHeight, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    doc.text(String(i + 1), 18, curY + 5);

    if (student) {
      doc.setFont('helvetica', 'bold');
      doc.text(student.alias, 28, curY + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${student.belt} (${student.stripes}º Grado)`, 95, curY + 5);
    }

    // Checkbox box
    doc.rect(148, curY + 1.8, 4, 4, 'S');

    curY += rowHeight;

    // Page break if overflowing
    if (curY > 275 && i < rowsToPrint - 1) {
      doc.addPage();
      curY = 20;
    }
  }

  // Footer notes
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Documento operativo para control de aforo y graduación continua. 247 Studio Pinto. OSS.', 15, 290);

  return doc;
}

export function downloadAttendanceSheetPdf(data: AttendanceSheetData): void {
  const doc = generateAttendanceSheetPdf(data);
  doc.save(`Asistencia_247_${data.dateStr.replace(/\//g, '-')}_${data.className}.pdf`);
}

