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
    const margin = 25;

    // Professional color palette - minimal and sophisticated
    const black = [0, 0, 0];
    const darkGray = [60, 60, 60];
    const mediumGray = [120, 120, 120];
    const lightGray = [240, 240, 240];
    const white = [255, 255, 255];
    const accentBlue = [41, 98, 255];

    let yPos = margin;

    // Logo and Business Header (left side)
    if (data.logoDataUrl) {
      try {
        doc.addImage(data.logoDataUrl, 'PNG', margin, yPos, 30, 20);
      } catch { /* skip logo */ }
    }

    // Business info (top left)
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(data.businessName, margin, yPos + 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...mediumGray);
    let businessY = yPos + 35;
    if (data.businessAddress) {
      doc.text(data.businessAddress, margin, businessY);
      businessY += 4;
    }
    if (data.businessPhone) {
      doc.text(data.businessPhone, margin, businessY);
      businessY += 4;
    }
    if (data.businessEmail) {
      doc.text(data.businessEmail, margin, businessY);
      businessY += 4;
    }
    if (data.vatNumber) {
      doc.text('VAT: ' + data.vatNumber, margin, businessY);
    }

    // INVOICE title and details (top right)
    doc.setTextColor(...black);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('INVOICE', W - margin, yPos, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...darkGray);
    doc.text('Invoice #: ' + data.invoiceNumber, W - margin, yPos + 12, { align: 'right' });
    doc.text('Date: ' + data.invoiceDate, W - margin, yPos + 19, { align: 'right' });
    doc.text('Due Date: ' + data.dueDate, W - margin, yPos + 26, { align: 'right' });

    // Divider line
    yPos = yPos + 55;
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, W - margin, yPos);

    // Bill To section
    yPos += 10;
    doc.setTextColor(...mediumGray);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('BILL TO', margin, yPos);

    yPos += 6;
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(data.clientName, margin, yPos);

    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...mediumGray);
    if (data.clientAddress) {
      doc.text(data.clientAddress, margin, yPos);
      yPos += 4;
    }
    if (data.clientEmail) {
      doc.text(data.clientEmail, margin, yPos);
      yPos += 4;
    }

    // Items table
    yPos += 10;
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
      theme: 'plain',
      headStyles: {
        fillColor: white,
        textColor: black,
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: { top: 3, bottom: 6, left: 0, right: 0 },
        lineWidth: { bottom: 0.5 },
        lineColor: darkGray,
      },
      bodyStyles: {
        fillColor: white,
        textColor: darkGray,
        fontSize: 9,
        cellPadding: { top: 6, bottom: 6, left: 0, right: 0 },
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 40, halign: 'right' },
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.row.index === tableData.length - 1) {
          data.cell.styles.lineWidth = { bottom: 0.5 };
          data.cell.styles.lineColor = lightGray;
        }
      }
    });

    const tableEnd = (doc as any).lastAutoTable.finalY || yPos + 50;
    yPos = tableEnd + 15;

    // Totals section (right aligned)
    const totalsX = W - margin - 50;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...darkGray);

    // Subtotal
    doc.text('Subtotal:', totalsX, yPos, { align: 'right' });
    doc.text(this.fmt(data.subtotal), W - margin, yPos, { align: 'right' });
    yPos += 7;

    // Tax
    if (data.tax && data.taxRate) {
      doc.text('VAT (' + data.taxRate + '%):', totalsX, yPos, { align: 'right' });
      doc.text(this.fmt(data.tax), W - margin, yPos, { align: 'right' });
      yPos += 7;
    }

    // Line above total
    doc.setDrawColor(...darkGray);
    doc.setLineWidth(0.5);
    doc.line(totalsX - 5, yPos, W - margin, yPos);
    yPos += 8;

    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...black);
    doc.text('TOTAL:', totalsX, yPos, { align: 'right' });
    doc.text(this.fmt(data.total), W - margin, yPos, { align: 'right' });
    yPos += 15;

    // Payment status (if applicable)
    if (data.amountPaid !== undefined && data.amountPaid > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...mediumGray);
      doc.text('Amount Paid:', totalsX, yPos, { align: 'right' });
      doc.text(this.fmt(data.amountPaid), W - margin, yPos, { align: 'right' });
      yPos += 6;

      const balanceColor = data.balance === 0 ? [0, 128, 0] : darkGray;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...balanceColor);
      doc.text('Balance Due:', totalsX, yPos, { align: 'right' });
      doc.text(this.fmt(data.balance || 0), W - margin, yPos, { align: 'right' });
      yPos += 10;
    }

    // Banking details section
    if (data.bankingDetails?.bank) {
      yPos += 10;
      doc.setDrawColor(...lightGray);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, W - margin, yPos);
      yPos += 10;

      doc.setTextColor(...mediumGray);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('PAYMENT DETAILS', margin, yPos);
      yPos += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...darkGray);

      const bankDetails = [
        'Bank: ' + data.bankingDetails.bank,
        'Account Number: ' + data.bankingDetails.account,
        'Branch Code: ' + data.bankingDetails.branch,
        'Account Type: ' + data.bankingDetails.type,
      ];
      if (data.bankingDetails.reference) {
        bankDetails.push('Reference: ' + data.bankingDetails.reference);
      }

      bankDetails.forEach(detail => {
        doc.text(detail, margin, yPos);
        yPos += 5;
      });
    }

    // Notes section
    if (data.customField1 || data.customField2) {
      yPos += 10;
      doc.setDrawColor(...lightGray);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, W - margin, yPos);
      yPos += 10;

      doc.setTextColor(...mediumGray);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('NOTES', margin, yPos);
      yPos += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...darkGray);

      if (data.customField1) {
        const lines = doc.splitTextToSize(data.customField1, W - margin * 2);
        doc.text(lines, margin, yPos);
        yPos += lines.length * 5;
      }
      if (data.customField2) {
        const lines = doc.splitTextToSize(data.customField2, W - margin * 2);
        doc.text(lines, margin, yPos);
      }
    }

    // Footer
    const footerY = H - 20;
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY, W - margin, footerY);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...mediumGray);
    doc.text('Thank you for your business', W / 2, footerY + 6, { align: 'center' });

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
