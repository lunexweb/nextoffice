import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoicePDFData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  vatNumber?: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax?: number;
  taxRate?: number;
  total: number;
  amountPaid?: number;
  balance?: number;
  bankingDetails?: {
    bank: string;
    account: string;
    branch: string;
    type: string;
    reference?: string;
  };
  customField1?: string;
  customField2?: string;
  logoUrl?: string;
  logoDataUrl?: string;
}

type RGB = [number, number, number];

class PDFService {
  private fmt(n: number): string {
    return 'R ' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private checkPage(doc: jsPDF, yPos: number, needed: number, margin: number): number {
    const H = doc.internal.pageSize.getHeight();
    if (yPos + needed > H - 30) {
      doc.addPage();
      return margin;
    }
    return yPos;
  }

  generateInvoicePDF(data: InvoicePDFData): jsPDF {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const m = 20;
    const contentW = W - m * 2;

    // Colors
    const charcoal: RGB = [45, 45, 45];
    const dark: RGB = [33, 33, 33];
    const mid: RGB = [100, 100, 100];
    const light: RGB = [155, 155, 155];
    const veryLight: RGB = [245, 245, 245];
    const white: RGB = [255, 255, 255];
    const accent: RGB = [45, 45, 45];
    const green: RGB = [39, 174, 96];

    // ──────────────────────────────────────────
    //  HEADER BAND (dark charcoal)
    // ──────────────────────────────────────────
    const headerH = 52;
    doc.setFillColor(...charcoal);
    doc.rect(0, 0, W, headerH);

    // Business info in header (top-left, inside dark band)
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(data.businessName.toUpperCase(), m, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const headerInfo: string[] = [];
    if (data.businessAddress) headerInfo.push(data.businessAddress);
    if (data.businessPhone) headerInfo.push('Tel: ' + data.businessPhone);
    if (data.businessEmail) headerInfo.push(data.businessEmail);
    if (data.vatNumber) headerInfo.push('VAT: ' + data.vatNumber);
    doc.setTextColor(200, 200, 200);
    headerInfo.forEach((line, i) => {
      doc.text(line, m, 24 + i * 4.5);
    });

    // Logo (top-right, inside dark band)
    if (data.logoDataUrl) {
      try {
        doc.addImage(data.logoDataUrl, 'PNG', W - m - 30, 10, 30, 30);
      } catch { /* skip */ }
    }

    // ──────────────────────────────────────────
    //  INVOICE TITLE BAR
    // ──────────────────────────────────────────
    const titleBarY = headerH;
    const titleBarH = 18;
    doc.setFillColor(80, 80, 80);
    doc.rect(0, titleBarY, W, titleBarH);

    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('INVOICE', W / 2, titleBarY + 12, { align: 'center' });

    let y = titleBarY + titleBarH + 12;

    // ──────────────────────────────────────────
    //  INVOICE DETAILS ROW
    // ──────────────────────────────────────────
    const colW = contentW / 4;

    // Invoice No
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...light);
    doc.text('INVOICE NO.', m, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...dark);
    doc.text(data.invoiceNumber, m, y + 6);

    // Date
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...light);
    doc.text('DATE', m + colW, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text(data.invoiceDate, m + colW, y + 6);

    // Due Date
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...light);
    doc.text('DUE DATE', m + colW * 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text(data.dueDate, m + colW * 2, y + 6);

    // Status
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...light);
    doc.text('STATUS', m + colW * 3, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const statusLabel = data.status.replace(/_/g, ' ').toUpperCase();
    if (data.status === 'paid') {
      doc.setTextColor(...green);
    } else if (data.status === 'overdue') {
      doc.setTextColor(220, 53, 69);
    } else {
      doc.setTextColor(...dark);
    }
    doc.text(statusLabel, m + colW * 3, y + 6);

    y += 18;

    // Divider
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(m, y, W - m, y);
    y += 10;

    // ──────────────────────────────────────────
    //  BILL TO + CUSTOM FIELDS
    // ──────────────────────────────────────────
    const billToX = m;
    const fieldsX = m + contentW / 2 + 10;

    // Bill To (left)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...light);
    doc.text('BILL TO', billToX, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...dark);
    doc.text(data.clientName, billToX, y);

    let clientY = y + 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...mid);
    if (data.clientAddress) {
      const addrLines = doc.splitTextToSize(data.clientAddress, contentW / 2 - 10);
      doc.text(addrLines, billToX, clientY);
      clientY += addrLines.length * 5;
    }
    if (data.clientEmail) {
      doc.text(data.clientEmail, billToX, clientY);
      clientY += 5;
    }

    // Custom Field 1 and Reference (right side)
    let fieldY = y - 6;
    if (data.customField1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...light);
      doc.text('CUSTOM FIELD', fieldsX, fieldY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text(data.customField1, fieldsX, fieldY + 6);
      fieldY += 16;
    }
    if (data.customField2) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...light);
      doc.text('REFERENCE', fieldsX, fieldY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text(data.customField2, fieldsX, fieldY + 6);
      fieldY += 16;
    }

    y = Math.max(clientY, fieldY) + 8;

    // ──────────────────────────────────────────
    //  ITEMS TABLE
    // ──────────────────────────────────────────
    const tableHead = [['Description', 'Qty', 'Unit Price', 'Amount']];
    const tableBody = data.items.map(item => [
      item.description,
      item.quantity.toString(),
      this.fmt(item.rate),
      this.fmt(item.amount),
    ]);

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: y,
      margin: { left: m, right: m },
      theme: 'plain',
      headStyles: {
        fillColor: charcoal as any,
        textColor: white as any,
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      },
      bodyStyles: {
        textColor: dark as any,
        fontSize: 9,
        cellPadding: { top: 6, bottom: 6, left: 6, right: 6 },
        lineWidth: 0,
      },
      alternateRowStyles: {
        fillColor: veryLight as any,
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' as const },
        1: { cellWidth: 22, halign: 'center' as const },
        2: { cellWidth: 35, halign: 'right' as const },
        3: { cellWidth: 40, halign: 'right' as const, fontStyle: 'bold' as const },
      },
      didDrawCell: (cellData: any) => {
        if (cellData.section === 'body') {
          const rowY = cellData.cell.y + cellData.cell.height;
          doc.setDrawColor(230, 230, 230);
          doc.setLineWidth(0.3);
          doc.line(m, rowY, W - m, rowY);
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // ──────────────────────────────────────────
    //  TOTALS (right-aligned)
    // ──────────────────────────────────────────
    y = this.checkPage(doc, y, 50, m);

    const totLabelX = W - m - 55;
    const totValueX = W - m;

    // Subtotal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...mid);
    doc.text('Subtotal', totLabelX, y, { align: 'right' });
    doc.setTextColor(...dark);
    doc.text(this.fmt(data.subtotal), totValueX, y, { align: 'right' });
    y += 8;

    // Tax
    if (data.tax && data.taxRate) {
      doc.setTextColor(...mid);
      doc.text('VAT (' + data.taxRate + '%)', totLabelX, y, { align: 'right' });
      doc.setTextColor(...dark);
      doc.text(this.fmt(data.tax), totValueX, y, { align: 'right' });
      y += 8;
    }

    // Total line
    doc.setDrawColor(...charcoal);
    doc.setLineWidth(0.8);
    doc.line(totLabelX - 10, y, totValueX, y);
    y += 8;

    // Total
    doc.setFillColor(...charcoal);
    doc.rect(totLabelX - 15, y - 5, totValueX - totLabelX + 15, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...white);
    doc.text('TOTAL', totLabelX - 5, y + 4, { align: 'right' });
    doc.setFontSize(13);
    doc.text(this.fmt(data.total), totValueX - 3, y + 4, { align: 'right' });
    y += 20;

    // ──────────────────────────────────────────
    //  PAYMENT STATUS
    // ──────────────────────────────────────────
    if (data.amountPaid !== undefined && data.amountPaid > 0) {
      y = this.checkPage(doc, y, 25, m);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...mid);
      doc.text('Amount Paid', totLabelX, y, { align: 'right' });
      doc.setTextColor(...green);
      doc.text(this.fmt(data.amountPaid), totValueX, y, { align: 'right' });
      y += 7;

      if (data.balance !== undefined && data.balance > 0) {
        doc.setTextColor(...mid);
        doc.text('Balance Due', totLabelX, y, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...dark);
        doc.text(this.fmt(data.balance), totValueX, y, { align: 'right' });
        y += 7;
      }

      if (data.balance === 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...green);
        doc.text('PAID IN FULL', totValueX, y, { align: 'right' });
        y += 7;
      }
      y += 8;
    }

    // ──────────────────────────────────────────
    //  BANKING DETAILS
    // ──────────────────────────────────────────
    if (data.bankingDetails && data.bankingDetails.bank) {
      y = this.checkPage(doc, y, 45, m);

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(m, y, W - m, y);
      y += 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...charcoal);
      doc.text('PAYMENT DETAILS', m, y);
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...dark);

      const bankRows = [
        ['Bank', data.bankingDetails.bank],
        ['Account No.', data.bankingDetails.account],
        ['Branch Code', data.bankingDetails.branch],
        ['Account Type', data.bankingDetails.type],
      ];
      if (data.bankingDetails.reference) {
        bankRows.push(['Reference', data.bankingDetails.reference]);
      }

      bankRows.forEach(([label, value]) => {
        doc.setTextColor(...light);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(label, m, y);
        doc.setTextColor(...dark);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(value, m + 35, y);
        y += 6;
      });
      y += 4;
    }

    // ──────────────────────────────────────────
    //  NOTES (Custom Field 1 + Custom Field 2 if they contain longer text)
    // ──────────────────────────────────────────
    const hasNotes = (data.customField1 && data.customField1.length > 30) || (data.customField2 && data.customField2.length > 30);
    if (hasNotes) {
      y = this.checkPage(doc, y, 30, m);

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(m, y, W - m, y);
      y += 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...charcoal);
      doc.text('ADDITIONAL NOTES', m, y);
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...dark);

      if (data.customField1 && data.customField1.length > 30) {
        const lines = doc.splitTextToSize(data.customField1, contentW);
        doc.text(lines, m, y);
        y += lines.length * 5;
      }
      if (data.customField2 && data.customField2.length > 30) {
        const lines = doc.splitTextToSize(data.customField2, contentW);
        doc.text(lines, m, y);
        y += lines.length * 5;
      }
    }

    // ──────────────────────────────────────────
    //  FOOTER
    // ──────────────────────────────────────────
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      const fY = H - 18;

      // Footer line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(m, fY, W - m, fY);

      // Thank you
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...mid);
      doc.text('Thank you for your business', m, fY + 7);

      // Page number
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...light);
      if (totalPages > 1) {
        doc.text('Page ' + p + ' of ' + totalPages, W - m, fY + 7, { align: 'right' });
      }

      // Business name
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(...light);
      doc.text(data.businessName, W / 2, fY + 7, { align: 'center' });
    }

    return doc;
  }

  downloadInvoicePDF(data: InvoicePDFData, filename?: string) {
    const doc = this.generateInvoicePDF(data);
    doc.save(filename || 'invoice-' + data.invoiceNumber + '.pdf');
  }

  previewInvoicePDF(data: InvoicePDFData) {
    const doc = this.generateInvoicePDF(data);
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  }
}

export default new PDFService();
