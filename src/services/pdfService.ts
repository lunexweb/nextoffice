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
    const margin = 25;

    // Modern color palette
    const primary: RGB = [99, 102, 241];      // Indigo
    const primaryLight: RGB = [129, 140, 248]; // Light indigo
    const dark: RGB = [17, 24, 39];           // Dark slate
    const gray: RGB = [107, 114, 128];        // Medium gray
    const lightGray: RGB = [229, 231, 235];   // Light gray
    const white: RGB = [255, 255, 255];
    const success: RGB = [34, 197, 94];      // Green
    const warning: RGB = [251, 146, 60];     // Orange

    let yPos = margin;

    // ──────────────────────────────────────────
    //  MODERN HEADER WITH SUBTLE ACCENT
    // ──────────────────────────────────────────
    
    // Top accent bar
    doc.setFillColor(...primary);
    doc.rect(0, 0, W, 3);

    yPos = 18;

    // Logo and business info side by side
    if (data.logoDataUrl) {
      try {
        doc.addImage(data.logoDataUrl, 'PNG', margin, yPos, 35, 25);
      } catch { /* skip logo */ }
    }

    // Business name and contact info (right side or below logo)
    const businessX = data.logoDataUrl ? margin + 45 : margin;
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(data.businessName, businessX, yPos + 8);

    yPos += 20;
    
    // Business contact details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...gray);
    let businessY = yPos + 8;
    if (data.businessAddress) {
      const addrLines = doc.splitTextToSize(data.businessAddress, 120);
      doc.text(addrLines, businessX, businessY);
      businessY += addrLines.length * 5;
    }
    if (data.businessPhone) {
      doc.text('Tel: ' + data.businessPhone, businessX, businessY);
      businessY += 5;
    }
    if (data.businessEmail) {
      doc.text('Email: ' + data.businessEmail, businessX, businessY);
      businessY += 5;
    }
    if (data.vatNumber) {
      doc.text('VAT No: ' + data.vatNumber, businessX, businessY);
    }

    // Invoice details box (top right)
    const detailsBoxY = yPos;
    const detailsBoxW = 80;
    const detailsBoxX = W - margin - detailsBoxW;
    
    // Subtle background for details
    doc.setFillColor(...lightGray);
    doc.roundedRect(detailsBoxX, detailsBoxY, detailsBoxW, 65, 8);

    // Invoice title
    doc.setTextColor(...primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('INVOICE', detailsBoxX + detailsBoxW / 2, detailsBoxY + 20, { align: 'center' });

    // Invoice details
    const details = [
      { label: 'Number', value: data.invoiceNumber },
      { label: 'Date', value: data.invoiceDate },
      { label: 'Due Date', value: data.dueDate },
      { label: 'Status', value: data.status.replace(/_/g, ' ').toUpperCase() }
    ];

    let detailY = detailsBoxY + 32;
    details.forEach(({ label, value }) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...gray);
      doc.text(label + ':', detailsBoxX + 10, detailY);
      
      doc.setFont('helvetica', value === 'Status' ? 'bold' : 'normal');
      doc.setFontSize(10);
      if (value === 'PAID') {
        doc.setTextColor(...success);
      } else if (value === 'OVERDUE') {
        doc.setTextColor(...warning);
      } else {
        doc.setTextColor(...dark);
      }
      doc.text(value, detailsBoxX + 10, detailY + 6);
      detailY += 12;
    });

    yPos = businessY + 20;

    // ──────────────────────────────────────────
    //  BILL TO SECTION
    // ──────────────────────────────────────────
    
    yPos = this.checkPage(doc, yPos, 60, margin);
    
    // Section header
    doc.setTextColor(...primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('BILL TO', margin, yPos);
    
    yPos += 8;
    
    // Subtle divider
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(1);
    doc.line(margin, yPos, margin + 60, yPos);
    
    yPos += 10;
    
    // Client information
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(data.clientName, margin, yPos);
    
    yPos += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...gray);
    if (data.clientAddress) {
      const addrLines = doc.splitTextToSize(data.clientAddress, W - margin * 2 - 100);
      doc.text(addrLines, margin, yPos);
      yPos += addrLines.length * 5;
    }
    if (data.clientEmail) {
      doc.text(data.clientEmail, margin, yPos);
      yPos += 5;
    }

    // ──────────────────────────────────────────
    //  ITEMS TABLE
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
      theme: 'striped',
      headStyles: {
        fillColor: primary,
        textColor: white,
        fontStyle: 'bold',
        fontSize: 11,
        cellPadding: { top: 8, bottom: 8, left: 10, right: 10 },
        halign: 'left',
      },
      bodyStyles: {
        fillColor: white,
        textColor: dark,
        fontSize: 10,
        cellPadding: { top: 10, bottom: 10, left: 10, right: 10 },
        lineWidth: 0.5,
        lineColor: lightGray,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left', fontStyle: 'normal' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 45, halign: 'right' },
        3: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
      },
      lineColor: lightGray,
      lineWidth: 0.5,
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;

    // ──────────────────────────────────────────
    //  TOTALS SECTION
    // ──────────────────────────────────────────
    
    yPos = this.checkPage(doc, yPos, 80, margin);
    
    const totalsBoxW = 120;
    const totalsBoxX = W - margin - totalsBoxW;
    
    // Modern totals box with rounded corners
    doc.setFillColor(...lightGray);
    doc.roundedRect(totalsBoxX - 10, yPos - 10, totalsBoxW + 20, 80, 8);
    
    // Subtotal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...gray);
    doc.text('Subtotal', totalsBoxX, yPos);
    doc.setTextColor(...dark);
    doc.text(this.fmt(data.subtotal), W - margin, yPos, { align: 'right' });
    yPos += 12;

    // Tax
    if (data.tax && data.taxRate) {
      doc.setTextColor(...gray);
      doc.text('VAT (' + data.taxRate + '%)', totalsBoxX, yPos);
      doc.setTextColor(...dark);
      doc.text(this.fmt(data.tax), W - margin, yPos, { align: 'right' });
      yPos += 12;
    }

    // Divider before total
    doc.setDrawColor(...gray);
    doc.setLineWidth(1);
    doc.line(totalsBoxX, yPos, W - margin, yPos);
    yPos += 12;

    // Total with accent background
    doc.setFillColor(...primary);
    doc.roundedRect(totalsBoxX - 5, yPos - 8, totalsBoxW + 10, 20, 6);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...white);
    doc.text('TOTAL', totalsBoxX, yPos);
    doc.setFontSize(16);
    doc.text(this.fmt(data.total), W - margin, yPos, { align: 'right' });
    yPos += 25;

    // Payment status
    if (data.amountPaid !== undefined && data.amountPaid > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...gray);
      doc.text('Amount Paid:', totalsBoxX, yPos);
      doc.setTextColor(...success);
      doc.text(this.fmt(data.amountPaid), W - margin, yPos, { align: 'right' });
      yPos += 10;
      
      if (data.balance !== undefined && data.balance > 0) {
        doc.setTextColor(...gray);
        doc.text('Balance Due:', totalsBoxX, yPos);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...dark);
        doc.text(this.fmt(data.balance), W - margin, yPos, { align: 'right' });
        yPos += 10;
      }
      
      if (data.balance === 0) {
        doc.setFillColor(...success);
        doc.roundedRect(totalsBoxX + 10, yPos - 5, totalsBoxW - 20, 15, 4);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...white);
        doc.text('PAID IN FULL', W - margin - 10, yPos + 3, { align: 'right' });
        yPos += 15;
      }
    }

    // ──────────────────────────────────────────
    //  PAYMENT DETAILS
    // ──────────────────────────────────────────
    
    if (data.bankingDetails?.bank) {
      yPos = this.checkPage(doc, yPos, 50, margin);
      
      // Section header
      doc.setTextColor(...primary);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('PAYMENT DETAILS', margin, yPos);
      
      yPos += 8;
      
      // Divider
      doc.setDrawColor(...lightGray);
      doc.setLineWidth(1);
      doc.line(margin, yPos, margin + 80, yPos);
      yPos += 12;
      
      // Banking information in two columns
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      
      const bankInfo = [
        ['Bank:', data.bankingDetails.bank],
        ['Account Number:', data.bankingDetails.account],
        ['Branch Code:', data.bankingDetails.branch],
        ['Account Type:', data.bankingDetails.type],
      ];
      
      if (data.bankingDetails.reference) {
        bankInfo.push(['Reference:', data.bankingDetails.reference]);
      }
      
      bankInfo.forEach(([label, value], index) => {
        const y = yPos + (index * 8);
        doc.setTextColor(...gray);
        doc.setFont('helvetica', 'bold');
        doc.text(label, margin, y);
        doc.setTextColor(...dark);
        doc.setFont('helvetica', 'normal');
        doc.text(value, margin + 60, y);
      });
      
      yPos += bankInfo.length * 8 + 10;
    }

    // ──────────────────────────────────────────
    //  NOTES
    // ──────────────────────────────────────────
    
    if (data.customField1 || data.customField2) {
      yPos = this.checkPage(doc, yPos, 40, margin);
      
      // Section header
      doc.setTextColor(...primary);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('NOTES', margin, yPos);
      
      yPos += 8;
      
      // Divider
      doc.setDrawColor(...lightGray);
      doc.setLineWidth(1);
      doc.line(margin, yPos, margin + 40, yPos);
      yPos += 12;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      
      if (data.customField1) {
        const lines = doc.splitTextToSize(data.customField1, W - margin * 2);
        doc.text(lines, margin, yPos);
        yPos += lines.length * 6;
      }
      if (data.customField2) {
        const lines = doc.splitTextToSize(data.customField2, W - margin * 2);
        doc.text(lines, margin, yPos);
      }
    }

    // ──────────────────────────────────────────
    //  MODERN FOOTER
    // ──────────────────────────────────────────
    
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      const footerY = H - 20;
      
      // Footer accent line
      doc.setFillColor(...primary);
      doc.rect(0, footerY + 10, W, 2);
      
      // Thank you message
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...gray);
      doc.text('Thank you for your business', margin, footerY + 6);
      
      // Page number
      if (totalPages > 1) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text(`Page ${p} of ${totalPages}`, W - margin, footerY + 6, { align: 'right' });
      }
      
      // Business name
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...lightGray);
      doc.text(data.businessName, W / 2, footerY + 6, { align: 'center' });
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
