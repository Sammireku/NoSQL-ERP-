import { jsPDF } from 'jspdf';
import { Booking, CheckoutInvoiceData, CustomerProfile, Room } from '../types/erp';

export function buildCheckoutInvoiceData(
  booking: Booking,
  room?: Room,
  crmCustomer?: CustomerProfile | null,
  settledBy: string = 'Front Desk Reception',
  paymentMethod: string = 'Direct Folio Settle'
): CheckoutInvoiceData {
  const now = new Date();
  const invoiceNumber = booking.invoiceNumber || `INV-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  
  // Calculate nights
  const checkIn = new Date(booking.checkInDate);
  const checkOut = new Date(booking.checkOutDate);
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
  const nightsCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  
  const accommodationTotal = Number((booking.totalPrice || 0).toFixed(2));
  const charges = booking.roomCharges || [];
  const chargesTotal = charges.reduce((sum, c) => sum + (c.amount || 0), 0);
  
  const subtotal = Number((accommodationTotal + chargesTotal).toFixed(2));
  const taxesAndFees = Number((subtotal * 0.08).toFixed(2)); // 8% hospitality & occupancy tax
  const grandTotal = Number((subtotal + taxesAndFees).toFixed(2));

  return {
    invoiceNumber,
    issuedAt: now.toISOString(),
    bookingId: booking.id,
    roomNumber: booking.roomNumber,
    roomType: room?.type || 'Standard Room',
    guestName: booking.guestName,
    guestEmail: crmCustomer?.email || booking.guestEmail,
    guestPhone: crmCustomer?.phone || booking.guestPhone,
    crmCustomerId: crmCustomer?.id,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    nightsCount,
    sourceChannel: booking.sourceChannel,
    roomRate: room?.nightlyRate || Math.round(accommodationTotal / nightsCount),
    accommodationTotal,
    charges,
    subtotal,
    taxesAndFees,
    grandTotal,
    amountPaid: grandTotal,
    balanceDue: 0.00,
    settledBy,
    paymentMethod,
    dispatchedToEmail: crmCustomer?.email || booking.guestEmail,
    emailDeliveryStatus: 'sent',
    emailDeliveryTimestamp: now.toISOString()
  };
}

export function generateInvoicePdf(invoice: CheckoutInvoiceData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Primary Theme Colors (Sophisticated Navy & Gold/Rose accents)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('TUMI ENTERPRISE HOSPITALITY', 15, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text('Luxury Suites, Boutique Hotels & Extended Stays', 15, 24);
  doc.text('Tax ID: TUMI-VAT-9029148 • 100 Grand Boulevard, Financial District', 15, 29);

  // Status Badge in Header
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.roundedRect(pageWidth - 65, 12, 50, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PAID IN FULL', pageWidth - 40, 20, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Balance: $0.00', pageWidth - 40, 25, { align: 'center' });

  // Invoice Meta Section
  let y = 52;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`GUEST FOLIO INVOICE`, 15, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 15, y + 6);
  doc.text(`Issued Date: ${new Date(invoice.issuedAt).toLocaleDateString()} ${new Date(invoice.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 15, y + 11);
  doc.text(`Booking Ref: ${invoice.bookingId} (${invoice.sourceChannel})`, 15, y + 16);

  // Bill To (Right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('BILLED TO (CRM VERIFIED GUEST):', pageWidth - 90, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(invoice.guestName, pageWidth - 90, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Email: ${invoice.guestEmail}`, pageWidth - 90, y + 11);
  doc.text(`Phone: ${invoice.guestPhone}`, pageWidth - 90, y + 16);
  if (invoice.crmCustomerId) {
    doc.text(`CRM ID: ${invoice.crmCustomerId}`, pageWidth - 90, y + 21);
  }

  // Stay summary card
  y += 28;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, y, pageWidth - 30, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Room #${invoice.roomNumber} - ${invoice.roomType}`, 20, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.text(`Check-In: ${invoice.checkInDate}   |   Check-Out: ${invoice.checkOutDate}   |   Duration: ${invoice.nightsCount} Night(s)`, 20, y + 13);

  // Line items table
  y += 26;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, pageWidth - 30, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DATE', 20, y + 5.5);
  doc.text('CATEGORY / SERVICE', 50, y + 5.5);
  doc.text('DESCRIPTION', 95, y + 5.5);
  doc.text('BILLED BY', 145, y + 5.5);
  doc.text('AMOUNT ($)', pageWidth - 20, y + 5.5, { align: 'right' });

  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  // 1. Accommodation line
  doc.text(invoice.checkInDate, 20, y + 4);
  doc.setFont('helvetica', 'bold');
  doc.text('Room Stay', 50, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(`${invoice.nightsCount} night(s) standard lodging (${invoice.sourceChannel})`, 95, y + 4);
  doc.text('Reservation Engine', 145, y + 4);
  doc.text(`$${invoice.accommodationTotal.toFixed(2)}`, pageWidth - 20, y + 4, { align: 'right' });

  doc.setDrawColor(241, 245, 249);
  doc.line(15, y + 7, pageWidth - 15, y + 7);
  y += 9;

  // 2. Room charges (incidentals, POS bistro, spa, minibar)
  if (invoice.charges && invoice.charges.length > 0) {
    invoice.charges.forEach(charge => {
      const chargeDate = charge.timestamp ? charge.timestamp.split('T')[0] : invoice.checkInDate;
      doc.text(chargeDate, 20, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.text(charge.category, 50, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.text(charge.description.substring(0, 30), 95, y + 4);
      doc.text(charge.billedBy || 'POS Cashier', 145, y + 4);
      doc.text(`$${charge.amount.toFixed(2)}`, pageWidth - 20, y + 4, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(15, y + 7, pageWidth - 15, y + 7);
      y += 8;
    });
  }

  // Totals Section
  y += 6;
  const totalsX = pageWidth - 75;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', totalsX, y);
  doc.setTextColor(30, 41, 59);
  doc.text(`$${invoice.subtotal.toFixed(2)}`, pageWidth - 20, y, { align: 'right' });

  y += 6;
  doc.setTextColor(100, 116, 139);
  doc.text('Occupancy Tax & VAT (8%):', totalsX, y);
  doc.setTextColor(30, 41, 59);
  doc.text(`$${invoice.taxesAndFees.toFixed(2)}`, pageWidth - 20, y, { align: 'right' });

  y += 7;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(totalsX - 5, y - 4, 65, 10, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('Total Settled:', totalsX, y + 2.5);
  doc.text(`$${invoice.grandTotal.toFixed(2)}`, pageWidth - 20, y + 2.5, { align: 'right' });

  // Payment Confirmation footer
  y += 18;
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(15, y, pageWidth - 30, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52); // emerald-800
  doc.text('AUTOMATED RECEIPT DISPATCH & PAYMENT CLEARANCE', 20, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61);
  doc.text(`Settled By: ${invoice.settledBy}   |   Method: ${invoice.paymentMethod}   |   Transaction Status: CLEARED`, 20, y + 12);
  doc.text(`This official PDF invoice was automatically dispatched to ${invoice.dispatchedToEmail}.`, 20, y + 17);

  // Legal Disclaimer
  y += 30;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Thank you for your business. For billing queries or corporate receipts, please contact frontdesk@tumi-erp.com or call +1 (555) 900-1122.', pageWidth / 2, y, { align: 'center' });
  doc.text('Generated via Tumi ERP Enterprise Hospitality Suite. All rights reserved.', pageWidth / 2, y + 4, { align: 'center' });

  return doc;
}

export function downloadInvoicePdf(invoice: CheckoutInvoiceData) {
  const doc = generateInvoicePdf(invoice);
  doc.save(`${invoice.invoiceNumber}_${invoice.guestName.replace(/\s+/g, '_')}.pdf`);
}

export function getInvoicePdfDataUri(invoice: CheckoutInvoiceData): string {
  const doc = generateInvoicePdf(invoice);
  return doc.output('datauristring');
}
