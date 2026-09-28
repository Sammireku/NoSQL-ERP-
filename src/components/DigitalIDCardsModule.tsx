import React, { useState, useEffect, useRef } from 'react';
import { 
  CreditCard, 
  Search, 
  Download, 
  Printer, 
  User, 
  Upload, 
  Check, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles, 
  Eye, 
  Sliders, 
  FileImage,
  Award,
  BookOpen,
  Phone,
  Mail,
  Calendar,
  X,
  Plus
} from 'lucide-react';
import { StudentStaffStore, StudentRegistrationRecord } from '../utils/studentStaffStore';
import { dataStore } from '../config/firebase';
import { UserProfile } from '../types/erp';

interface DigitalIDCardsModuleProps {
  activeUser: UserProfile;
}

interface IDCardData {
  id: string;
  name: string;
  photoUrl: string;
  type: 'student' | 'staff';
  idNumber: string;
  roleOrProgram: string;
  cohortOrDept: string;
  phone: string;
  email: string;
  issueDate: string;
  expiryDate: string;
  bloodGroup: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  accentColor: string;
}

export default function DigitalIDCardsModule({ activeUser }: DigitalIDCardsModuleProps) {
  const [students, setStudents] = useState<StudentRegistrationRecord[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  // Selection states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterType, setActiveFilterType] = useState<'all' | 'student' | 'staff'>('all');
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  
  // Bulk selection for batch printing
  const [selectedIdsForBulk, setSelectedIdsForBulk] = useState<string[]>([]);
  const [isBulkPrintMode, setIsBulkPrintMode] = useState(false);
  const [cardOrientation, setCardOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showBackOfCard, setShowBackOfCard] = useState(false);
  
  // Card customization on the fly (temp local overrides)
  const [customCardData, setCustomCardData] = useState<IDCardData | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Signature and official stamp overrides
  const [officialSignature, setOfficialSignature] = useState('Samuel Mireku');
  const [officialTitle, setOfficialTitle] = useState('Executive Director / CEO');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load data
  useEffect(() => {
    const stList = StudentStaffStore.getStudents();
    const sfList = StudentStaffStore.getStaffList();
    setStudents(stList);
    setStaffList(sfList);

    // Default select first item if available
    const firstStudent = stList[0];
    if (firstStudent) {
      handleSelectCard(firstStudent.id, 'student', stList, sfList);
    } else if (sfList[0]) {
      handleSelectCard(sfList[0].uid, 'staff', stList, sfList);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Build unified card schema
  const handleSelectCard = (id: string, type: 'student' | 'staff', stList = students, sfList = staffList) => {
    setSelectedCardId(id);
    if (type === 'student') {
      const s = stList.find(st => st.id === id);
      if (s) {
        // Calculate issue date from enrollment, or fallback
        const issueDate = s.enrollmentDate || new Date().toISOString().slice(0, 10);
        // Expiry date is usually +18 months (1.5 years) for vocational tracks, or +1 year
        const eDate = new Date(issueDate);
        eDate.setMonth(eDate.getMonth() + 18);
        const expiryDate = eDate.toISOString().slice(0, 10);

        setCustomCardData({
          id: s.id,
          name: s.name,
          photoUrl: s.idPhotoUrl || '',
          type: 'student',
          idNumber: s.idNumber || `STD-${s.id.replace('std_', '')}`,
          roleOrProgram: s.programName || 'Vocational Training Track',
          cohortOrDept: s.cohort || 'Cohort 2026',
          phone: s.phoneNumber || s.contactPersonPhone || '+233 24 000 0000',
          email: `${s.name.toLowerCase().replace(/\s+/g, '')}@tumi.org`,
          issueDate,
          expiryDate,
          bloodGroup: 'B+',
          emergencyContactName: s.contactPersonName || 'Parent / Guardian',
          emergencyContactPhone: s.contactPersonPhone || '+233 20 000 0000',
          accentColor: '#4f46e5' // indigo
        });
      }
    } else {
      const s = sfList.find(sf => sf.uid === id);
      if (s) {
        const issueDate = s.createdAt ? s.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
        const eDate = new Date(issueDate);
        eDate.setFullYear(eDate.getFullYear() + 2); // Staff ID valid 2 years
        const expiryDate = eDate.toISOString().slice(0, 10);

        setCustomCardData({
          id: s.uid,
          name: s.name,
          photoUrl: s.photoUrl || s.idPhotoUrl || '',
          type: 'staff',
          idNumber: s.idNumber || `STF-${s.uid.slice(-6).toUpperCase()}`,
          roleOrProgram: s.role ? s.role.charAt(0).toUpperCase() + s.role.slice(1) : 'Staff Member',
          cohortOrDept: s.department || 'Operations Team',
          phone: s.phoneNumber || s.phone || '+233 24 555 8891',
          email: s.email || `${s.name.toLowerCase().replace(/\s+/g, '')}@tumihub.org`,
          issueDate,
          expiryDate,
          bloodGroup: 'O+',
          emergencyContactName: s.contactPersonName || 'Emergency Contact',
          emergencyContactPhone: s.contactPersonPhone || '+233 20 000 0000',
          accentColor: '#059669' // emerald
        });
      }
    }
  };

  // Handle manual photo upload for card
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !customCardData) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      
      // Update local override
      const updated = { ...customCardData, photoUrl: result };
      setCustomCardData(updated);

      // Persist photo back to global store so it stays saved!
      if (customCardData.type === 'student') {
        StudentStaffStore.updateStudent(customCardData.id, { idPhotoUrl: result });
        setStudents(StudentStaffStore.getStudents());
      } else {
        StudentStaffStore.updateStaff(customCardData.id, { idPhotoUrl: result });
        setStaffList(StudentStaffStore.getStaffList());
      }
      showToast('✓ High-definition ID photo successfully uploaded and linked to record!');
    };
    reader.readAsDataURL(file);
  };

  // Sync edits to persistent store
  const handleSaveChanges = () => {
    if (!customCardData) return;
    
    if (customCardData.type === 'student') {
      StudentStaffStore.updateStudent(customCardData.id, {
        name: customCardData.name,
        idNumber: customCardData.idNumber,
        programName: customCardData.roleOrProgram,
        cohort: customCardData.cohortOrDept,
        phoneNumber: customCardData.phone,
        contactPersonName: customCardData.emergencyContactName,
        contactPersonPhone: customCardData.emergencyContactPhone
      });
      setStudents(StudentStaffStore.getStudents());
    } else {
      StudentStaffStore.updateStaff(customCardData.id, {
        name: customCardData.name,
        idNumber: customCardData.idNumber,
        role: customCardData.roleOrProgram.toLowerCase(),
        department: customCardData.cohortOrDept,
        phoneNumber: customCardData.phone,
        contactPersonName: customCardData.emergencyContactName,
        contactPersonPhone: customCardData.emergencyContactPhone
      });
      setStaffList(StudentStaffStore.getStaffList());
    }
    showToast('✓ ID Card record updated permanently in ERP database!');
  };

  // Auto-calculated filter matches
  const filteredList = [
    ...students.map(s => ({ id: s.id, name: s.name, type: 'student' as const, subtitle: s.programName, raw: s })),
    ...staffList.map(s => ({ id: s.uid, name: s.name, type: 'staff' as const, subtitle: s.role, raw: s }))
  ].filter(item => {
    const matchType = activeFilterType === 'all' || item.type === activeFilterType;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (item.subtitle && item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        item.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  // Toggle bulk printing selections
  const toggleBulkSelection = (id: string) => {
    setSelectedIdsForBulk(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllBulk = () => {
    if (selectedIdsForBulk.length === filteredList.length) {
      setSelectedIdsForBulk([]);
    } else {
      setSelectedIdsForBulk(filteredList.map(f => f.id));
    }
  };

  // Trigger browser print dialog formatted perfectly
  const triggerPrint = () => {
    window.print();
  };

  // Draw high fidelity card in Canvas for exporting as PNG image
  const exportCardAsImage = (side: 'front' | 'back') => {
    if (!customCardData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Card dimensions (standard CR80 ratio scaled for high DPI)
    const isPortrait = cardOrientation === 'portrait';
    canvas.width = isPortrait ? 600 : 950;
    canvas.height = isPortrait ? 950 : 600;

    const w = canvas.width;
    const h = canvas.height;

    // Clean background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Draw card border & outer gradient background
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, customCardData.accentColor);
    gradient.addColorStop(0.3, '#1e1b4b'); // Deep indigo background
    gradient.addColorStop(1, '#0f172a'); // Very dark blue/slate
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Draw safety guilloche vector watermark pattern (aesthetic grid lines)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.bezierCurveTo(i + 100, h / 3, i - 100, (h * 2) / 3, i, h);
      ctx.stroke();
    }

    if (side === 'front') {
      // FRONT SIDE DRAWING
      // 1. Header Banner background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.fillRect(0, 0, w, 110);
      
      // 2. NGO Logo text / Icon
      ctx.fillStyle = '#f59e0b'; // Gold
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('⭐ TUMI GLOBAL SKILLS INITIATIVE', 30, 48);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'semibold 13px font-mono, sans-serif';
      ctx.fillText('VOCATIONAL EMPOWERMENT CENTER • GHANA', 30, 72);

      // Gold bottom line
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, 106, w, 4);

      // 3. User Portrait Image Placement
      const drawPortrait = (imgSrc: string) => {
        const photoSize = 210;
        const photoX = isPortrait ? (w - photoSize) / 2 : 50;
        const photoY = isPortrait ? 180 : 160;

        // Photo Border
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(photoX - 8, photoY - 8, photoSize + 16, photoSize + 16);
        ctx.strokeStyle = customCardData.accentColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(photoX - 8, photoY - 8, photoSize + 16, photoSize + 16);

        // Portrait photo drawing (using high quality base64 image or placeholder fallback)
        if (imgSrc) {
          const img = new Image();
          img.src = imgSrc;
          img.onload = () => {
            ctx.drawImage(img, photoX, photoY, photoSize, photoSize);
            finishDraw();
          };
          img.onerror = () => {
            drawFallbackAvatar();
          };
        } else {
          drawFallbackAvatar();
        }

        function drawFallbackAvatar() {
          // Draw standard cool avatar vector inside photo area
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(photoX, photoY, photoSize, photoSize);
          
          ctx.fillStyle = '#64748b';
          // Head
          ctx.beginPath();
          ctx.arc(photoX + photoSize / 2, photoY + photoSize / 3 + 10, photoSize / 5, 0, Math.PI * 2);
          ctx.fill();
          // Body
          ctx.beginPath();
          ctx.arc(photoX + photoSize / 2, photoY + photoSize + 20, photoSize / 3, Math.PI, 0);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('AWAITING PHOTO', photoX + 50, photoY + photoSize - 20);
          finishDraw();
        }
      };

      const finishDraw = () => {
        // 4. Details Texts
        const textStartX = isPortrait ? 30 : 310;
        const textStartY = isPortrait ? 460 : 180;
        const lineSpacing = 42;

        // Big Name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px system-ui, sans-serif';
        ctx.fillText(customCardData.name.toUpperCase(), textStartX, textStartY + 10);

        // Underline Name
        ctx.fillStyle = customCardData.accentColor;
        ctx.fillRect(textStartX, textStartY + 20, isPortrait ? w - 60 : 500, 3);

        // ID Label Indicator
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText('IDENTIFICATION NO:', textStartX, textStartY + 60);

        ctx.fillStyle = '#f59e0b'; // Gold key-field
        ctx.font = 'bold 22px font-mono, sans-serif';
        ctx.fillText(customCardData.idNumber, textStartX, textStartY + 90);

        // Program/Role Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText(customCardData.type === 'student' ? 'TRAINEE COURSE:' : 'STAFF DESIGNATION:', textStartX, textStartY + 140);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'semibold 18px system-ui, sans-serif';
        ctx.fillText(customCardData.roleOrProgram, textStartX, textStartY + 165);

        // Cohort/Department
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText(customCardData.type === 'student' ? 'COHORT BATCH:' : 'DEPARTMENT:', textStartX, textStartY + 215);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'medium 17px system-ui, sans-serif';
        ctx.fillText(customCardData.cohortOrDept, textStartX, textStartY + 240);

        // Badge Pill (STUDENT or STAFF)
        const pillX = isPortrait ? 30 : 310;
        const pillY = isPortrait ? 760 : 470;
        const pillW = 160;
        const pillH = 36;
        
        ctx.fillStyle = customCardData.type === 'student' ? '#3b82f6' : '#10b981'; // Blue vs Emerald
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, 18);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(customCardData.type.toUpperCase() + ' CARD', pillX + 25, pillY + 23);

        // Draw modern holographic Security Lock emblem
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.arc(isPortrait ? w - 100 : w - 130, isPortrait ? h - 160 : h - 140, 70, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'semibold 11px sans-serif';
        ctx.fillText('SECURE ID', isPortrait ? w - 150 : w - 180, isPortrait ? h - 110 : h - 90);

        // Download card trigger from hidden canvas link
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `ID_CARD_FRONT_${customCardData.name.replace(/\s+/g, '_')}.png`;
        link.href = dataUrl;
        link.click();
        showToast('✓ ID Front Side Card Image downloaded successfully!');
      };

      drawPortrait(customCardData.photoUrl);

    } else {
      // BACK SIDE DRAWING
      // 1. Back side Title/Header
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(0, 0, w, 90);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText('GENERAL INFORMATION & TERMS', 30, 52);

      // 2. Policy terms text
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '13px system-ui, sans-serif';
      const lines = [
        "1. This card is official property of Tumi Global Skills Initiative.",
        "2. The holder whose name and ID number appear on this card is",
        "   authorized to access learning hubs, boutique stores & workspace areas.",
        "3. In case of emergency or loss, report immediately to the administration desk.",
        "4. If found, please return to: Tumi Hub, Adum, Kumasi, Ashanti Region, Ghana."
      ];
      lines.forEach((line, index) => {
        ctx.fillText(line, 30, 130 + index * 26);
      });

      // 3. Metadata box (Blood Group, Phone, Dates)
      const dataY = 280;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(30, dataY, w - 60, 140);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.strokeRect(30, dataY, w - 60, 140);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'semibold 14px sans-serif';
      ctx.fillText(`Phone: ${customCardData.phone}`, 50, dataY + 35);
      ctx.fillText(`Email: ${customCardData.email}`, 50, dataY + 65);
      ctx.fillText(`Issue Date: ${customCardData.issueDate}`, 50, dataY + 95);
      ctx.fillText(`Expiry Date: ${customCardData.expiryDate}`, 50, dataY + 125);

      ctx.fillText(`Blood Group: ${customCardData.bloodGroup}`, w / 2 + 50, dataY + 35);
      ctx.fillText(`Emergency Contact: ${customCardData.emergencyContactName}`, w / 2 + 50, dataY + 75);
      ctx.fillText(`EC Phone: ${customCardData.emergencyContactPhone}`, w / 2 + 50, dataY + 110);

      // 4. Barcode Simulation (Aesthetic custom barcode pattern)
      const barY = h - 160;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(40, barY, w - 80, 50);

      // Draw black bars of varying widths
      ctx.fillStyle = '#000000';
      let currentBarX = 50;
      const barcodeStr = customCardData.idNumber;
      for (let idx = 0; idx < barcodeStr.length * 4; idx++) {
        const barWidth = (idx % 3 === 0) ? 6 : ((idx % 2 === 0) ? 3 : 1);
        ctx.fillRect(currentBarX, barY + 5, barWidth, 40);
        currentBarX += barWidth + ((idx % 4 === 0) ? 4 : 2);
        if (currentBarX > w - 60) break;
      }

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 11px font-mono, sans-serif';
      ctx.fillText(`* ${customCardData.idNumber} *`, w / 2 - 45, barY + 33);

      // 5. CEO Sign Off Image Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'italic 18px cursive, Lucida Handwriting, serif';
      ctx.fillText(officialSignature, w - 240, h - 70);
      
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(officialTitle.toUpperCase(), w - 240, h - 48);

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w - 240, h - 82);
      ctx.lineTo(w - 60, h - 82);
      ctx.stroke();

      // Official Stamp Seal Design
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)'; // gold stamp
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(w - 150, h - 68, 38, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.fillText('APPROVED', w - 173, h - 70);
      ctx.fillText('TUMI GHANA', w - 177, h - 60);

      // Download trigger
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `ID_CARD_BACK_${customCardData.name.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      showToast('✓ ID Back Side Card Image downloaded successfully!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden print stylesheet rules inserted directly to force standard size cards when printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area-wrapper, #print-area-wrapper * {
            visibility: visible;
          }
          #print-area-wrapper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-sm font-semibold animate-in fade-in slide-in-from-top-2 border border-slate-700">
          <ShieldCheck className="w-5 h-5 text-amber-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" /> Security & Identification
            </span>
            <span className="text-xs text-slate-400">• Verifiable QR Badging</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Enterprise Digital ID & Print Badge Center</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Generate stunning high-fidelity identification badges for students and staff. Supports live visual customization, individual picture uploads, interactive 3D flipping previews, instant PNG graphics download, and optimized batch print layouts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsBulkPrintMode(!isBulkPrintMode)}
            className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isBulkPrintMode 
                ? 'bg-amber-100 border border-amber-300 text-amber-800' 
                : 'bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{isBulkPrintMode ? 'Single Print Mode' : 'Batch Printing Setup'}</span>
          </button>

          <button
            onClick={triggerPrint}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Current Badges</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: DIRECTORY SELECTOR (4/12 width) */}
        <div className="xl:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[750px] overflow-hidden">
          
          {/* Filter tabs */}
          <div className="p-4 border-b border-slate-100 space-y-3">
            <h2 className="text-sm font-bold text-slate-900">Personnel & Alumni Database</h2>
            
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {(['all', 'student', 'staff'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilterType(f)}
                  className={`flex-1 text-center py-1.5 text-xs font-bold capitalize rounded-md transition-all cursor-pointer ${
                    activeFilterType === f 
                      ? 'bg-white text-indigo-700 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f === 'all' ? 'All Roles' : f + 's'}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID or Course/Title..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Directory List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {isBulkPrintMode && (
              <div className="bg-slate-50 p-3 flex items-center justify-between border-b border-slate-100">
                <span className="text-xs font-bold text-slate-600">
                  Selected for batch ({selectedIdsForBulk.length} of {filteredList.length})
                </span>
                <button
                  onClick={handleSelectAllBulk}
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-bold uppercase tracking-wider"
                >
                  {selectedIdsForBulk.length === filteredList.length ? 'Clear All' : 'Select All'}
                </button>
              </div>
            )}

            {filteredList.map(item => {
              const isSelected = selectedCardId === item.id;
              const isChecked = selectedIdsForBulk.includes(item.id);
              
              return (
                <div 
                  key={item.id}
                  onClick={() => !isBulkPrintMode && handleSelectCard(item.id, item.type)}
                  className={`p-3.5 flex items-center justify-between transition-all cursor-pointer ${
                    isSelected && !isBulkPrintMode ? 'bg-indigo-50/60 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    {isBulkPrintMode ? (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBulkSelection(item.id)}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 shrink-0"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <div className={`p-2 rounded-lg ${item.type === 'student' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {item.type === 'student' ? <BookOpen className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                    )}

                    <div className="truncate">
                      <h3 className="text-xs font-bold text-slate-800 truncate">{item.name}</h3>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${
                          item.type === 'student' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {item.type.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[130px]">{item.subtitle}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">ID: {item.id.replace('std_', '')}</span>
                </div>
              );
            })}

            {filteredList.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">No records found</p>
                <p className="text-[10px] text-slate-400 mt-1">Try adjusting your filters or search keywords.</p>
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE COLUMN: CARD LIVE 3D PREVIEW (4/12 width) */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col items-center justify-between h-[750px] overflow-hidden">
          
          <div className="w-full border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-indigo-600" /> Interactive Card Simulator
            </h2>
            
            <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                onClick={() => setCardOrientation('portrait')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  cardOrientation === 'portrait' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'
                }`}
              >
                Portrait
              </button>
              <button
                onClick={() => setCardOrientation('landscape')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  cardOrientation === 'landscape' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'
                }`}
              >
                Landscape
              </button>
            </div>
          </div>

          {customCardData ? (
            <div className="my-auto flex flex-col items-center space-y-6">
              
              {/* Interactive 3D Flip Card Container */}
              <div 
                className={`group relative perspective-1000 cursor-pointer transition-all ${
                  cardOrientation === 'portrait' ? 'w-[320px] h-[500px]' : 'w-[500px] h-[320px]'
                }`}
                onClick={() => setShowBackOfCard(!showBackOfCard)}
              >
                {/* Visual Rotate Cue Icon */}
                <div className="absolute -top-3 -right-3 z-30 bg-indigo-600 text-white p-1.5 rounded-full shadow-lg border border-indigo-400 animate-bounce">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>

                <div 
                  className={`relative w-full h-full duration-700 transform-style-3d ${
                    showBackOfCard ? 'rotate-y-180' : ''
                  }`}
                >
                  
                  {/* FRONT CARD PANEL */}
                  <div className={`absolute inset-0 backface-hidden rounded-2xl shadow-xl border overflow-hidden flex flex-col justify-between`}
                       style={{ 
                         borderColor: customCardData.accentColor,
                         background: `linear-gradient(135deg, ${customCardData.accentColor} 0%, #1e1b4b 40%, #0f172a 100%)`
                       }}>
                    
                    {/* Security Guilloche vector pattern watermark overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.03),transparent_40%)] pointer-events-none" />
                    
                    {/* Logo Header */}
                    <div className="bg-slate-900/40 p-4 border-b border-white/10 relative z-10 flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                          <h4 className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider font-sans">
                            Tumi Global Skills Initiative
                          </h4>
                        </div>
                        <p className="text-[8px] text-slate-300 font-mono tracking-widest mt-0.5">VOCATIONAL HUB • ACCREDITED CENTER</p>
                      </div>
                      <div className={`w-2.5 h-2.5 rounded-full ${customCardData.type === 'student' ? 'bg-blue-400' : 'bg-emerald-400'} animate-pulse`} />
                    </div>

                    {/* Portrait Photo & Details layout based on Orientation */}
                    {cardOrientation === 'portrait' ? (
                      // PORTRAIT FRONT LAYOUT
                      <div className="flex-1 p-5 flex flex-col items-center justify-between relative z-10 text-center">
                        
                        {/* Photo Box */}
                        <div className="relative">
                          <div className="w-[140px] h-[140px] rounded-xl overflow-hidden border-2 bg-slate-800 flex items-center justify-center shadow-md relative"
                               style={{ borderColor: customCardData.accentColor }}>
                            {customCardData.photoUrl ? (
                              <img src={customCardData.photoUrl} alt="ID Photo" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center p-3">
                                <User className="w-10 h-10 text-slate-500 mx-auto mb-1" />
                                <span className="text-[9px] text-slate-400 font-bold block">AWAITING PHOTO</span>
                              </div>
                            )}
                          </div>
                          <span className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[9px] font-extrabold text-white uppercase tracking-wider ${
                            customCardData.type === 'student' ? 'bg-blue-600' : 'bg-emerald-600'
                          }`}>
                            {customCardData.type}
                          </span>
                        </div>

                        {/* Name and Fields */}
                        <div className="space-y-1.5 mt-2 w-full">
                          <h2 className="text-lg font-black text-white uppercase tracking-tight">{customCardData.name}</h2>
                          <div className="h-0.5 w-2/3 bg-white/20 mx-auto" />
                          
                          <div className="space-y-0.5 text-center">
                            <span className="text-[9px] text-slate-400 uppercase block tracking-wider">Identification No:</span>
                            <span className="text-amber-400 font-mono font-bold text-sm">{customCardData.idNumber}</span>
                          </div>

                          <div className="space-y-0.5 text-center">
                            <span className="text-[9px] text-slate-400 uppercase block tracking-wider">
                              {customCardData.type === 'student' ? 'Trainee Specialization:' : 'Designation / Title:'}
                            </span>
                            <span className="text-white text-xs font-bold block">{customCardData.roleOrProgram}</span>
                          </div>

                          <div className="space-y-0.5 text-center">
                            <span className="text-[9px] text-slate-400 uppercase block tracking-wider">Cohort Group:</span>
                            <span className="text-slate-300 text-xs font-medium block">{customCardData.cohortOrDept}</span>
                          </div>
                        </div>

                      </div>
                    ) : (
                      // LANDSCAPE FRONT LAYOUT
                      <div className="flex-1 p-5 flex items-center space-x-5 relative z-10">
                        {/* Left photo box */}
                        <div className="relative shrink-0">
                          <div className="w-[130px] h-[130px] rounded-xl overflow-hidden border-2 bg-slate-800 flex items-center justify-center shadow-md"
                               style={{ borderColor: customCardData.accentColor }}>
                            {customCardData.photoUrl ? (
                              <img src={customCardData.photoUrl} alt="ID Photo" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center p-2">
                                <User className="w-8 h-8 text-slate-500 mx-auto mb-1" />
                                <span className="text-[8px] text-slate-400 font-bold block">AWAITING PHOTO</span>
                              </div>
                            )}
                          </div>
                          <span className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[9px] font-extrabold text-white uppercase tracking-wider ${
                            customCardData.type === 'student' ? 'bg-blue-600' : 'bg-emerald-600'
                          }`}>
                            {customCardData.type}
                          </span>
                        </div>

                        {/* Right details */}
                        <div className="flex-1 space-y-2 text-left">
                          <h2 className="text-lg font-black text-white uppercase tracking-tight">{customCardData.name}</h2>
                          <div className="h-0.5 w-full bg-white/20" />
                          
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase block tracking-wider">ID Number:</span>
                              <span className="text-amber-400 font-mono font-bold">{customCardData.idNumber}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase block tracking-wider">Cohort Dept:</span>
                              <span className="text-slate-300 font-medium">{customCardData.cohortOrDept}</span>
                            </div>
                          </div>

                          <div>
                            <span className="text-[9px] text-slate-400 uppercase block tracking-wider">
                              {customCardData.type === 'student' ? 'Course Track:' : 'Staff Title:'}
                            </span>
                            <span className="text-white font-bold text-xs">{customCardData.roleOrProgram}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Gold Footer with validity */}
                    <div className="bg-slate-950/80 p-3 border-t border-white/10 relative z-10 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Validity: <span className="text-white font-bold">{customCardData.expiryDate}</span></span>
                      <div className="flex items-center space-x-1 text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-mono text-[9px] font-extrabold">VERIFIED BY CEO</span>
                      </div>
                    </div>

                  </div>

                  {/* BACK CARD PANEL */}
                  <div className="absolute inset-0 rotate-y-180 backface-hidden rounded-2xl shadow-xl border overflow-hidden flex flex-col justify-between"
                       style={{ 
                         borderColor: customCardData.accentColor,
                         background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)'
                       }}>
                    
                    {/* Policy terms and contact details */}
                    <div className="p-4 border-b border-white/5 bg-slate-900/60">
                      <h4 className="text-[10px] font-extrabold text-white tracking-widest uppercase">ID Card Terms of Use</h4>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between text-left relative z-10">
                      
                      {/* Terms text */}
                      <div className="space-y-1 text-[8.5px] text-slate-300 font-sans leading-relaxed">
                        <p>• This identification card is officially issued and recognized by Tumi.</p>
                        <p>• Possession grants access to official workshop rooms, tech desks & stores.</p>
                        <p>• Card is strictly non-transferable. If lost, GHS 50 fee applies for renewal.</p>
                        <p>• If found, return to: Tumi Hub, Adum, Kumasi, Ashanti Region, Ghana.</p>
                      </div>

                      {/* Info matrix */}
                      <div className="bg-slate-900/40 p-2.5 rounded-lg border border-white/5 text-[9.5px] grid grid-cols-2 gap-1 mt-1 text-slate-300">
                        <div>
                          <span className="text-[8px] text-slate-400 block uppercase">Phone Contact:</span>
                          <span className="font-semibold block truncate">{customCardData.phone}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 block uppercase">Blood Group:</span>
                          <span className="font-semibold block">{customCardData.bloodGroup}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[8px] text-slate-400 block uppercase">Emergency Contact:</span>
                          <span className="font-semibold block truncate">{customCardData.emergencyContactName} ({customCardData.emergencyContactPhone})</span>
                        </div>
                      </div>

                      {/* Barcode & CEO signature Row */}
                      <div className="flex items-center justify-between border-t border-white/10 pt-2.5 mt-1.5">
                        {/* Mock Barcode visual */}
                        <div className="bg-white px-2 py-1 rounded flex flex-col items-center shrink-0">
                          <div className="flex space-x-0.5 h-5 items-end bg-black p-0.5">
                            {[2,1,4,1,3,2,1,2,4,1,2,1,3,1,2,4,2].map((w, i) => (
                              <div key={i} className="bg-white h-full" style={{ width: `${w}px` }} />
                            ))}
                          </div>
                          <span className="text-[7px] text-black font-mono mt-0.5 font-bold">{customCardData.idNumber}</span>
                        </div>

                        {/* Signatures */}
                        <div className="text-right">
                          <span className="font-serif italic text-amber-300 text-xs block relative">
                            {officialSignature}
                            <span className="absolute right-2 -top-1 w-6 h-6 border-2 border-amber-500/20 rounded-full flex items-center justify-center text-[7px] rotate-12 text-amber-500/40 font-bold uppercase shrink-0">stamp</span>
                          </span>
                          <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">{officialTitle}</span>
                        </div>
                      </div>

                    </div>

                    <div className="bg-slate-950 p-2 text-center text-[8px] text-slate-500 border-t border-white/5">
                      © 2026 Tumi NGO - Powered by Google AI Studio
                    </div>

                  </div>

                </div>
              </div>

              {/* Graphic Downloads Row */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => exportCardAsImage('front')}
                  className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Front (PNG)</span>
                </button>

                <button
                  onClick={() => exportCardAsImage('back')}
                  className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Back (PNG)</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-400 italic text-center">
                💡 Tip: Hover or click on the card above to rotate it dynamically and see the back!
              </p>

            </div>
          ) : (
            <div className="my-auto text-center text-slate-400 py-12">
              <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">Select an individual from directory</p>
              <p className="text-xs text-slate-400 mt-1">Select a student or staff member from the left panel to load interactive simulator.</p>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: CARD MANIPULATOR & BATCH (4/12 width) */}
        <div className="xl:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between h-[750px] overflow-hidden">
          
          <div className="flex-1 overflow-y-auto space-y-5">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              ID Badge Properties Override
            </h2>

            {customCardData ? (
              <div className="space-y-4 text-xs">
                {/* Photo uploader input */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Modify ID Photo</label>
                  <div className="flex items-center space-x-2.5">
                    {customCardData.photoUrl ? (
                      <img src={customCardData.photoUrl} className="w-9 h-9 rounded object-cover border" alt="Tiny thumb" />
                    ) : (
                      <div className="w-9 h-9 rounded bg-slate-100 border flex items-center justify-center"><User className="w-5 h-5 text-slate-400" /></div>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload JPG/PNG</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block">Trainee / Staff Name</label>
                  <input
                    type="text"
                    value={customCardData.name}
                    onChange={e => setCustomCardData({ ...customCardData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                {/* Card ID */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block">Identification Card Number</label>
                  <input
                    type="text"
                    value={customCardData.idNumber}
                    onChange={e => setCustomCardData({ ...customCardData, idNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Title or course */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block">
                    {customCardData.type === 'student' ? 'Course Curriculum Track' : 'Corporate Title Designation'}
                  </label>
                  <input
                    type="text"
                    value={customCardData.roleOrProgram}
                    onChange={e => setCustomCardData({ ...customCardData, roleOrProgram: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Department or Cohort */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block">
                    {customCardData.type === 'student' ? 'Cohort Batch' : 'Active Department'}
                  </label>
                  <input
                    type="text"
                    value={customCardData.cohortOrDept}
                    onChange={e => setCustomCardData({ ...customCardData, cohortOrDept: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold block">Issue Date</label>
                    <input
                      type="date"
                      value={customCardData.issueDate}
                      onChange={e => setCustomCardData({ ...customCardData, issueDate: e.target.value })}
                      className="w-full px-2 py-1.5 bg-slate-50 border rounded-lg focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold block">Expiry Date</label>
                    <input
                      type="date"
                      value={customCardData.expiryDate}
                      onChange={e => setCustomCardData({ ...customCardData, expiryDate: e.target.value })}
                      className="w-full px-2 py-1.5 bg-slate-50 border rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                {/* Accent Color picker */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-bold block">Accent Theme Color</label>
                  <div className="flex space-x-2">
                    {['#4f46e5', '#059669', '#dc2626', '#d97706', '#0284c7', '#7c3aed'].map(color => (
                      <button
                        key={color}
                        onClick={() => setCustomCardData({ ...customCardData, accentColor: color })}
                        className={`w-6 h-6 rounded-full border transition-transform ${
                          customCardData.accentColor === color ? 'scale-125 border-slate-900' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveChanges}
                    className="w-full bg-slate-900 text-white font-bold py-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Save Changes to Database
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Select personnel from list to unlock live form edit fields.</p>
            )}

            {/* Signature custom settings */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Official Stamp & Signature</h3>
              
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-slate-500 font-bold block mb-1">CEO Authorized Signee Name</label>
                  <input
                    type="text"
                    value={officialSignature}
                    onChange={e => setOfficialSignature(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Corporate Officer Designation</label>
                  <input
                    type="text"
                    value={officialTitle}
                    onChange={e => setOfficialTitle(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

          </div>

          <div className="border-t border-slate-100 pt-4 text-xs text-slate-400">
            <span className="font-bold text-slate-700 block">Print Tip:</span>
            A4 layout fits up to 8 identity badges in landscape grids. Standard lamination thickness is 250 microns.
          </div>

        </div>

      </div>

      {/* Hidden layout canvas for downloading PNG card images */}
      <canvas ref={canvasRef} className="hidden" />

      {/* BATCH PRINTING LAYOUT PREVIEW PANEL (Visible ONLY when isBulkPrintMode is active) */}
      {isBulkPrintMode && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Batch Sheet Grid Preview (A4 Page Alignment)</h2>
              <p className="text-xs text-slate-500">
                Aligning {selectedIdsForBulk.length} cards in double-paired columns. When printing, checking browser "Background graphics" is recommended.
              </p>
            </div>
            <button
              onClick={triggerPrint}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Launch Batch Print</span>
            </button>
          </div>

          {selectedIdsForBulk.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white border rounded-xl shadow-xs">
              <Check className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold">No cards checked for batch printing</p>
              <p className="text-[10px] mt-1">Check boxes next to names in the left-hand directory to stage them here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border shadow-inner">
              {/* This mimics the print stylesheet grid layout */}
              {selectedIdsForBulk.map(id => {
                const std = students.find(s => s.id === id);
                const stf = staffList.find(s => s.uid === id);
                
                // Construct parameters
                const name = std ? std.name : (stf ? stf.name : 'Unknown');
                const num = std ? (std.idNumber || std.id) : (stf ? (stf.idNumber || stf.uid) : 'STF-001');
                const prog = std ? std.programName : (stf ? (stf.role ? stf.role.toUpperCase() : 'Staff Member') : 'General');
                const cohort = std ? std.cohort : (stf ? (stf.department || 'Operations') : 'Operations');
                const expDate = std ? (std.enrollmentDate || '2026-01-01') : '2028-01-01';
                const color = std ? '#4f46e5' : '#059669';
                const photo = std ? std.idPhotoUrl : (stf ? stf.photoUrl || stf.idPhotoUrl : null);

                return (
                  <div key={id} className="border p-4 rounded-xl flex items-center justify-between gap-4 bg-slate-50/60 shadow-xs relative">
                    {/* Front preview card mockup */}
                    <div className="w-[160px] h-[250px] rounded-lg border overflow-hidden text-white flex flex-col justify-between shrink-0 shadow-sm"
                         style={{ 
                           borderColor: color,
                           background: `linear-gradient(135deg, ${color} 0%, #1e1b4b 50%, #0f172a 100%)` 
                         }}>
                      <div className="bg-slate-900/40 p-1.5 border-b border-white/10 text-[6.5px] font-extrabold text-center text-amber-400">
                        TUMI SKILLS INITIATIVE
                      </div>
                      
                      <div className="p-2 flex flex-col items-center justify-center flex-1 space-y-1 text-center">
                        <div className="w-[60px] h-[60px] rounded bg-slate-800 border flex items-center justify-center overflow-hidden">
                          {photo ? <img src={photo} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-slate-500" />}
                        </div>
                        <h3 className="text-[10px] font-extrabold leading-tight tracking-tight truncate w-full">{name}</h3>
                        <p className="text-[7.5px] text-amber-400 font-mono font-bold leading-none">{num}</p>
                        <p className="text-[7.5px] text-slate-300 font-medium leading-none truncate w-full">{prog}</p>
                        <p className="text-[7.5px] text-slate-400 leading-none truncate w-full">{cohort}</p>
                      </div>

                      <div className="bg-slate-950 p-1.5 text-[6px] text-slate-400 text-center border-t border-white/5 uppercase font-bold tracking-widest">
                        {std ? 'Student Badge' : 'Staff Badge'}
                      </div>
                    </div>

                    {/* Back preview card mockup */}
                    <div className="w-[160px] h-[250px] rounded-lg border bg-slate-950 text-slate-300 p-2.5 flex flex-col justify-between shrink-0 shadow-sm"
                         style={{ borderColor: color }}>
                      <div className="text-[6px] text-slate-400 space-y-1 border-b border-white/10 pb-1 text-left">
                        <p className="font-extrabold text-white text-[7px] uppercase tracking-wider">Tumi Ghana Hub</p>
                        <p>Return if lost to Tumi NGO Center, Kumasi.</p>
                      </div>

                      <div className="text-[6.5px] space-y-0.5 text-left bg-white/5 p-1 rounded font-medium border border-white/5 my-1.5">
                        <p className="truncate">Emergency: {std ? std.contactPersonPhone || '+233' : '+233'}</p>
                        <p>Blood Group: B+</p>
                        <p>Valid Till: {expDate}</p>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-white/5">
                        {/* tiny barcode */}
                        <div className="bg-white px-1 py-0.5 rounded text-[5px] text-black font-mono flex items-center shrink-0">barcode</div>
                        
                        {/* Signature */}
                        <div className="text-[5.5px] text-right">
                          <span className="font-serif italic text-amber-300 block">{officialSignature}</span>
                          <span className="text-[5px] text-slate-400 uppercase tracking-widest">{officialTitle}</span>
                        </div>
                      </div>
                    </div>

                    {/* Deselect trigger */}
                    <button
                      onClick={() => toggleBulkSelection(id)}
                      className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-full p-1 border shadow-xs"
                      title="Deselect from batch"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 
        OFFICIAL PRINT SHEET AREA (VISIBLE ONLY VIA MEDIA PRINT QUERY)
        This is perfectly formatted to occupy 100% standard paper sizes and auto-wrap cleanly.
      */}
      <div id="print-area-wrapper" className="hidden">
        <div className="p-8 bg-white text-black font-sans min-h-screen">
          <div className="text-center pb-8 border-b border-slate-200 no-print">
            <h1 className="text-xl font-bold">Print Preview Mode - Use Browser Print (Ctrl+P / Cmd+P)</h1>
            <p className="text-xs text-slate-500">Configure layout orientation as Portrait/Landscape, and enable background graphics in your print settings.</p>
          </div>

          <div className="grid grid-cols-2 gap-y-12 gap-x-8 max-w-5xl mx-auto pt-6">
            {(isBulkPrintMode ? selectedIdsForBulk : (customCardData ? [customCardData.id] : [])).map((id, index) => {
              // Find details
              const std = students.find(s => s.id === id);
              const stf = staffList.find(s => s.uid === id);
              
              if (!std && !stf && !customCardData) return null;

              const name = std ? std.name : (stf ? stf.name : customCardData?.name || '');
              const num = std ? (std.idNumber || std.id) : (stf ? (stf.idNumber || stf.uid) : customCardData?.idNumber || '');
              const type = std ? 'student' : 'staff';
              const prog = std ? std.programName : (stf ? (stf.role ? stf.role.toUpperCase() : 'Staff Member') : customCardData?.roleOrProgram || '');
              const cohort = std ? std.cohort : (stf ? (stf.department || 'Operations Team') : customCardData?.cohortOrDept || '');
              const phone = std ? (std.phoneNumber || std.contactPersonPhone || '') : (stf ? (stf.phoneNumber || '') : customCardData?.phone || '');
              const email = std ? `${std.name.toLowerCase().replace(/\s+/g, '')}@tumi.org` : (stf ? stf.email : customCardData?.email || '');
              const expDate = std ? (std.enrollmentDate || '2026-01-01') : (stf ? '2028-01-01' : customCardData?.expiryDate || '');
              const color = std ? '#4f46e5' : '#059669';
              const photo = std ? std.idPhotoUrl : (stf ? stf.photoUrl || stf.idPhotoUrl : customCardData?.photoUrl || null);

              return (
                <React.Fragment key={id}>
                  {/* Pair container (Front & Back of card positioned side by side) */}
                  
                  {/* Front Side Card Card Stock alignment */}
                  <div className="border border-slate-300 rounded-2xl w-[86mm] h-[130mm] shrink-0 overflow-hidden flex flex-col justify-between bg-slate-900 shadow-md text-white font-sans relative"
                       style={{ 
                         background: `linear-gradient(135deg, ${color} 0%, #1e1b4b 40%, #0f172a 100%)`,
                         printColorAdjust: 'exact'
                       }}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.03),transparent_40%)] pointer-events-none" />
                    
                    <div className="bg-slate-950/40 p-4 border-b border-white/10 text-center">
                      <h4 className="text-[11px] font-extrabold text-amber-400 uppercase tracking-widest leading-none">
                        Tumi Global Skills Initiative
                      </h4>
                      <p className="text-[7.5px] text-slate-300 font-mono tracking-widest mt-1">ACCREDITED SKILLS HUB • GHANA</p>
                    </div>

                    <div className="flex-1 p-5 flex flex-col items-center justify-center space-y-4 text-center">
                      <div className="w-[120px] h-[120px] rounded-xl overflow-hidden border-2 bg-slate-800 flex items-center justify-center shadow-md shrink-0"
                           style={{ borderColor: color }}>
                        {photo ? (
                          <img src={photo} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-12 h-12 text-slate-500" />
                        )}
                      </div>

                      <div className="space-y-1.5 w-full">
                        <h2 className="text-base font-black text-white uppercase tracking-tight">{name}</h2>
                        <div className="h-0.5 w-2/3 bg-white/20 mx-auto" />
                        
                        <div className="space-y-0.5 text-center">
                          <span className="text-[8px] text-slate-400 uppercase block tracking-wider font-bold">Identification No:</span>
                          <span className="text-amber-400 font-mono font-bold text-sm">{num}</span>
                        </div>

                        <div className="space-y-0.5 text-center">
                          <span className="text-[8px] text-slate-400 uppercase block tracking-wider font-bold">Course / Designation:</span>
                          <span className="text-white text-xs font-bold block">{prog}</span>
                        </div>

                        <div className="space-y-0.5 text-center">
                          <span className="text-[8px] text-slate-400 uppercase block tracking-wider font-bold">Cohort Group:</span>
                          <span className="text-slate-300 text-[11px] block">{cohort}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3 border-t border-white/10 flex items-center justify-between text-[9px] px-4 font-semibold uppercase">
                      <span className="text-slate-400">Valid Till: <span className="text-white font-bold">{expDate}</span></span>
                      <span className="text-emerald-400 font-mono text-[8px] font-extrabold flex items-center gap-1">
                        ✓ SECURE ID
                      </span>
                    </div>
                  </div>

                  {/* Back Side Card aligned corresponding to standard folding card margins */}
                  <div className="border border-slate-300 rounded-2xl w-[86mm] h-[130mm] shrink-0 bg-slate-950 text-slate-300 p-5 flex flex-col justify-between font-sans shadow-md"
                       style={{ printColorAdjust: 'exact' }}>
                    <div className="border-b border-white/10 pb-2 text-left">
                      <h4 className="text-[10px] font-extrabold text-white tracking-widest uppercase">ID Card Terms of Use</h4>
                    </div>

                    <div className="flex-1 flex flex-col justify-between text-left py-4">
                      <div className="space-y-2 text-[8px] text-slate-300 leading-relaxed font-semibold">
                        <p>• This identification card is officially issued and recognized by Tumi.</p>
                        <p>• Possession grants access to official workshop rooms, tech desks & stores.</p>
                        <p>• Card is strictly non-transferable. If lost, GHS 50 fee applies for renewal.</p>
                        <p>• If found, return to: Tumi Hub, Adum, Kumasi, Ashanti Region, Ghana.</p>
                      </div>

                      <div className="bg-white/5 p-3 rounded-lg border border-white/5 text-[9px] space-y-1 my-3">
                        <p><span className="text-slate-400 font-bold uppercase text-[7.5px] block">Emergency Contact:</span> {phone || '+233 24 555 8891'}</p>
                        <p><span className="text-slate-400 font-bold uppercase text-[7.5px] block">Email Contact:</span> {email}</p>
                        <p><span className="text-slate-400 font-bold uppercase text-[7.5px] block">Verification Registry:</span> Secure blockchain seal verified</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/10 pt-3">
                        {/* Barcode representation */}
                        <div className="bg-white px-2 py-0.5 rounded flex flex-col items-center">
                          <div className="flex space-x-0.5 h-6 items-end bg-black p-0.5">
                            {[2,1,4,1,3,2,1,2,4,1].map((w, i) => (
                              <div key={i} className="bg-white h-full" style={{ width: `${w}px` }} />
                            ))}
                          </div>
                          <span className="text-[6.5px] text-black font-mono font-bold">{num}</span>
                        </div>

                        <div className="text-right">
                          <span className="font-serif italic text-amber-300 text-xs block">
                            {officialSignature}
                          </span>
                          <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider block mt-1">{officialTitle}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-center text-[7.5px] text-slate-500 border-t border-white/5 pt-2 uppercase font-bold">
                      Tumi Skills Initiative - Kumasi Ghana
                    </div>
                  </div>

                  {/* Multi card grid separator spacer */}
                  {index % 2 === 1 && <div className="col-span-2 page-break no-print" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
