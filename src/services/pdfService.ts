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

class PDFService {
  private fmt(n: number): string {
    return 'R ' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  generateInvoicePDF(data: InvoicePDFData): jsPDF {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Sophisticated color palette
    const primary = [26, 35, 126];      // Deep professional blue
    const secondary = [92, 107, 192];   // Lighter blue accent
    const dark = [33, 33, 33];         // Rich black
    const gray = [117, 117, 117];      // Medium gray
    const lightGray = [245, 245, 245]; // Very light gray background
    const white = [255, 255, 255];
    const success = [46, 125, 50];     // Professional green
    const divider = [224, 224, 224];   // Subtle divider

    let yPos = margin;

    // Header with accent bar
    doc.setFillColor(...primary);
    doc.rect(0, 0, W, 8);

    yPos = 18;

    // Logo
    if (data.logoDataUrl) {
      try {
        doc.addImage(data.logoDataUrl, 'PNG', margin, yPos, 35, 24);
      } catch { /* skip logo */ }
    }

    // Business name and info
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(data.businessName, margin, yPos + 32);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    let businessY = yPos + 40;
    if (data.businessAddress) {
      doc.text(data.businessAddress, margin, businessY);
      businessY += 5;
    }
    if (data.businessPhone) {
      doc.text('Tel: ' + data.businessPhone, margin, businessY);
      businessY += 5;
    }
    if (data.businessEmail) {
      doc.text('Email: ' + data.businessEmail, margin, businessY);
      businessY += 5;
    }
    if (data.vatNumber) {
      doc.text('VAT No: ' + data.vatNumber, margin, businessY);
    }

    // INVOICE title (top right)
    doc.setTextColor(...primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.text('INVOICE', W - margin, yPos + 8, { align: 'right' });

    // Invoice details box (top right)
    const detailsBoxY = yPos + 20;
    doc.setFillColor(...lightGray);
    doc.rect(W - margin - 60, detailsBoxY, 60, 32);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text('INVOICE NO.', W - margin - 55, detailsBoxY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...dark);
    doc.text(data.invoiceNumber, W - margin - 55, detailsBoxY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text('DATE', W - margin - 55, detailsBoxY + 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.text(data.invoiceDate, W - margin - 55, detailsBoxY + 26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text('DUE DATE', W - margin - 25, detailsBoxY + 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.text(data.dueDate, W - margin - 25, detailsBoxY + 26);

    // Divider line
    yPos = yPos + 55;
    doc.setDrawColor(...divider);
    doc.setLineWidth(1);
    doc.line(margin, yPos, W - margin, yPos);

    // Bill To section with box
    yPos += 12;
    doc.setFillColor(...lightGray);
    doc.rect(margin, yPos - 3, 85, 30);

    doc.setTextColor(...primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('BILL TO', margin + 5, yPos + 3);

    yPos += 10;
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(data.clientName, margin + 5, yPos);

    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    if (data.clientAddress) {
      doc.text(data.clientAddress, margin + 5, yPos);
      yPos += 5;
    }
    if (data.clientEmail) {
      doc.text(data.clientEmail, margin + 5, yPos);
      yPos += 5;
    }

    yPos += 10;

    // Items table
    const tableHeaders = [['Description', 'Qty', 'Rate', 'Amount']];
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
      theme: 'grid',
      headStyles: {
        fillColor: primary,
        textColor: white,
        fontStyle: 'bold',
        fontSize: 10,
        cellPadding: 6,
        halign: 'left',
      },
      bodyStyles: {
        fillColor: white,
        textColor: dark,
        fontSize: 9,
        cellPadding: 8,
      },
      alternateRowStyles: {
        fillColor: lightGray,
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 38, halign: 'right' },
        3: { cellWidth: 42, halign: 'right', fontStyle: 'bold' },
      },
      lineColor: divider,
      lineWidth: 0.5,
    });

    const tableEnd = (doc as any).lastAutoTable.finalY || yPos + 50;
    yPos = tableEnd + 12;

    // Totals section with background box
    const totalsBoxWidth = 65;
    const totalsBoxX = W - margin - totalsBoxWidth;
    
    doc.setFillColor(...lightGray);
    doc.rect(totalsBoxX - 5, yPos - 5, totalsBoxWidth + 5, 45);

    // Subtotal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...gray);
    doc.text('Subtotal', totalsBoxX, yPos);
    doc.setTextColor(...dark);
    doc.text(this.fmt(data.subtotal), W - margin - 5, yPos, { align: 'right' });
    yPos += 8;

    // Tax
    if (data.tax && data.taxRate) {
      doc.setTextColor(...gray);
      doc.text('VAT (' + data.taxRate + '%)', totalsBoxX, yPos);
      doc.setTextColor(...dark);
      doc.text(this.fmt(data.tax), W - margin - 5, yPos, { align: 'right' });
      yPos += 8;
    }

    // Divider
    doc.setDrawColor(...divider);
    doc.setLineWidth(1);
    doc.line(totalsBoxX, yPos, W - margin - 5, yPos);
    yPos += 10;

    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...primary);
    doc.text('TOTAL', totalsBoxX, yPos);
    doc.setFontSize(14);
    doc.text(this.fmt(data.total), W - margin - 5, yPos, { align: 'right' });
    yPos += 15;

    // Payment status
    if (data.amountPaid !== undefined && data.amountPaid > 0) {
      yPos += 8;
      const statusBoxY = yPos;
      const statusColor = data.balance === 0 ? success : secondary;
      
      doc.setFillColor(...statusColor);
      doc.rect(margin, statusBoxY, W - margin * 2, 22);
      
      doc.setTextColor(...white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const statusText = data.balance === 0 ? 'PAID IN FULL' : 'PARTIAL PAYMENT';
      doc.text(statusText, margin + 8, statusBoxY + 8);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Amount Paid: ' + this.fmt(data.amountPaid), margin + 8, statusBoxY + 16);
      if (data.balance && data.balance > 0) {
        doc.text('Balance: ' + this.fmt(data.balance), W - margin - 8, statusBoxY + 16, { align: 'right' });
      }
      yPos += 30;
    }

    // Banking details
    if (data.bankingDetails?.bank) {
      yPos += 12;
      doc.setDrawColor(...divider);
      doc.setLineWidth(1);
      doc.line(margin, yPos, W - margin, yPos);
      yPos += 10;

      doc.setTextColor(...primary);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('PAYMENT DETAILS', margin, yPos);
      yPos += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...dark);

      const bankDetails = [
        'Bank: ' + data.bankingDetails.bank,
        'Account Number: ' + data.bankingDetails.account,
        'Branch Code: ' + data.bankingDetails.branch,
        'Account Type: ' + data.bankingDetails.type,
      ];
      if (data.bankingDetails.reference) {
        bankDetails.push('Payment Reference: ' + data.bankingDetails.reference);
      }

      bankDetails.forEach(detail => {
        doc.text(detail, margin, yPos);
        yPos += 5.5;
      });
    }

    // Notes
    if (data.customField1 || data.customField2) {
      yPos += 12;
      doc.setDrawColor(...divider);
      doc.setLineWidth(1);
      doc.line(margin, yPos, W - margin, yPos);
      yPos += 10;

      doc.setTextColor(...primary);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('NOTES', margin, yPos);
      yPos += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...dark);

      if (data.customField1) {
        const lines = doc.splitTextToSize(data.customField1, W - margin * 2);
        doc.text(lines, margin, yPos);
        yPos += lines.length * 5.5;
      }
      if (data.customField2) {
        const lines = doc.splitTextToSize(data.customField2, W - margin * 2);
        doc.text(lines, margin, yPos);
      }
    }

    // Footer
    const footerY = H - 25;
    doc.setFillColor(...primary);
    doc.rect(0, footerY, W, 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text('Thank you for your business', W / 2, footerY + 15, { align: 'center' });
    
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.text(data.businessName, W / 2, footerY + 21, { align: 'center' });

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
