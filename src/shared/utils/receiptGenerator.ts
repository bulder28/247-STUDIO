/**
 * 247 STUDIO - Official Cash / POS Receipt Generator (PDF)
 * Produces clean, professional 80mm POS thermal format or A5 receipts client-side
 */
import { jsPDF } from 'jspdf';

export interface ReceiptData {
  receiptNumber: string;
  dateStr: string;
  timeStr: string;
  studentAlias: string;
  concept: string;
  amountEur: number;
  paymentMethod: 'CASH' | 'CARD' | 'BIZUM' | 'TRANSFER';
  staffName?: string;
}

export function generatePosReceiptPdf(data: ReceiptData): jsPDF {
  // 80mm standard receipt width, 140mm height
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 150],
  });

  const subtotal = Math.round((data.amountEur / 1.21) * 100) / 100;
  const iva = Math.round((data.amountEur - subtotal) * 100) / 100;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('247 STUDIO PINTO', 40, 12, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Academia de Artes Marciales & BJJ', 40, 17, { align: 'center' });
  doc.text('C/ Aguilas 2, 28320 Pinto (Madrid)', 40, 21, { align: 'center' });
  doc.text('CIF: B-88746219 | Tel: +34 600 247 247', 40, 25, { align: 'center' });

  // Divider line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(8, 29, 72, 29);

  // Metadata
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('JUSTIFICANTE DE PAGO', 8, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(`Recibo: ${data.receiptNumber}`, 8, 40);
  doc.text(`Fecha: ${data.dateStr}  ${data.timeStr}`, 8, 45);
  doc.text(`Atleta: ${data.studentAlias}`, 8, 50);

  const methodLabel =
    data.paymentMethod === 'CASH'
      ? 'Efectivo en Tatami'
      : data.paymentMethod === 'CARD'
      ? 'Tarjeta / TPV'
      : data.paymentMethod === 'BIZUM'
      ? 'Bizum Academia'
      : 'Transferencia';
  doc.text(`Pago: ${methodLabel}`, 8, 55);

  // Concept Table
  doc.line(8, 60, 72, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('CONCEPTO', 8, 65);
  doc.text('TOTAL', 72, 65, { align: 'right' });
  doc.line(8, 67, 72, 67);

  doc.setFont('helvetica', 'normal');
  doc.text(data.concept.substring(0, 26), 8, 73);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.amountEur.toFixed(2)} EUR`, 72, 73, { align: 'right' });

  // Breakdown
  doc.line(8, 80, 72, 80);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Base imponible:', 8, 86);
  doc.text(`${subtotal.toFixed(2)} EUR`, 72, 86, { align: 'right' });

  doc.text('IVA incluido (21%):', 8, 91);
  doc.text(`${iva.toFixed(2)} EUR`, 72, 91, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL ABONADO:', 8, 99);
  doc.text(`${data.amountEur.toFixed(2)} EUR`, 72, 99, { align: 'right' });

  // Footer & OSS
  doc.setDrawColor(203, 213, 225);
  doc.line(8, 106, 72, 106);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('¡Gracias por entrenar con nosotros! OSS 🥋', 40, 115, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Atendido por: ${data.staffName || 'Mario / David'}`, 40, 120, { align: 'center' });
  doc.text('www.247studio.es', 40, 124, { align: 'center' });

  return doc;
}

export function downloadReceiptPdf(data: ReceiptData): void {
  const doc = generatePosReceiptPdf(data);
  doc.save(`Recibo_247_${data.receiptNumber}.pdf`);
}

