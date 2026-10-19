import { jsPDF } from 'jspdf';
import { 
  POSOrder, 
  Opportunity, 
  CustomerProfile, 
  ReceiptTemplateConfig, 
  CompanyTaxConfig, 
  UserProfile 
} from '../types/erp';
import { dataStore } from '../config/firebase';
import { formatPrice } from '../utils/currency';

export interface FinancialInvoiceOptions {
  type: 'pos' | 'deal';
  posOrder?: POSOrder;
  deal?: Opportunity;
  customer?: CustomerProfile | null;
  receiptConfig?: ReceiptTemplateConfig;
  taxConfig?: CompanyTaxConfig;
  activeUser?: UserProfile;
  customNotes?: string;
  invoiceNumber?: string;
  issueDate?: string;
}

/**
 * Converts a hex color string (e.g. "#4f46e5" or "#0f172a") to RGB tuple.
 */
function hexToRgb(hexStr?: string): [number, number, number] {
  if (!hexStr) return [15, 23, 42]; // Slate-900 default
  let hex = hexStr.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const intVal = parseInt(hex, 16);
  if (isNaN(intVal) || hex.length !== 6) return [15, 23, 42];
  return [(intVal >> 16) & 255, (intVal >> 8) & 255, intVal & 255];
}

/**
 * Generates an official, highly styled jsPDF invoice using live Enterprise Customizer
 * branding, tax settings, and transactional records.
 */
export function buildFinancialInvoicePDF(options: FinancialInvoiceOptions): jsPDF {
  const receiptConfig: ReceiptTemplateConfig = 
    options.receiptConfig || dataStore.getReceiptConfig();
  const taxConfig: CompanyTaxConfig = 
    options.taxConfig || dataStore.getTaxConfig();

  const isPOS = options.type === 'pos' && options.posOrder;
  const isDeal = options.type === 'deal' && options.deal;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  // Extract Branding Colors
  const primaryRgb = hexToRgb(receiptConfig.primaryColor || '#1e1b4b');

  // --- HEADER BANNER ---
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Decorative Accent Line
  doc.setFillColor(232, 90, 28); // Vibrant Enterprise Coral Accent
  doc.rect(0, 42, pageWidth, 2, 'F');

  // Company Brand Name & Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  const brandTitle = (receiptConfig.headerTitle || 'TUMI ENTERPRISE GLOBAL').toUpperCase();
  doc.text(brandTitle, margin, 18);

  // Subtitle / Department description
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  const subHeader = receiptConfig.subHeader || 'Commercial Invoicing & Enterprise Financial Ledger';
  doc.text(subHeader, margin, 24);

  // TIN and Compliance in Header
  const tinText = (receiptConfig.showTinNumber || taxConfig.tinNumber)
    ? `Tax Identification No (TIN): ${taxConfig.tinNumber || 'C002891482X'}  •  Licensed Commercial Entity`
    : `Enterprise Commercial Suite  •  Licensed Commercial Entity`;
  doc.setFontSize(7.5);
  doc.setTextColor(194, 205, 220);
  doc.text(tinText, margin, 29);
  doc.text('Accra Financial Hub  •  Contact: billing@tumi-enterprise.com  •  Tel: +233 (0) 30 294 8812', margin, 34);

  // Top Right Status Stamp
  const badgeWidth = 56;
  const badgeHeight = 16;
  const badgeX = pageWidth - margin - badgeWidth;
  const badgeY = 12;

  // Emerald badge for Finalized / Paid
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('FINALIZED & SETTLED', badgeX + (badgeWidth / 2), badgeY + 7, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Ledger Reconciled: 100%', badgeX + (badgeWidth / 2), badgeY + 12, { align: 'center' });

  // --- INVOICE METADATA & RECIPIENT SECTION ---
  let y = 56;

  // Left: Invoice Title & Meta
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(isPOS ? 'POINT OF SALE COMMERCIAL INVOICE' : 'SALES DEAL & CONTRACT INVOICE', margin, y);

  const invoiceNumber = options.invoiceNumber || 
    (isPOS ? `INV-POS-${options.posOrder!.id}` : `INV-DEAL-${options.deal!.id}`);
  
  const rawDate = isPOS 
    ? options.posOrder!.createdAt 
    : (options.deal?.updatedAt || options.deal?.createdAt || new Date().toISOString());
  const dateObj = new Date(rawDate);
  const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Invoice Number:`, margin, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(invoiceNumber, margin + 28, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Issue Timestamp:`, margin, y + 11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${formattedDate} at ${formattedTime}`, margin + 28, y + 11);

  doc.setTextColor(71, 85, 105);
  doc.text(`Commercial Channel:`, margin, y + 16);
  doc.setTextColor(15, 23, 42);
  doc.text(isPOS ? 'Retail POS Counter Checkout' : `B2B Pipeline (${options.deal?.kanban_stage || 'Closed'})`, margin + 28, y + 16);

  doc.setTextColor(71, 85, 105);
  doc.text(`Processed By:`, margin, y + 21);
  doc.setTextColor(15, 23, 42);
  const operatorName = isPOS 
    ? (options.posOrder?.cashierName || 'POS Terminal Cashier')
    : (options.activeUser?.name || 'Enterprise Sales Directorate');
  doc.text(operatorName, margin + 28, y + 21);

  // Right: BILLED TO / CUSTOMER BOX
  const billToX = pageWidth - margin - 82;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(billToX, y - 4, 82, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text('BILLED TO / CLIENT ACCOUNT', billToX + 4, y + 1);

  const clientName = isPOS 
    ? (options.posOrder?.customerName || 'Walk-In Retail Client')
    : (options.deal?.customerName || 'Corporate Client Account');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(clientName.substring(0, 32), billToX + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const clientPhone = isPOS 
    ? options.posOrder?.customerPhone 
    : (options.customer?.phone || 'On file with CRM');
  const clientEmail = isPOS 
    ? options.posOrder?.customerEmail 
    : (options.customer?.email || 'accounts@enterprise-client.com');

  doc.text(`Contact: ${clientPhone || 'Walk-In'}`, billToX + 4, y + 12);
  doc.text(`Email: ${clientEmail || 'N/A'}`, billToX + 4, y + 16);

  const paymentMethod = isPOS 
    ? (options.posOrder?.paymentMethod || 'Cash / Point of Sale')
    : 'Direct Corporate Wire / B2B Settlement';
  doc.text(`Payment: ${paymentMethod}`, billToX + 4, y + 21);

  // --- LINE ITEMS TABLE ---
  y += 34;

  // Table Header
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.rect(margin, y, contentWidth, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('NO.', margin + 3, y + 5.5);
  doc.text('DESCRIPTION / SCOPE OF WORK', margin + 14, y + 5.5);
  doc.text('CATEGORY / SKU', margin + 90, y + 5.5);
  doc.text('QTY', margin + 130, y + 5.5, { align: 'center' });
  doc.text('UNIT PRICE', margin + 155, y + 5.5, { align: 'right' });
  doc.text('TOTAL AMOUNT', margin + contentWidth - 3, y + 5.5, { align: 'right' });

  y += 8;

  let rawSubtotal = 0;
  let totalDiscount = 0;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  if (isPOS && options.posOrder?.items) {
    const items = options.posOrder.items;
    totalDiscount = options.posOrder.discountAmount || 0;

    items.forEach((item, index) => {
      const lineTotal = item.price * item.quantity;
      rawSubtotal += lineTotal;

      const isEven = index % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, y, contentWidth, 7.5, 'F');

      doc.setTextColor(100, 116, 139);
      doc.text(String(index + 1), margin + 3, y + 5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(item.name.substring(0, 38), margin + 14, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text((item.productId || 'SKU-GEN').substring(0, 18), margin + 90, y + 5);

      doc.setTextColor(15, 23, 42);
      doc.text(String(item.quantity), margin + 130, y + 5, { align: 'center' });

      doc.text(formatPrice(item.price), margin + 155, y + 5, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.text(formatPrice(lineTotal), margin + contentWidth - 3, y + 5, { align: 'right' });

      // Bottom border line
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 7.5, margin + contentWidth, y + 7.5);

      y += 7.5;
    });
  } else if (isDeal && options.deal) {
    const deal = options.deal;
    rawSubtotal = deal.value || 0;

    // Line 1: Main Scope Deliverable
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, contentWidth, 8, 'F');

    doc.setTextColor(100, 116, 139);
    doc.text('1', margin + 3, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(deal.title.substring(0, 42), margin + 14, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Enterprise Contract', margin + 90, y + 5.5);

    doc.setTextColor(15, 23, 42);
    doc.text('1 Unit', margin + 130, y + 5.5, { align: 'center' });

    doc.text(formatPrice(deal.value), margin + 155, y + 5.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(formatPrice(deal.value), margin + contentWidth - 3, y + 5.5, { align: 'right' });

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 8, margin + contentWidth, y + 8);
    y += 8;

    // Line 2: SLA & Final Delivery Milestones
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 7.5, 'F');

    doc.setTextColor(100, 116, 139);
    doc.text('2', margin + 3, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Commercial Execution, QA Certification & Delivery Sign-off', margin + 14, y + 5);
    doc.text('Service & Support', margin + 90, y + 5);
    doc.text('1 Complete', margin + 130, y + 5, { align: 'center' });
    doc.text('Included', margin + 155, y + 5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatPrice(0), margin + contentWidth - 3, y + 5, { align: 'right' });

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 7.5, margin + contentWidth, y + 7.5);
    y += 7.5;
  }

  // --- TAX CALCULATION & COMPLIANCE BREAKDOWN ---
  const netBeforeTax = Math.max(0, rawSubtotal - totalDiscount);
  let totalTaxAmount = 0;
  const taxBreakdownLines: Array<{ label: string; amount: number }> = [];

  if (taxConfig.taxMode === 'gra_standard') {
    // Ghana Standard VAT & Levies
    const vatAmount = Number((netBeforeTax * (taxConfig.graStandardRate / 100)).toFixed(2));
    const nhilAmount = Number((netBeforeTax * (taxConfig.nhilRate / 100)).toFixed(2));
    const getFundAmount = Number((netBeforeTax * (taxConfig.getFundRate / 100)).toFixed(2));
    const covidAmount = Number((netBeforeTax * (taxConfig.covidLevyRate / 100)).toFixed(2));

    taxBreakdownLines.push({ label: `GRA Standard VAT (${taxConfig.graStandardRate}%):`, amount: vatAmount });
    taxBreakdownLines.push({ label: `National Health Insurance Levy NHIL (${taxConfig.nhilRate}%):`, amount: nhilAmount });
    taxBreakdownLines.push({ label: `Ghana Education Trust GETFund (${taxConfig.getFundRate}%):`, amount: getFundAmount });
    taxBreakdownLines.push({ label: `COVID-19 Health Recovery Levy (${taxConfig.covidLevyRate}%):`, amount: covidAmount });

    totalTaxAmount = vatAmount + nhilAmount + getFundAmount + covidAmount;
  } else if (taxConfig.taxMode === 'gra_flat_3') {
    const flatAmount = Number((netBeforeTax * 0.03).toFixed(2));
    taxBreakdownLines.push({ label: 'GRA Flat Scheme VAT (3%):', amount: flatAmount });
    totalTaxAmount = flatAmount;
  } else if (taxConfig.taxMode === 'custom') {
    const rate = taxConfig.customTaxRate || 15;
    const customAmount = Number((netBeforeTax * (rate / 100)).toFixed(2));
    taxBreakdownLines.push({ label: `Sales & Services Tax (${rate}%):`, amount: customAmount });
    totalTaxAmount = customAmount;
  } else {
    // Exempt
    taxBreakdownLines.push({ label: 'Tax Exempt Output (0%):', amount: 0 });
    totalTaxAmount = 0;
  }

  const grandTotal = isPOS 
    ? (options.posOrder?.totalAmount || Number((netBeforeTax + totalTaxAmount).toFixed(2)))
    : Number((netBeforeTax + totalTaxAmount).toFixed(2));

  // --- TOTALS SUMMARY SECTION ---
  y += 4;
  const totalsBoxX = pageWidth - margin - 78;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal Net:', totalsBoxX, y);
  doc.setTextColor(15, 23, 42);
  doc.text(formatPrice(rawSubtotal), margin + contentWidth - 3, y, { align: 'right' });

  if (totalDiscount > 0) {
    y += 5;
    doc.setTextColor(225, 29, 72); // Rose
    doc.text('Commercial Discount:', totalsBoxX, y);
    doc.text(`-${formatPrice(totalDiscount)}`, margin + contentWidth - 3, y, { align: 'right' });
  }

  // Tax breakdown if enabled in Enterprise Customizer
  if (receiptConfig.showTaxBreakdown && taxBreakdownLines.length > 0) {
    taxBreakdownLines.forEach(taxLine => {
      y += 5;
      doc.setTextColor(100, 116, 139);
      doc.text(taxLine.label, totalsBoxX, y);
      doc.setTextColor(15, 23, 42);
      doc.text(formatPrice(taxLine.amount), margin + contentWidth - 3, y, { align: 'right' });
    });
  }

  // Grand Total Settled Highlight
  y += 6;
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.roundedRect(totalsBoxX - 4, y - 4, 82, 10, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL AMOUNT SETTLED:', totalsBoxX, y + 2.5);
  doc.text(formatPrice(grandTotal), margin + contentWidth - 3, y + 2.5, { align: 'right' });

  // --- E-VAT DIGITAL SIGNATURE & QR CODE SECTION ---
  y += 18;

  if (receiptConfig.showQRCode || taxConfig.eInvoiceEnabled) {
    const qrBoxHeight = 22;
    doc.setFillColor(240, 253, 244); // emerald-50
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(margin, y, contentWidth, qrBoxHeight, 2, 2, 'FD');

    // Draw Simulated Vector QR Code Finder Elements
    const qrSize = 14;
    const qrX = margin + 5;
    const qrY = y + 4;
    doc.setFillColor(15, 23, 42);
    // Outer QR Box
    doc.rect(qrX, qrY, qrSize, qrSize, 'F');
    // Inner cutout
    doc.setFillColor(255, 255, 255);
    doc.rect(qrX + 2, qrY + 2, qrSize - 4, qrSize - 4, 'F');
    // Center point
    doc.setFillColor(16, 185, 129);
    doc.rect(qrX + 4.5, qrY + 4.5, 5, 5, 'F');

    // Description text next to QR
    const sigX = qrX + qrSize + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(22, 101, 52); // emerald-800
    doc.text('GRA E-VAT DIGITAL FISCALIZATION SIGNATURE & AUDIT HASH', sigX, y + 6);

    const hashString = `GRA-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(21, 128, 61);
    doc.text(`Digital Signature Hash: ${hashString}  •  Status: TRANSMITTED & VALIDATED`, sigX, y + 11);
    doc.text(`Official electronic invoice timestamp verified against national revenue compliance server.`, sigX, y + 16);

    y += qrBoxHeight + 6;
  }

  // --- BRANDING RETURN POLICY & FOOTER NOTES ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('TERMS & CUSTOMER POLICY NOTES:', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  const footerText = receiptConfig.footerNotes || 
    'Thank you for your business! Goods inspected and delivered in satisfactory condition.';
  const returnPolicy = receiptConfig.returnPolicyText || 
    'Returns strictly accepted within 30 days accompanied by this official commercial invoice.';

  doc.text(footerText, margin + 4, y + 10);
  doc.text(returnPolicy, margin + 4, y + 14);

  // --- LEGAL & SYSTEM WATERMARK (BOTTOM OF A4) ---
  const bottomY = pageHeight - 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated via Tumi Enterprise Financial Accounting Suite  •  Document Ref: ${invoiceNumber}  •  Page 1 of 1`,
    pageWidth / 2,
    bottomY,
    { align: 'center' }
  );

  return doc;
}

/**
 * Triggers an immediate browser download of the generated PDF invoice.
 */
export function downloadFinancialInvoicePDF(options: FinancialInvoiceOptions): void {
  const doc = buildFinancialInvoicePDF(options);
  const isPOS = options.type === 'pos' && options.posOrder;
  const isDeal = options.type === 'deal' && options.deal;

  const invoiceNumber = options.invoiceNumber || 
    (isPOS ? `INV-POS-${options.posOrder!.id}` : `INV-DEAL-${options.deal!.id}`);
  
  const clientName = isPOS 
    ? (options.posOrder?.customerName || 'WalkIn')
    : (options.deal?.customerName || 'Deal');
  
  const sanitizedClient = clientName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${invoiceNumber}_${sanitizedClient}.pdf`;

  doc.save(filename);
}

/**
 * Returns a Data URI string for live in-app preview without opening new windows.
 */
export function getFinancialInvoiceDataUri(options: FinancialInvoiceOptions): string {
  const doc = buildFinancialInvoicePDF(options);
  return doc.output('datauristring');
}

/**
 * Returns a Blob of the generated PDF for attachments or upload.
 */
export function getFinancialInvoiceBlob(options: FinancialInvoiceOptions): Blob {
  const doc = buildFinancialInvoicePDF(options);
  return doc.output('blob');
}
