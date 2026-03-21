import { useState } from 'react';
import { pdfService, InvoicePDFData } from '@/services/pdfService';
import { useToast } from './use-toast';

const loadLogoAsDataUrl = (url: string): Promise<string | undefined> =>
  new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch { resolve(undefined); }
    };
    img.onerror = () => resolve(undefined);
    img.src = url;
  });

const prepareLogoData = async (data: InvoicePDFData): Promise<InvoicePDFData> => {
  if (data.logoUrl && !data.logoDataUrl) {
    const dataUrl = await loadLogoAsDataUrl(data.logoUrl);
    return { ...data, logoDataUrl: dataUrl };
  }
  return data;
};

export const usePDF = () => {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const downloadInvoicePDF = async (data: InvoicePDFData, filename?: string) => {
    setGenerating(true);
    try {
      const prepared = await prepareLogoData(data);
      pdfService.downloadInvoicePDF(prepared, filename);
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
      const prepared = await prepareLogoData(data);
      pdfService.previewInvoicePDF(prepared);
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
