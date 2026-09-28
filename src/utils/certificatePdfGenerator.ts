import { jsPDF } from 'jspdf';
import { DigitalCertificate } from '../types/erp';

export function generateCertificatePdf(cert: DigitalCertificate): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm

  // Background subtle cream wash
  doc.setFillColor(254, 252, 246);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer Deep Navy Border
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.setLineWidth(3);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  // Inner Gold Accent Border
  doc.setDrawColor(217, 119, 6); // amber-600 / Gold
  doc.setLineWidth(1);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Corner Ornaments (Classic certificate geometric corners)
  const drawCorner = (x: number, y: number) => {
    doc.setDrawColor(217, 119, 6);
    doc.setLineWidth(0.8);
    doc.rect(x - 3, y - 3, 6, 6);
  };
  drawCorner(12, 12);
  drawCorner(pageWidth - 12, 12);
  drawCorner(12, pageHeight - 12);
  drawCorner(pageWidth - 12, pageHeight - 12);

  // Top Header - Issuing Organization
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    (cert.issuingOrganization || 'TUMI SKILLS & VOCATIONAL EMPOWERMENT INITIATIVE').toUpperCase(),
    pageWidth / 2,
      24,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const sponsorText = cert.donorSponsorName 
    ? `Accredited NGO Partner • Supported by ${cert.donorSponsorName}`
    : 'Accredited NGO Technical & Vocational Education Framework (TVET)';
  doc.text(sponsorText, pageWidth / 2, 29, { align: 'center' });

  // Main Certificate Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.text('CERTIFICATE OF VOCATIONAL MASTERY', pageWidth / 2, 44, { align: 'center' });

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text('This credential is officially conferred upon', pageWidth / 2, 53, { align: 'center' });

  // Recipient Name
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(28);
  doc.setTextColor(30, 58, 138); // deep blue
  doc.text(cert.recipientName, pageWidth / 2, 68, { align: 'center' });

  // Divider line under name
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.6);
  doc.line((pageWidth / 2) - 60, 72, (pageWidth / 2) + 60, 72);

  // Statement of Accomplishment
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `having successfully completed all prescribed coursework, practical workshop competencies,`,
    pageWidth / 2,
    81,
    { align: 'center' }
  );
  doc.text(
    `and field training assessments required for the certified program of:`,
    pageWidth / 2,
    87,
    { align: 'center' }
  );

  // Program & Specialization
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(cert.programName, pageWidth / 2, 98, { align: 'center' });

  if (cert.trackSpecialization) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(79, 70, 229); // indigo
    doc.text(`Specialization: ${cert.trackSpecialization}`, pageWidth / 2, 105, { align: 'center' });
  }

  // Grade / Honors Pill
  doc.setFillColor(254, 243, 199); // amber-100
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect((pageWidth / 2) - 40, 112, 80, 8, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(180, 83, 9); // amber-800
  doc.text(`Graduation Status: ${cert.gradeOrHonors || 'Certified Graduate'}`, pageWidth / 2, 117.5, { align: 'center' });

  // Verification Box (Bottom Left)
  const leftX = 25;
  const bottomY = 135;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(leftX, bottomY, 75, 45, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('VERIFIABLE DIGITAL CREDENTIAL', leftX + 5, bottomY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`ID: ${cert.certificateNumber}`, leftX + 5, bottomY + 14);
  doc.text(`Recipient ID: ${cert.recipientId}`, leftX + 5, bottomY + 20);
  doc.text(`Completion: ${cert.completionDate}`, leftX + 5, bottomY + 26);
  doc.text(`Issued: ${cert.issueDate}`, leftX + 5, bottomY + 32);

  // Simulated Verification QR stamp
  doc.setFillColor(15, 23, 42);
  doc.rect(leftX + 55, bottomY + 10, 15, 15, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(leftX + 57, bottomY + 12, 5, 5, 'F');
  doc.rect(leftX + 63, bottomY + 12, 5, 5, 'F');
  doc.rect(leftX + 57, bottomY + 18, 5, 5, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Scan to verify authenticity', leftX + 5, bottomY + 40);

  // Official Gold Seal (Center Bottom)
  const sealCenterX = pageWidth / 2;
  const sealCenterY = 155;
  doc.setFillColor(245, 158, 11);
  doc.circle(sealCenterX, sealCenterY, 15, 'F');
  doc.setFillColor(217, 119, 6);
  doc.circle(sealCenterX, sealCenterY, 13, 'F');
  doc.setFillColor(254, 243, 199);
  doc.circle(sealCenterX, sealCenterY, 11, 'F');

  doc.setTextColor(180, 83, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('OFFICIAL', sealCenterX, sealCenterY - 2, { align: 'center' });
  doc.text('ACCREDITED', sealCenterX, sealCenterY + 2, { align: 'center' });
  doc.text('SEAL', sealCenterX, sealCenterY + 6, { align: 'center' });

  // Signatures (Right Bottom)
  const rightX = pageWidth - 100;
  
  // Signature 1: Lead Technical Instructor
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(rightX, bottomY + 18, rightX + 65, bottomY + 18);
  doc.setFont('times', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Elena Rostova, Ph.D.', rightX + 32, bottomY + 15, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Lead Technical Instructor & Curriculum Lead', rightX + 32, bottomY + 23, { align: 'center' });

  // Signature 2: Executive Director / NGO Program Head
  doc.line(rightX, bottomY + 38, rightX + 65, bottomY + 38);
  doc.setFont('times', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Kofi Mensah-Arthur', rightX + 32, bottomY + 35, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Executive Director, Skills Development Mission', rightX + 32, bottomY + 43, { align: 'center' });

  // Footer Disclaimer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Cryptographically logged and securely stored in Tumi NGO Systems • Tamper-evident digital token: ${cert.qrVerificationCode}`,
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' }
  );

  return doc;
}

export function downloadCertificatePdf(cert: DigitalCertificate) {
  const doc = generateCertificatePdf(cert);
  const cleanName = cert.recipientName.replace(/\s+/g, '_');
  doc.save(`${cert.certificateNumber}_${cleanName}_Certificate.pdf`);
}

export function getCertificatePdfDataUri(cert: DigitalCertificate): string {
  const doc = generateCertificatePdf(cert);
  return doc.output('datauristring');
}
