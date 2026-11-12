/**
 * 247 STUDIO - Official Cash / POS Receipt Generator (PDF)
 * Produces clean, professional 80mm POS thermal format or A5 receipts client-side
 */

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

export async function generatePosReceiptPdf(data: ReceiptData): Promise<any> {
  const { jsPDF } = await import('jspdf');
  // 80mm standard receipt width, 125mm height
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 125],
  });

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

  // Total
  doc.line(8, 80, 72, 80);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL ABONADO:', 8, 88);
  doc.text(`${data.amountEur.toFixed(2)} EUR`, 72, 88, { align: 'right' });

  // Footer & OSS
  doc.setDrawColor(203, 213, 225);
  doc.line(8, 95, 72, 95);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('¡Gracias por entrenar con nosotros! OSS 🥋', 40, 104, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Atendido por: ${data.staffName || 'Mario / David'}`, 40, 109, { align: 'center' });
  doc.text('www.247studio.es', 40, 113, { align: 'center' });

  return doc;
}

export async function downloadReceiptPdf(data: ReceiptData): Promise<void> {
  const doc = await generatePosReceiptPdf(data);
  doc.save(`Recibo_247_${data.receiptNumber}.pdf`);
}

