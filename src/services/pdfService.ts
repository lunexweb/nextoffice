import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoicePDFData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;

  // Business Info
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  vatNumber?: string;

  // Client Info
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;

  // Invoice Items
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;

  // Totals
  subtotal: number;
  tax?: number;
  taxRate?: number;
  total: number;

  // Payment Info
  amountPaid?: number;
  balance?: number;

  // Banking Details
  bankingDetails?: {
    bank: string;
    account: string;
    branch: string;
    type: string;
    reference?: string;
  };

  // Custom Fields
  customField1?: string;
  customField2?: string;

  // Notes
  notes?: string;
  terms?: string;

  // Logo
  logoUrl?: string;
  logoDataUrl?: string;
}

class PDFService {
  private fmt(n: number): string {
    return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  generateInvoicePDF(data: InvoicePDFData): jsPDF {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const margin = 15;
    const contentW = W - margin * 2;

    // ── Palette ──────────────────────────────────────────────────────────────
    const ink: [number, number, number]       = [15,  23,  42];   // slate-900
    const gold: [number, number, number]      = [180, 140, 40];   // golden accent
    const muted: [number, number, number]     = [100, 116, 139];  // slate-500
    const light: [number, number, number]     = [248, 250, 252];  // slate-50
    const border: [number, number, number]    = [226, 232, 240];  // slate-200
    const greenBg: [number, number, number]   = [220, 252, 231];  // green-100
    const greenTx: [number, number, number]   = [22,  101, 52];   // green-800

    // ── Header band ──────────────────────────────────────────────────────────
    doc.setFillColor(...ink);
    doc.rect(0, 0, W, 36, 'F');

    // Gold accent bar
    doc.setFillColor(...gold);
    doc.rect(0, 36, W, 2, 'F');

    // Logo (if provided as dataUrl) + Business name
    let logoOffset = 0;
    if (data.logoDataUrl) {
      try {
        doc.addImage(data.logoDataUrl, 'PNG', margin, 6, 24, 24);
        logoOffset = 28;
      } catch { /* skip logo if it fails */ }
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(data.businessName, margin + logoOffset, 16);

    // Business sub-info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 190, 210);
    const bizParts: string[] = [];
    if (data.businessAddress) bizParts.push(data.businessAddress);
    if (data.businessPhone)   bizParts.push(data.businessPhone);
    if (data.businessEmail)   bizParts.push(data.businessEmail);
    if (data.vatNumber)       bizParts.push(`VAT: ${data.vatNumber}`);
    if (bizParts.length) {
      const bizLine = bizParts.join('  ·  ');
      const maxBizW = W - margin * 2 - 60;
      const truncated = doc.splitTextToSize(bizLine, maxBizW);
      doc.text(truncated[0], margin + logoOffset, 25);
      if (truncated.length > 1) {
        doc.text(truncated[1], margin + logoOffset, 31);
      }
    }

    // "INVOICE" label right-side
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('INVOICE', W - margin, 18, { align: 'right' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 190, 210);
    doc.text(data.invoiceNumber, W - margin, 26, { align: 'right' });

    let y = 46;

    // ── Invoice meta row ─────────────────────────────────────────────────────
    // Left: Bill To   Right: Invoice details
    const col2 = W / 2 + 5;

    // Bill To
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...gold);
    doc.text('BILL TO', margin, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...ink);
    doc.text(data.clientName, margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...muted);
    if (data.clientEmail)   { doc.text(data.clientEmail, margin, y);   y += 4.5; }
    if (data.clientAddress) { doc.text(data.clientAddress, margin, y); y += 4.5; }

    // Invoice details (right column, same row start)
    const detailStartY = 46;
    const labelX = col2;
    const valueX = W - margin;

    const detailRows: [string, string][] = [
      ['Invoice No.', data.invoiceNumber],
      ['Invoice Date', data.invoiceDate],
      ['Due Date', data.dueDate],
    ];
    if (data.customField1) detailRows.push(['', data.customField1]);
    if (data.customField2) detailRows.push(['', data.customField2]);

    let dy = detailStartY;
    detailRows.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...muted);
      if (label) doc.text(label, labelX, dy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...ink);
      doc.text(value, valueX, dy, { align: 'right' });
      dy += 6;
    });

    // Status badge
    const statusLabel = data.status === 'partially_paid' ? 'PARTIAL' : data.status.replace('_', ' ').toUpperCase();
    const isPaid = data.status === 'paid';
    doc.setFillColor(...(isPaid ? greenBg : light));
    doc.roundedRect(labelX, dy, contentW / 2 - 2, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...(isPaid ? greenTx : muted));
    doc.text(statusLabel, labelX + (contentW / 2 - 2) / 2, dy + 5.5, { align: 'center' });

    y = Math.max(y, dy + 14);

    // ── Divider ───────────────────────────────────────────────────────────────
    doc.setDrawColor(...border);
    doc.setLineWidth(0.4);
    doc.line(margin, y, W - margin, y);
    y += 8;

    // ── Line items table ──────────────────────────────────────────────────────
    const tableData = data.items.map(item => [
      item.description,
      item.quantity.toString(),
      this.fmt(item.rate),
      this.fmt(item.amount),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Description', 'Qty', 'Unit Price', 'Amount']],
      body: tableData,
      theme: 'plain',
      headStyles: {
        fillColor: ink,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      },
      alternateRowStyles: { fillColor: light },
      bodyStyles: {
        fontSize: 9,
        textColor: ink,
        cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      },
      columnStyles: {
        0: { cellWidth: 85 },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 38, halign: 'right' },
        3: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });

    y = ((doc as any).lastAutoTable?.finalY ?? y + 30) + 8;

    // ── Totals block ──────────────────────────────────────────────────────────
    const totW = 85;
    const totX = W - margin - totW;
    const totValX = W - margin;
    const rowH = 8;

    const addTotalRow = (label: string, value: string, bold = false, highlight = false) => {
      if (highlight) {
        y += 2;
        doc.setFillColor(...ink);
        doc.rect(totX, y - 5, totW, rowH + 2, 'F');
        doc.setTextColor(255, 255, 255);
      } else {
        doc.setTextColor(...(bold ? ink : muted));
      }
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(highlight ? 10 : 9);
      doc.text(label, totX + 3, y);
      doc.text(value, totValX - 2, y, { align: 'right' });
      if (!highlight) doc.setTextColor(...ink);
      y += rowH;
    };

    // Subtotal row
    addTotalRow('Subtotal (excl. VAT)', this.fmt(data.subtotal));

    // VAT row
    if (data.tax != null && data.taxRate != null) {
      addTotalRow(`VAT (${data.taxRate}%)`, this.fmt(data.tax));
      // thin separator before total
      y += 2;
      doc.setDrawColor(...border);
      doc.setLineWidth(0.3);
      doc.line(totX, y - rowH + 1, W - margin, y - rowH + 1);
    }

    // Total
    addTotalRow('TOTAL', this.fmt(data.total), true, true);
    y += 3;

    // Amount paid / balance due
    if (data.amountPaid != null && data.amountPaid > 0) {
      addTotalRow('Amount Paid', this.fmt(data.amountPaid));
      // gold separator before balance
      y += 2;
      doc.setDrawColor(...gold);
      doc.setLineWidth(0.4);
      doc.line(totX, y - rowH + 1, W - margin, y - rowH + 1);
      const bal = data.balance ?? data.total - data.amountPaid;
      addTotalRow('BALANCE DUE', this.fmt(Math.abs(bal)), true);
    }

    y += 8;

    // ── Banking Details ───────────────────────────────────────────────────────
    if (data.bankingDetails) {
      const bd = data.bankingDetails;
      doc.setFillColor(...light);
      doc.setDrawColor(...border);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y, contentW, 32, 2, 2, 'FD');

      // Gold left accent bar
      doc.setFillColor(...gold);
      doc.rect(margin, y, 3, 32, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...gold);
      doc.text('BANKING DETAILS', margin + 7, y + 6);

      const bdCols = [margin + 7, margin + 7 + contentW / 4, margin + 7 + contentW / 2, margin + 7 + (contentW * 3) / 4];
      const bdItems: [string, string][] = [
        ['Bank', bd.bank],
        ['Account No.', bd.account],
        ['Branch Code', bd.branch],
        ['Reference', bd.reference || data.invoiceNumber],
      ];

      bdItems.forEach(([label, value], i) => {
        const cx = bdCols[i];
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...muted);
        doc.text(label, cx, y + 14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...ink);
        doc.text(value, cx, y + 21);
      });

      y += 38;
    }

    // ── Notes ─────────────────────────────────────────────────────────────────
    if (data.notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...muted);
      doc.text('NOTES', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...ink);
      const lines = doc.splitTextToSize(data.notes, contentW);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 6;
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const pageH = doc.internal.pageSize.height;
    doc.setDrawColor(...border);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 14, W - margin, pageH - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text(`${data.businessName}  ·  Generated ${new Date().toLocaleDateString('en-ZA')}`, margin, pageH - 8);
    doc.text(`Due: ${data.dueDate}`, W - margin, pageH - 8, { align: 'right' });

    return doc;
  }
  
  downloadInvoicePDF(data: InvoicePDFData, filename?: string): void {
    const doc = this.generateInvoicePDF(data);
    const pdfFilename = filename || `Invoice_${data.invoiceNumber}.pdf`;
    doc.save(pdfFilename);
  }
  
  previewInvoicePDF(data: InvoicePDFData): void {
    const doc = this.generateInvoicePDF(data);
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
  }
  
  getInvoicePDFBlob(data: InvoicePDFData): Blob {
    const doc = this.generateInvoicePDF(data);
    return doc.output('blob');
  }
  
  getInvoicePDFDataURL(data: InvoicePDFData): string {
    const doc = this.generateInvoicePDF(data);
    return doc.output('dataurlstring');
  }
}

export const pdfService = new PDFService();
