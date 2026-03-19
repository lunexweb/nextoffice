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
  
  // Notes
  notes?: string;
  terms?: string;
}

class PDFService {
  generateInvoicePDF(data: InvoicePDFData): jsPDF {
    const doc = new jsPDF();
    
    // Colors
    const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo
    const lightGray: [number, number, number] = [249, 250, 251];
    const darkGray: [number, number, number] = [31, 41, 55];
    
    let yPosition = 20;
    
    // Header - Business Name
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(data.businessName, 20, 25);
    
    // Invoice Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('INVOICE', 150, 25);
    
    yPosition = 50;
    
    // Business Info (Left Column)
    doc.setTextColor(...darkGray);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (data.businessAddress) {
      doc.text(data.businessAddress, 20, yPosition);
      yPosition += 5;
    }
    if (data.businessPhone) {
      doc.text(`Phone: ${data.businessPhone}`, 20, yPosition);
      yPosition += 5;
    }
    if (data.businessEmail) {
      doc.text(`Email: ${data.businessEmail}`, 20, yPosition);
      yPosition += 5;
    }
    
    // Invoice Details (Right Column)
    yPosition = 50;
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Number:', 130, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.invoiceNumber, 170, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Date:', 130, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.invoiceDate, 170, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Due Date:', 130, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.dueDate, 170, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Status:', 130, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.status.toUpperCase(), 170, yPosition);
    
    // Bill To Section
    yPosition = 80;
    doc.setFillColor(...lightGray);
    doc.rect(20, yPosition, 170, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('BILL TO', 22, yPosition + 5);
    
    yPosition += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(data.clientName, 20, yPosition);
    yPosition += 5;
    
    doc.setFont('helvetica', 'normal');
    if (data.clientEmail) {
      doc.text(data.clientEmail, 20, yPosition);
      yPosition += 5;
    }
    if (data.clientAddress) {
      doc.text(data.clientAddress, 20, yPosition);
      yPosition += 5;
    }
    
    // Items Table
    yPosition += 10;
    
    const tableData = data.items.map(item => [
      item.description,
      item.quantity.toString(),
      `R${item.rate.toLocaleString()}`,
      `R${item.amount.toLocaleString()}`,
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Description', 'Qty', 'Rate', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      styles: {
        fontSize: 9,
        cellPadding: 5,
      },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
      },
    });
    
    // Get Y position after table
    const finalY = (doc as any).lastAutoTable.finalY || yPosition + 50;
    yPosition = finalY + 10;
    
    // Totals Section
    const totalsX = 130;
    
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', totalsX, yPosition);
    doc.text(`R${data.subtotal.toLocaleString()}`, 185, yPosition, { align: 'right' });
    yPosition += 6;
    
    if (data.tax && data.taxRate) {
      doc.text(`VAT (${data.taxRate}%):`, totalsX, yPosition);
      doc.text(`R${data.tax.toLocaleString()}`, 185, yPosition, { align: 'right' });
      yPosition += 6;
    }
    
    // Total Line
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(totalsX, yPosition, 190, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', totalsX, yPosition);
    doc.text(`R${data.total.toLocaleString()}`, 185, yPosition, { align: 'right' });
    yPosition += 8;
    
    if (data.amountPaid && data.amountPaid > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Amount Paid:', totalsX, yPosition);
      doc.text(`R${data.amountPaid.toLocaleString()}`, 185, yPosition, { align: 'right' });
      yPosition += 6;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Balance Due:', totalsX, yPosition);
      doc.text(`R${(data.balance || 0).toLocaleString()}`, 185, yPosition, { align: 'right' });
      yPosition += 6;
    }
    
    // Notes Section
    if (data.notes) {
      yPosition += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Notes:', 20, yPosition);
      yPosition += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const splitNotes = doc.splitTextToSize(data.notes, 170);
      doc.text(splitNotes, 20, yPosition);
      yPosition += splitNotes.length * 5;
    }
    
    // Terms Section
    if (data.terms) {
      yPosition += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Terms & Conditions:', 20, yPosition);
      yPosition += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const splitTerms = doc.splitTextToSize(data.terms, 170);
      doc.text(splitTerms, 20, yPosition);
    }
    
    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} | ${data.businessName}`,
      105,
      pageHeight - 16,
      { align: 'center' }
    );

    // NextOffice promo
    doc.setFontSize(7);
    doc.setTextColor(79, 70, 229);
    doc.text(
      'Need to invoice your own clients? Try NextOffice free at nextoffice.app',
      105,
      pageHeight - 10,
      { align: 'center' }
    );
    
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
