import { useState } from 'react';
import { pdfService, InvoicePDFData } from '@/services/pdfService';
import { useToast } from './use-toast';

export const usePDF = () => {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const downloadInvoicePDF = async (data: InvoicePDFData, filename?: string) => {
    setGenerating(true);
    try {
      pdfService.downloadInvoicePDF(data, filename);
      toast({
        title: 'PDF Downloaded',
        description: `Invoice ${data.invoiceNumber} has been downloaded`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      });
      console.error('PDF generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const previewInvoicePDF = async (data: InvoicePDFData) => {
    setGenerating(true);
    try {
      pdfService.previewInvoicePDF(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to preview PDF',
        variant: 'destructive',
      });
      console.error('PDF preview error:', error);
    } finally {
      setGenerating(false);
    }
  };

  return {
    generating,
    downloadInvoicePDF,
    previewInvoicePDF,
  };
};
