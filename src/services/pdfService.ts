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
    const margin = 20;
    const contentW = W - margin * 2;

    // Print-safe color palette
    const primaryText: RGB = [13, 17, 23];      // #0D1117
    const secondaryText: RGB = [82, 96, 109];   // #52606D
    const mutedText: RGB = [154, 163, 175];     // #9AA3AF
    const goldAccent: RGB = [196, 154, 42];     // #C49A2A
    const divider: RGB = [221, 225, 233];       // #DDE1E9
    const tableHeaderBg: RGB = [247, 248, 250]; // #F7F8FA
    const highlightRow: RGB = [254, 252, 243];   // #FEFCF3
    const white: RGB = [255, 255, 255];
    const green: RGB = [26, 138, 96];           // #1A8A60
    const red: RGB = [184, 48, 48];             // #B83030

    // ──────────────────────────────────────────
    //  GOLD TOP BAR
    // ──────────────────────────────────────────
    doc.setFillColor(...goldAccent);
    doc.rect(0, 0, W, 2.5);

    // ──────────────────────────────────────────
    //  HEADER — two columns
    // ──────────────────────────────────────────
    let yPos = 15;

    // Left column (100mm wide) - Business info
    if (data.logoDataUrl) {
      try {
        doc.addImage(data.logoDataUrl, 'PNG', margin, yPos, 28, 20);
      } catch { /* skip logo */ }
      yPos += 25;
    }

    const businessX = data.logoDataUrl ? margin : margin;
    doc.setTextColor(...primaryText);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(data.businessName, businessX, yPos);

    yPos += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...mutedText);
    if (data.businessAddress) {
      const addrLines = doc.splitTextToSize(data.businessAddress, 100);
      doc.text(addrLines, businessX, yPos);
      yPos += addrLines.length * 4;
    }
    if (data.businessPhone) {
      doc.text(data.businessPhone, businessX, yPos);
      yPos += 4;
    }
    if (data.businessEmail) {
      doc.text(data.businessEmail, businessX, yPos);
      yPos += 4;
    }
    if (data.vatNumber) {
      doc.text('VAT Reg: ' + data.vatNumber, businessX, yPos);
      yPos += 4;
    }

    // Right column (65mm wide, right-aligned) - Invoice details
    const rightColX = W - margin;
    yPos = 15;
    
    doc.setTextColor(...primaryText);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('INVOICE', rightColX, yPos, { align: 'right' });

    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...mutedText);
    doc.text(data.invoiceNumber, rightColX, yPos, { align: 'right' });

    yPos += 6;
    // Gold divider line
    doc.setDrawColor(...goldAccent);
    doc.setLineWidth(0.5);
    doc.line(rightColX - 65, yPos, rightColX, yPos);

    yPos += 8;
    // Invoice metadata
    const metadata = [
      { label: 'ISSUED', value: data.invoiceDate, bold: false },
      { label: 'DUE', value: data.dueDate, bold: true },
      { label: 'STATUS', value: data.status.replace(/_/g, ' ').toUpperCase(), bold: false }
    ];

    metadata.forEach(({ label, value, bold }) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...secondaryText);
      doc.text(label, rightColX - 65, yPos, { align: 'left' });
      
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(8);
      if (label === 'STATUS') {
        if (value === 'PAID') {
          doc.setTextColor(...green);
        } else if (value === 'OVERDUE') {
          doc.setTextColor(...red);
        } else {
          doc.setTextColor(...secondaryText);
        }
      } else {
        doc.setTextColor(...primaryText);
      }
      doc.text(value, rightColX, yPos, { align: 'right' });
      yPos += 6;
    });

    // Custom fields in header
    if (data.customField1) {
      yPos += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...secondaryText);
      doc.text('CUSTOM FIELD', rightColX - 65, yPos, { align: 'left' });
      doc.setTextColor(...primaryText);
      doc.text(data.customField1, rightColX, yPos, { align: 'right' });
    }

    const paymentReference = data.customField2 || data.invoiceNumber;
    if (paymentReference) {
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...secondaryText);
      doc.text('REFERENCE', rightColX - 65, yPos, { align: 'left' });
      doc.setTextColor(...primaryText);
      doc.text(paymentReference, rightColX, yPos, { align: 'right' });
    }

    // ──────────────────────────────────────────
    //  THIN FULL-WIDTH DIVIDER
    // ──────────────────────────────────────────
    yPos = Math.max(yPos + 12, 65);
    doc.setDrawColor(...divider);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, W - margin, yPos);
    yPos += 8;

    // ──────────────────────────────────────────
    //  BILL TO + INVOICE META — two columns
    // ──────────────────────────────────────────
    
    yPos = this.checkPage(doc, yPos, 40, margin);
    
    // Left column - BILL TO
    doc.setTextColor(...mutedText);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('BILL TO', margin, yPos);
    
    yPos += 4;
    
    doc.setTextColor(...primaryText);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(data.clientName, margin, yPos);
    
    yPos += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...secondaryText);
    if (data.clientAddress) {
      const addrLines = doc.splitTextToSize(data.clientAddress, 80);
      doc.text(addrLines, margin, yPos);
      yPos += addrLines.length * 4;
    }
    if (data.clientEmail) {
      doc.text(data.clientEmail, margin, yPos);
      yPos += 4;
    }

    // ──────────────────────────────────────────
    //  THIN DIVIDER
    // ──────────────────────────────────────────
    yPos += 4;
    doc.setDrawColor(...divider);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, W - margin, yPos);
    yPos += 8;

    // ──────────────────────────────────────────
    //  LINE ITEMS TABLE
    // ──────────────────────────────────────────
    
    yPos = this.checkPage(doc, yPos, 40, margin);
    
    const tableHeaders = [['Description', 'Quantity', 'Rate', 'Amount']];
    const tableData = data.items.map(item => [
      item.description,
      item.quantity.toString(),
      this.fmt(item.rate),
      this.fmt(item.amount)
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: yPos,
      margin: { left: margin, right: margin },
      theme: 'plain',
      headStyles: {
        fillColor: tableHeaderBg,
        textColor: mutedText,
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: { top: 6, bottom: 6, left: 3, right: 3 },
      },
      bodyStyles: {
        fillColor: white,
        textColor: secondaryText,
        fontSize: 9,
        cellPadding: { top: 7, bottom: 7, left: 3, right: 3 },
        lineWidth: 0.3,
      },
      alternateRowStyles: {
        fillColor: [250, 251, 252],
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 38, halign: 'right' },
        3: { cellWidth: 42, halign: 'right', fontStyle: 'bold' },
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.row.index < data.table.body.length - 1) {
          const rowY = data.cell.y + data.cell.height;
          doc.setDrawColor(...divider);
          doc.setLineWidth(0.3);
          doc.line(margin, rowY, W - margin, rowY);
        }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;

    // ──────────────────────────────────────────
    //  TOTALS BLOCK — right-aligned column
    // ──────────────────────────────────────────
    
    yPos = this.checkPage(doc, yPos, 60, margin);
    
    const totalsW = 100;
    const totalsX = W - margin - totalsW;

    // Subtotal row
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...secondaryText);
    doc.text('Subtotal', totalsX, yPos);
    doc.setTextColor(...primaryText);
    doc.text(this.fmt(data.subtotal), W - margin, yPos, { align: 'right' });
    yPos += 8;

    // VAT row
    if (data.tax && data.taxRate) {
      doc.setTextColor(...secondaryText);
      doc.text('VAT (' + data.taxRate + '%)', totalsX, yPos);
      doc.setTextColor(...primaryText);
      doc.text(this.fmt(data.tax), W - margin, yPos, { align: 'right' });
      yPos += 8;
    }

    // Thin divider line
    doc.setDrawColor(...divider);
    doc.setLineWidth(0.3);
    doc.line(totalsX, yPos, W - margin, yPos);
    yPos += 8;

    // TOTAL DUE row with gold accent
    doc.setFillColor(...highlightRow);
    doc.rect(totalsX, yPos - 2, totalsW, 10, 'F');
    doc.setDrawColor(...goldAccent);
    doc.setLineWidth(3);
    doc.line(totalsX, yPos - 2, totalsX, yPos + 8);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryText);
    doc.text('TOTAL DUE', totalsX, yPos + 4);
    doc.setFontSize(16);
    doc.text(this.fmt(data.total), W - margin, yPos + 4, { align: 'right' });
    yPos += 15;

    // Payment status
    if (data.amountPaid !== undefined && data.amountPaid > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...secondaryText);
      doc.text('Amount Paid', totalsX, yPos);
      doc.setTextColor(...green);
      doc.text(this.fmt(data.amountPaid), W - margin, yPos, { align: 'right' });
      yPos += 8;
      
      if (data.balance !== undefined && data.balance > 0) {
        doc.setTextColor(...secondaryText);
        doc.text('Balance Due', totalsX, yPos);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryText);
        doc.text(this.fmt(data.balance), W - margin, yPos, { align: 'right' });
        yPos += 8;
      }
      
      if (data.balance === 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...green);
        doc.text('Paid in Full', W - margin, yPos, { align: 'right' });
        yPos += 8;
      }
    }

    // ──────────────────────────────────────────
    //  PAYMENT DETAILS
    // ──────────────────────────────────────────
    
    if (data.bankingDetails?.bank) {
      yPos = this.checkPage(doc, yPos, 50, margin);
      
      // Section label
      doc.setTextColor(...mutedText);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('PAYMENT DETAILS', margin, yPos);
      
      yPos += 6;
      // Thin gold line
      doc.setDrawColor(...goldAccent);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, margin + 30, yPos);
      yPos += 10;
      
      // Banking information in two columns
      const bankInfo = [
        ['Bank', data.bankingDetails.bank],
        ['Account Number', data.bankingDetails.account],
        ['Branch Code', data.bankingDetails.branch],
        ['Account Type', data.bankingDetails.type],
      ];
      
      const paymentReference = data.customField2 || data.invoiceNumber;
      if (paymentReference) {
        bankInfo.push(['Reference', paymentReference]);
      }

      bankInfo.forEach(([label, value], index) => {
        const y = yPos + (index * 8);
        doc.setTextColor(...mutedText);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(label, margin, y);
        
        if (label === 'Reference') {
          doc.setTextColor(...goldAccent);
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setTextColor(...primaryText);
          doc.setFont('helvetica', 'normal');
        }
        doc.setFontSize(8);
        doc.text(value, margin + 70, y);
      });
      
      yPos += bankInfo.length * 8 + 10;
      
      // Reference note
      if (data.bankingDetails.reference) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(...mutedText);
        doc.text('Please use this exact reference when making your EFT payment.', margin, yPos);
        yPos += 8;
      }
    }

    // ──────────────────────────────────────────
    //  NOTES
    // ──────────────────────────────────────────
    
    // Only show notes if there's actual note content (custom fields are now in header)
    const hasNotes = data.customField1 || data.customField2;
    if (hasNotes) {
      yPos = this.checkPage(doc, yPos, 30, margin);
      
      // Section label
      doc.setTextColor(...mutedText);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('NOTES', margin, yPos);
      
      yPos += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...secondaryText);
      
      if (data.customField1) {
        const lines = doc.splitTextToSize(data.customField1, contentW);
        doc.text(lines, margin, yPos);
        yPos += lines.length * 6;
      }
      if (data.customField2) {
        const lines = doc.splitTextToSize(data.customField2, contentW);
        doc.text(lines, margin, yPos);
      }
    }

    // ──────────────────────────────────────────
    //  FOOTER
    // ──────────────────────────────────────────
    
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      const footerY = H - 20;
      
      // Thin full-width divider line
      doc.setDrawColor(...divider);
      doc.setLineWidth(0.3);
      doc.line(margin, footerY, W - margin, footerY);
      
      // Left: business name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...mutedText);
      doc.text(data.businessName, margin, footerY + 8);
      
      // Right: page number (only if more than 1 page)
      if (totalPages > 1) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...mutedText);
        doc.text('Page ' + p + ' of ' + totalPages, W - margin, footerY + 8, { align: 'right' });
      }
      
      // Centre: NextOffice attribution
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...mutedText);
      doc.text('Generated by NextOffice · nextoffice.co.za', W / 2, footerY + 8, { align: 'center' });
    }

    // ──────────────────────────────────────────
    //  GOLD BOTTOM BAR
    // ──────────────────────────────────────────
    
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFillColor(...goldAccent);
      doc.rect(0, H - 2, W, 2);
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
