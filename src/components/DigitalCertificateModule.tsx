import React, { useState, useEffect } from 'react';
import { 
  Award, 
  FileText, 
  Download, 
  Eye, 
  Send, 
  Plus, 
  CheckCircle2, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  QrCode, 
  ExternalLink,
  Calendar,
  X,
  CreditCard
} from 'lucide-react';
import { UserProfile, DigitalCertificate, CustomerProfile } from '../types/erp';
import { dataStore } from '../config/firebase';
import { downloadCertificatePdf, getCertificatePdfDataUri } from '../utils/certificatePdfGenerator';
import { exportToCSV } from '../utils/exportUtils';
import DigitalIDCardsModule from './DigitalIDCardsModule';

interface DigitalCertificateModuleProps {
  activeUser: UserProfile;
}

export default function DigitalCertificateModule({ activeUser }: DigitalCertificateModuleProps) {
  const [activeSegment, setActiveSegment] = useState<'certificates' | 'id_cards'>('certificates');
  const [certificates, setCertificates] = useState<DigitalCertificate[]>([]);
  const [trainees, setTrainees] = useState<CustomerProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Issue Certificate Modal
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedTraineeId, setSelectedTraineeId] = useState('');
  const [programName, setProgramName] = useState('Full-Stack Web Engineering & Cloud Architecture');
  const [trackSpecialization, setTrackSpecialization] = useState('React, TypeScript & Serverless Microservices');
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);
  const [gradeOrHonors, setGradeOrHonors] = useState<DigitalCertificate['gradeOrHonors']>('Distinction');
  const [issuingOrg, setIssuingOrg] = useState('Tumi Global Skills & Vocational Empowerment Initiative');
  const [donorSponsor, setDonorSponsor] = useState('European Union Directorate-General for International Partnerships');

  // Preview Modal
  const [previewCert, setPreviewCert] = useState<DigitalCertificate | null>(null);
  const [previewPdfUri, setPreviewPdfUri] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    setCertificates(dataStore.getDigitalCertificates());
    setTrainees(dataStore.getCustomers());
  }, []);

  const filteredCerts = certificates.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.recipientName.toLowerCase().includes(q) ||
      c.certificateNumber.toLowerCase().includes(q) ||
      c.programName.toLowerCase().includes(q) ||
      (c.donorSponsorName && c.donorSponsorName.toLowerCase().includes(q))
    );
  });

  const handleIssueCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    const trainee = trainees.find(t => t.id === selectedTraineeId);
    if (!trainee) return;

    const certNum = `CERT-2026-NGO-${Math.floor(10000 + Math.random() * 90000)}`;
    const newCert = dataStore.issueCertificate({
      certificateNumber: certNum,
      recipientId: trainee.id,
      recipientName: trainee.name,
      recipientEmail: trainee.email,
      programName,
      trackSpecialization,
      completionDate,
      issueDate: new Date().toISOString().split('T')[0],
      gradeOrHonors,
      issuingOrganization: issuingOrg,
      donorSponsorName: donorSponsor,
      accreditedBy: 'International TVET Skills Alliance',
      qrVerificationCode: `VERIFY-TUMI-${certNum}`,
      verificationUrl: `https://tumierp.app/verify/cert/${certNum}`,
      emailDispatchedAt: new Date().toISOString()
    });

    setCertificates(dataStore.getDigitalCertificates());
    setIsIssueModalOpen(false);
    setSelectedTraineeId('');
    showToast(`Certificate #${newCert.certificateNumber} officially issued to ${trainee.name}!`);
  };

  const handlePreview = (cert: DigitalCertificate) => {
    setPreviewCert(cert);
    const uri = getCertificatePdfDataUri(cert);
    setPreviewPdfUri(uri);
  };

  const handleDownload = (cert: DigitalCertificate) => {
    downloadCertificatePdf(cert);
    showToast(`Downloaded ${cert.certificateNumber} PDF.`);
  };

  const handleDispatchEmail = (cert: DigitalCertificate) => {
    const updated = certificates.map(c => {
      if (c.id === cert.id) {
        return {
          ...c,
          emailDispatchedAt: new Date().toISOString()
        };
      }
      return c;
    });
    dataStore.saveDigitalCertificates(updated);
    setCertificates(updated);
    showToast(`Official Certificate PDF sent via email to ${cert.recipientEmail}`);
  };

  const handleExportCSV = () => {
    const headers = [
      'Certificate Serial', 
      'Recipient Name', 
      'Email', 
      'Program', 
      'Track', 
      'Grade / Honors', 
      'Issued Date', 
      'Sponsor Donor', 
      'Email Sent Status'
    ];
    const rows = certificates.map(c => [
      c.certificateNumber,
      c.recipientName,
      c.recipientEmail,
      c.programName,
      c.trackSpecialization,
      c.gradeOrHonors,
      c.issueDate,
      c.donorSponsorName || 'Self-Funded',
      c.emailDispatchedAt ? 'Dispatched' : 'Pending'
    ]);
    exportToCSV('ngo_issued_certificates_registry.csv', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Segment Switcher */}
      <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit no-print">
        <button
          onClick={() => setActiveSegment('certificates')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
            activeSegment === 'certificates'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Award className="w-4 h-4 shrink-0 text-indigo-600" />
          <span>Award Course Certificates</span>
        </button>
        <button
          onClick={() => setActiveSegment('id_cards')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
            activeSegment === 'id_cards'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <CreditCard className="w-4 h-4 shrink-0 text-indigo-600" />
          <span>Digital ID Badges & Cards</span>
        </button>
      </div>

      {activeSegment === 'id_cards' ? (
        <DigitalIDCardsModule activeUser={activeUser} />
      ) : (
        <div className="space-y-6">
          {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-sm font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Accreditation & Credentials
            </span>
            <span className="text-xs text-slate-400">• Verifiable Digital Seals</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Digital Credential & Certificate Generator</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Issue cryptographically stamped course completion certificates, generate print-ready landscape PDFs, dispatch credentials to student emails, and maintain an immutable registry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Registry</span>
          </button>

          <button
            onClick={() => setIsIssueModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Confer New Certificate</span>
          </button>
        </div>
      </div>

      {/* Certificates Directory Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900">Official Issued Credentials Registry</h2>
            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-semibold">
              {filteredCerts.length}
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search serial number, recipient or course..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-56 sm:w-72 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Certificate Serial</th>
                <th className="py-3.5 px-4">Recipient Name</th>
                <th className="py-3.5 px-4">Program & Specialization</th>
                <th className="py-3.5 px-4">Honors Tier</th>
                <th className="py-3.5 px-4">Issue Date</th>
                <th className="py-3.5 px-4">Supported By</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCerts.map(cert => (
                <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                      {cert.certificateNumber}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{cert.recipientName}</div>
                    <div className="text-slate-400 text-[11px]">{cert.recipientEmail}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800">{cert.programName}</div>
                    <div className="text-indigo-600 text-[11px]">{cert.trackSpecialization}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center space-x-1 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <Award className="w-3 h-3 text-amber-600" />
                      <span>{cert.gradeOrHonors}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {cert.issueDate}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                    {cert.donorSponsorName ? (
                      <span className="truncate block max-w-xs">{cert.donorSponsorName}</span>
                    ) : (
                      <span className="italic text-slate-400">Institutional Grant</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => handlePreview(cert)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg transition-all"
                        title="Live Preview Landscape PDF"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                      </button>

                      <button
                        onClick={() => handleDownload(cert)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg transition-all"
                        title="Download Certificate PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-600" />
                      </button>

                      <button
                        onClick={() => handleDispatchEmail(cert)}
                        className={`p-1.5 rounded-lg transition-all ${
                          cert.emailDispatchedAt 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                        }`}
                        title={cert.emailDispatchedAt ? `Sent at ${new Date(cert.emailDispatchedAt).toLocaleTimeString()}` : 'Dispatch via Email'}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Certificate Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Confer Official TVET Certificate</h3>
            <p className="text-xs text-slate-500 mt-0.5">Generate digital credential with tamper-evident QR code and verified seal.</p>

            <form onSubmit={handleIssueCertificate} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Beneficiary Graduate</label>
                <select
                  value={selectedTraineeId}
                  onChange={e => setSelectedTraineeId(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                >
                  <option value="">-- Choose Trainee --</option>
                  {trainees.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Program Track</label>
                <input
                  type="text"
                  value={programName}
                  onChange={e => setProgramName(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization Focus</label>
                <input
                  type="text"
                  value={trackSpecialization}
                  onChange={e => setTrackSpecialization(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Graduation Date</label>
                  <input
                    type="date"
                    value={completionDate}
                    onChange={e => setCompletionDate(e.target.value)}
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Conferred Honors</label>
                  <select
                    value={gradeOrHonors}
                    onChange={e => setGradeOrHonors(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  >
                    <option value="Distinction">Awarded with Distinction</option>
                    <option value="Merit">Awarded with Merit</option>
                    <option value="Pass">General Pass</option>
                    <option value="Certified Practitioner">Certified TVET Practitioner</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sponsoring Donor / Grant</label>
                <input
                  type="text"
                  value={donorSponsor}
                  onChange={e => setDonorSponsor(e.target.value)}
                  placeholder="e.g. European Union or Mastercard Foundation"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20"
                >
                  Issue & Generate PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Live Preview Modal */}
      {previewCert && previewPdfUri && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Certificate PDF Preview</h3>
                <p className="text-xs text-slate-400">
                  {previewCert.certificateNumber} • {previewCert.recipientName}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownload(previewCert)}
                  className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={() => {
                    setPreviewCert(null);
                    setPreviewPdfUri(null);
                  }}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-[500px] mt-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <iframe
                src={previewPdfUri}
                title="Certificate PDF Viewer"
                className="w-full h-full min-h-[520px] border-0"
              />
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
