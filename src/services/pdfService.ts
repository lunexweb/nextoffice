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
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const W = pageWidth;
    const H = pageHeight;

    const colors = {
      primary: [31, 41, 55],
      secondary: [59, 130, 246],
      accent: [99, 102, 241],
      text: [30, 41, 59],
      muted: [107, 114, 128],
      white: [255, 255, 255],
      light: [248, 250, 252],
      success: [16, 185, 129],
      warning: [251, 146, 60],
    };

    // Header
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, W, 45);

    let logoX = margin;
    if (data.logoDataUrl) {
      try {
        doc.addImage(data.logoDataUrl, 'PNG', logoX, 8, 35, 25);
        logoX = 45;
      } catch { /* skip logo if it fails */ }
    }

    doc.setTextColor(...colors.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(data.businessName, logoX, 25);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...colors.accent);
    const businessDetails = [];
    if (data.businessAddress) businessDetails.push(data.businessAddress);
    if (data.businessPhone) businessDetails.push(data.businessPhone);
    if (data.businessEmail) businessDetails.push(data.businessEmail);
    if (data.vatNumber) businessDetails.push('VAT: ' + data.vatNumber);

    let detailY = 35;
    businessDetails.forEach(detail => {
      doc.text(detail, logoX, detailY);
      detailY += 6;
    });

    doc.setTextColor(...colors.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.text('INVOICE', W - margin, 25);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...colors.accent);
    doc.text('#' + data.invoiceNumber, W - margin, 32);
    doc.text('Date: ' + data.invoiceDate, W - margin, 39);
    doc.text('Due: ' + data.dueDate, W - margin, 46);

    // Client box
    const clientBoxY = 65;
    doc.setFillColor(...colors.light);
    doc.rect(margin, clientBoxY, W - margin * 2, 35);
    
    doc.setTextColor(...colors.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('BILL TO', margin + 10, clientBoxY + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...colors.muted);
    doc.text(data.clientName, margin + 10, clientBoxY + 25);
    
    if (data.clientAddress) {
      doc.text(data.clientAddress, margin + 10, clientBoxY + 35);
    }
    if (data.clientEmail) {
      doc.text(data.clientEmail, margin + 10, clientBoxY + 45);
    }

    // Table
    const tableStartY = clientBoxY + 45;
    const tableHeaders = [
      { content: 'Description', styles: { cellWidth: 'auto', halign: 'left' } },
      { content: 'Qty', styles: { cellWidth: 30, halign: 'center' } },
      { content: 'Rate', styles: { cellWidth: 40, halign: 'right' } },
      { content: 'Amount', styles: { cellWidth: 50, halign: 'right' } }
    ];
    
    const tableData = data.items.map(item => [
      item.description,
      item.quantity.toString(),
      this.fmt(item.rate),
      this.fmt(item.amount)
    ]);

    autoTable(doc, {
      head: tableHeaders.map(h => h.content),
      body: tableData,
      startY: tableStartY,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: {
        fillColor: colors.primary,
        textColor: colors.white,
        fontStyle: 'bold',
        fontSize: 10,
        cellPadding: 8,
      },
      bodyStyles: {
        fillColor: colors.white,
        textColor: colors.text,
        fontSize: 9,
        cellPadding: 10,
        lineColor: colors.muted,
        lineWidth: 0.5,
      },
      alternateRowStyles: {
        fillColor: colors.light,
      },
      columnStyles: tableHeaders.reduce((acc, h, index) => ({
        ...acc,
        [index]: h.styles
      }), {}),
    });

    const finalY = (doc as any).lastAutoTable.finalY || tableStartY + 100;
    let y = finalY + 20;

    // Totals
    const totalsWidth = 150;
    const totalsX = W - margin - totalsWidth;

    doc.setFillColor(...colors.light);
    doc.rect(totalsX - 10, y - 10, totalsWidth + 10, 80);

    doc.setTextColor(...colors.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Subtotal:', totalsX, y);
    doc.text(this.fmt(data.subtotal), W - margin - 15, y, { align: 'right' });
    y += 20;

    if (data.tax && data.taxRate) {
      doc.text('VAT (' + data.taxRate + '%):', totalsX, y);
      doc.text(this.fmt(data.tax), W - margin - 15, y, { align: 'right' });
      y += 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...colors.primary);
    doc.text('TOTAL:', totalsX, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(this.fmt(data.total), W - margin - 15, y, { align: 'right' });
    y += 30;

    // Payment status
    if (data.amountPaid !== undefined) {
      const isPaid = data.balance === 0;
      const statusColor = isPaid ? colors.success : colors.warning;
      const statusText = isPaid ? 'PAID IN FULL' : 'PARTIAL PAYMENT';
      
      doc.setFillColor(...statusColor);
      doc.rect(margin, y - 10, W - margin * 2, 40);
      
      doc.setTextColor(...colors.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(statusText, margin + 15, y + 5);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Amount Paid: ' + this.fmt(data.amountPaid), margin + 15, y + 20);
      doc.text('Balance Due: ' + this.fmt(data.balance), margin + 15, y + 30);
      y += 50;
    }

    // Banking
    if (data.bankingDetails?.bank) {
      doc.setFillColor(...colors.light);
      doc.rect(margin, y - 10, W - margin * 2, 60);
      
      doc.setTextColor(...colors.primary);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Banking Details', margin + 15, y);
      
      doc.setTextColor(...colors.text);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const bankInfo = [
        'Bank: ' + data.bankingDetails.bank,
        'Account: ' + data.bankingDetails.account,
        'Branch: ' + data.bankingDetails.branch,
        'Type: ' + data.bankingDetails.type,
      ];
      if (data.bankingDetails.reference) {
        bankInfo.push('Reference: ' + data.bankingDetails.reference);
      }

      let bankY = y + 20;
      bankInfo.forEach(info => {
        doc.text(info, margin + 15, bankY);
        bankY += 8;
      });
      y += 70;
    }

    // Notes
    if (data.customField1 || data.customField2) {
      doc.setFillColor(...colors.light);
      doc.rect(margin, y - 10, W - margin * 2, 40);
      
      doc.setTextColor(...colors.primary);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Notes', margin + 15, y);
      
      doc.setTextColor(...colors.text);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      let notesY = y + 20;
      if (data.customField1) {
        doc.text(data.customField1, margin + 15, notesY);
        notesY += 12;
      }
      if (data.customField2) {
        doc.text(data.customField2, margin + 15, notesY);
      }
      y += 50;
    }

    // Footer
    const footerY = H - 40;
    doc.setFillColor(...colors.primary);
    doc.rect(0, footerY, W, 40);
    
    doc.setTextColor(...colors.white);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Thank you for your business', margin + 10, footerY + 15);
    
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...colors.accent);
    doc.text(data.businessName, W - margin - 10, footerY + 28, { align: 'right' });

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
