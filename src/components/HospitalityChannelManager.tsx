import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar, 
  RefreshCw, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Globe, 
  BedDouble, 
  DollarSign, 
  UserCheck, 
  ShieldCheck,
  Search,
  Filter,
  Check,
  ExternalLink,
  Wifi,
  Sparkles,
  Zap,
  Tag,
  FileText,
  Download,
  Upload,
  Code,
  Copy,
  FileSpreadsheet,
  AlertTriangle,
  Share2,
  Link,
  CalendarDays,
  QrCode,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  MessageSquare,
  Wrench,
  Layers,
  Receipt,
  CreditCard,
  Move,
  Mail,
  Send,
  Edit2,
  Coins,
  Camera,
  X,
  Grid,
  BarChart3
} from 'lucide-react';
import { Room, Booking, RoomCharge, ChannelConnection, ChannelSyncLog, UserProfile, ChannelName, RoomStatus, CheckoutInvoiceData, CustomerProfile } from '../types/erp';
import { dataStore } from '../config/firebase';
import { GuestAmenityRecommender } from './GuestAmenityRecommender';
import { buildCheckoutInvoiceData, downloadInvoicePdf } from '../utils/invoicePdfGenerator';
import HospitalityD3AnalyticsChart from './HospitalityD3AnalyticsChart';
import DataImportModule from './DataImportModule';
import ExternalAPIIntegrationsHub from './ExternalAPIIntegrationsHub';
import InHouseMessagingModule from './InHouseMessagingModule';
import EditRoomTagsModal from './EditRoomTagsModal';
import { currencyStore, RoomBookingRateConfig } from '../utils/currencyStore';

interface HospitalityChannelManagerProps {
  activeUser: UserProfile;
}

export default function HospitalityChannelManager({ activeUser }: HospitalityChannelManagerProps) {
  // State from dataStore
  const [rooms, setRooms] = useState<Room[]>(() => dataStore.getRooms());
  const [bookings, setBookings] = useState<Booking[]>(() => dataStore.getBookings());
  const [channels, setChannels] = useState<ChannelConnection[]>(() => dataStore.getChannelConnections());
  const [syncLogs, setSyncLogs] = useState<ChannelSyncLog[]>(() => dataStore.getChannelSyncLogs());

  // Currency States
  const [roomCurrencyConfig, setRoomCurrencyConfig] = useState<RoomBookingRateConfig>(() => currencyStore.getRoomConfig());
  const [rates, setRates] = useState(() => currencyStore.getRates());
  const [isEditingRoomRates, setIsEditingRoomRates] = useState(false);
  const [editedBookingComRate, setEditedBookingComRate] = useState('');
  const [editedBOGRate, setEditedBOGRate] = useState('');
  const [quickQuoteUSD, setQuickQuoteUSD] = useState('150');

  useEffect(() => {
    const handleRatesUpdate = () => {
      setRoomCurrencyConfig(currencyStore.getRoomConfig());
      setRates(currencyStore.getRates());
    };
    window.addEventListener('tumi_currency_rates_updated', handleRatesUpdate);
    return () => {
      window.removeEventListener('tumi_currency_rates_updated', handleRatesUpdate);
    };
  }, []);

  // Navigation Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState<'tape_chart' | 'rooms' | 'bookings' | 'analytics' | 'channels' | 'ical' | 'embed' | 'imports' | 'integrations' | 'messages' | 'logs'>('tape_chart');

  // Tape Chart Calendar Grid states
  const [tapeStartDate, setTapeStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [daysToShow, setDaysToShow] = useState<number>(30); // Full Month 30-Day Grid
  const [showPricingPerGuest, setShowPricingPerGuest] = useState<boolean>(true);
  const [showRestrictions, setShowRestrictions] = useState<boolean>(false);
  
  // Calendar Expansion & View Mode states
  const [isCalendarExpanded, setIsCalendarExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768; // Default expanded on desktops & larger screens
    }
    return true;
  });
  const [calendarViewMode, setCalendarViewMode] = useState<'tape_beds' | 'matrix'>('tape_beds');
  const [showCsvImportModal, setShowCsvImportModal] = useState<boolean>(false);
  
  // Custom rate, inventory & status overrides per room & date: key format `${roomId}_${dateStr}`
  const [tapeOverrides, setTapeOverrides] = useState<Record<string, { rate?: number; status?: 'Bookable' | 'Multiple blockers' | 'Closed' | 'Maintenance'; roomsToSell?: number }>>(() => {
    try {
      const saved = localStorage.getItem('tumi_tape_chart_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Cell Editor Modal state
  const [editingCell, setEditingCell] = useState<{
    roomId: string;
    roomNumber: string;
    roomName: string;
    dateStr: string;
    currentRate: number;
    currentStatus: string;
    currentRoomsToSell: number;
  } | null>(null);
  const [cellEditRate, setCellEditRate] = useState<string>('');
  const [cellEditStatus, setCellEditStatus] = useState<'Bookable' | 'Multiple blockers' | 'Closed' | 'Maintenance'>('Bookable');
  const [cellEditRoomsToSell, setCellEditRoomsToSell] = useState<string>('');
  const [cellApplyRange, setCellApplyRange] = useState<boolean>(false);
  const [cellRangeEndDate, setCellRangeEndDate] = useState<string>('');

  // Bulk Edit Modal state
  const [showBulkEditModal, setShowBulkEditModal] = useState<boolean>(false);
  const [bulkRoomId, setBulkRoomId] = useState<string>('ALL');
  const [bulkStartDate, setBulkStartDate] = useState<string>(tapeStartDate);
  const [bulkEndDate, setBulkEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [bulkRateInput, setBulkRateInput] = useState<string>('');
  const [bulkStatusInput, setBulkStatusInput] = useState<'Bookable' | 'Multiple blockers' | 'Closed' | 'Maintenance'>('Bookable');
  const [bulkRoomsToSellInput, setBulkRoomsToSellInput] = useState<string>('');

  const saveOverridesToStorage = (updated: Record<string, any>) => {
    setTapeOverrides(updated);
    try {
      localStorage.setItem('tumi_tape_chart_overrides', JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save tape overrides:", e);
    }
  };

  // Tape Chart Calculation Helpers
  const tapeDates = React.useMemo(() => {
    const dates: Array<{ dateStr: string; dayName: string; dayNum: number; monthName: string; yearNum: number; isToday: boolean; isWeekend: boolean }> = [];
    const base = new Date(tapeStartDate || Date.now());
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < daysToShow; i++) {
      const current = new Date(base);
      current.setDate(base.getDate() + i);
      const dateStr = current.toISOString().split('T')[0];
      const dayName = current.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = current.getDate();
      const monthName = current.toLocaleDateString('en-US', { month: 'short' });
      const yearNum = current.getFullYear();
      const dayOfWeek = current.getDay();

      dates.push({
        dateStr,
        dayName,
        dayNum,
        monthName,
        yearNum,
        isToday: dateStr === todayStr,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });
    }
    return dates;
  }, [tapeStartDate, daysToShow]);

  const monthGroups = React.useMemo(() => {
    const groups: Array<{ label: string; count: number }> = [];
    tapeDates.forEach(d => {
      const label = `${d.monthName} ${d.yearNum}`;
      if (groups.length > 0 && groups[groups.length - 1].label === label) {
        groups[groups.length - 1].count++;
      } else {
        groups.push({ label, count: 1 });
      }
    });
    return groups;
  }, [tapeDates]);

  const getBookingsForRoomAndDate = (roomId: string, dateStr: string) => {
    return bookings.filter(b => {
      if (b.roomId !== roomId && b.roomNumber !== rooms.find(r => r.id === roomId)?.number) return false;
      if (b.status === 'cancelled') return false;
      return dateStr >= b.checkInDate && dateStr < b.checkOutDate;
    });
  };

  const getTapeCellData = (room: Room, dateStr: string) => {
    const overrideKey = `${room.id}_${dateStr}`;
    const override = tapeOverrides[overrideKey] || {};
    const activeBookingsForDate = getBookingsForRoomAndDate(room.id, dateStr);
    const bookedCount = activeBookingsForDate.length;

    const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;
    let rate = override.rate;
    if (rate === undefined) {
      if (isWeekend && room.pricingTiers?.weekend) {
        rate = room.pricingTiers.weekend;
      } else {
        rate = room.nightlyRate || 45;
      }
    }

    let status: 'Bookable' | 'Multiple blockers' | 'Closed' | 'Maintenance' = override.status || 'Bookable';
    if (bookedCount > 0 && status === 'Bookable') {
      status = 'Multiple blockers';
    }

    const defaultCapacity = room.capacity || 1;
    const roomsToSell = override.roomsToSell !== undefined ? override.roomsToSell : Math.max(0, defaultCapacity - bookedCount);

    return {
      rate,
      status,
      roomsToSell,
      bookedCount,
      activeBookingsForDate
    };
  };

  const handleSaveCellEdit = () => {
    if (!editingCell) return;

    const key = `${editingCell.roomId}_${editingCell.dateStr}`;
    const newRate = cellEditRate.trim() ? parseFloat(cellEditRate) : undefined;
    const newRoomsToSell = cellEditRoomsToSell.trim() ? parseInt(cellEditRoomsToSell, 10) : undefined;

    const updated = { ...tapeOverrides };

    if (cellApplyRange && cellRangeEndDate) {
      const curr = new Date(editingCell.dateStr);
      const end = new Date(cellRangeEndDate);
      while (curr <= end) {
        const dStr = curr.toISOString().split('T')[0];
        const rangeKey = `${editingCell.roomId}_${dStr}`;
        updated[rangeKey] = {
          rate: newRate,
          status: cellEditStatus,
          roomsToSell: newRoomsToSell
        };
        curr.setDate(curr.getDate() + 1);
      }
    } else {
      updated[key] = {
        rate: newRate,
        status: cellEditStatus,
        roomsToSell: newRoomsToSell
      };
    }

    saveOverridesToStorage(updated);
    setEditingCell(null);
    setSyncToast(`Rate & Availability updated for Room #${editingCell.roomNumber}!`);
    setTimeout(() => setSyncToast(null), 4000);
  };

  const handleApplyBulkEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkStartDate || !bulkEndDate) {
      alert("Please specify valid start and end dates.");
      return;
    }

    const updated = { ...tapeOverrides };
    const targetRooms = bulkRoomId === 'ALL' ? rooms : rooms.filter(r => r.id === bulkRoomId);
    const parsedRate = bulkRateInput.trim() ? parseFloat(bulkRateInput) : undefined;
    const parsedRoomsToSell = bulkRoomsToSellInput.trim() ? parseInt(bulkRoomsToSellInput, 10) : undefined;

    targetRooms.forEach(room => {
      const curr = new Date(bulkStartDate);
      const end = new Date(bulkEndDate);
      while (curr <= end) {
        const dStr = curr.toISOString().split('T')[0];
        const key = `${room.id}_${dStr}`;
        updated[key] = {
          ...(updated[key] || {}),
          status: bulkStatusInput,
          ...(parsedRate !== undefined ? { rate: parsedRate } : {}),
          ...(parsedRoomsToSell !== undefined ? { roomsToSell: parsedRoomsToSell } : {})
        };
        curr.setDate(curr.getDate() + 1);
      }
    });

    saveOverridesToStorage(updated);
    setShowBulkEditModal(false);
    setSyncToast(`Bulk Rates & Availability updated across ${targetRooms.length} room(s)!`);
    setTimeout(() => setSyncToast(null), 4000);
  };

  const handleExportCalendarCSV = () => {
    const headers = ['Date', 'Day', 'Room Name', 'Room ID', 'Unit/Bed', 'Status', 'Rooms/Beds Available', 'Net Booked', 'Occupancy Rate %', 'Nightly Rate (USD)', 'Active Bookings'];
    const rows: string[] = [];

    rooms.forEach(room => {
      tapeDates.forEach(d => {
        const cellData = getTapeCellData(room, d.dateStr);
        const occupancyPct = Math.round((cellData.bookedCount / Math.max(1, room.capacity)) * 100);
        const guestList = cellData.activeBookingsForDate.map(b => `${b.guestName} (${b.sourceChannel} - ${b.status})`).join('; ');

        rows.push([
          d.dateStr,
          d.dayName,
          `"${room.name.replace(/"/g, '""')}"`,
          room.id,
          `Room #${room.number}`,
          cellData.status,
          cellData.roomsToSell,
          cellData.bookedCount,
          `${occupancyPct}%`,
          cellData.rate,
          `"${guestList.replace(/"/g, '""')}"`
        ].join(','));
      });
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Tumi_Hostel_Calendar_Export_${tapeDates[0]?.dateStr}_to_${tapeDates[tapeDates.length - 1]?.dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSyncToast('Calendar report exported to CSV successfully!');
    setTimeout(() => setSyncToast(null), 4000);
  };

  // Filter & Search states
  const [roomFilterStatus, setRoomFilterStatus] = useState<string>('ALL');
  const [bookingFilterChannel, setBookingFilterChannel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Expandable Room Card state
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);

  // Syncing state
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // iCal & Tool states
  const [pastedIcalText, setPastedIcalText] = useState('');
  const [importedIcalChannel, setImportedIcalChannel] = useState<ChannelName>('Airbnb');
  const [selectedRoomForIcal, setSelectedRoomForIcal] = useState<string>(rooms[0]?.id || 'ALL');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // CSV Import state
  const [pastedCsv, setPastedCsv] = useState('');

  // Edit Room Tags & Category Modal state
  const [editTagsModalOpen, setEditTagsModalOpen] = useState(false);
  const [roomForTagsModal, setRoomForTagsModal] = useState<Room | null>(null);
  const [tagsModalInitialMode, setTagsModalInitialMode] = useState<'single' | 'global'>('single');

  // New Room Modal state
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<Room['type']>('Deluxe Room');
  const [newRoomRate, setNewRoomRate] = useState<number>(150);
  const [newRoomCapacity, setNewRoomCapacity] = useState<number>(2);
  const [newRoomFloor, setNewRoomFloor] = useState('2nd Floor');
  const [newRoomAmenities, setNewRoomAmenities] = useState('King Bed, Wi-Fi, Air Conditioning, TV');

  // New Booking Modal state
  const [showAddBookingModal, setShowAddBookingModal] = useState(false);
  const [bookRoomId, setBookRoomId] = useState(rooms[0]?.id || '');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [checkIn, setCheckIn] = useState(new Date().toISOString().split('T')[0]);
  const [checkOut, setCheckOut] = useState(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [channelSource, setChannelSource] = useState<ChannelName>('Direct Website');
  const [specialReq, setSpecialReq] = useState('');
  const [bookingBillingType, setBookingBillingType] = useState<'pay_now_pos' | 'online_receipt' | 'bill_to_individual'>('pay_now_pos');
  const [bookingOnlineReceiptNumber, setBookingOnlineReceiptNumber] = useState('');

  // Hostel Walk-In Guest & ID Parsing state
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInRoomId, setWalkInRoomId] = useState(rooms[0]?.id || '');
  const [walkInGuestName, setWalkInGuestName] = useState('');
  const [walkInGuestEmail, setWalkInGuestEmail] = useState('');
  const [walkInGuestPhone, setWalkInGuestPhone] = useState('');
  const [walkInGuestAddress, setWalkInGuestAddress] = useState('');
  const [walkInGuestIdType, setWalkInGuestIdType] = useState<'Passport' | 'National ID' | 'Drivers License' | 'Residency Card'>('National ID');
  const [walkInGuestIdNumber, setWalkInGuestIdNumber] = useState('');
  const [walkInGuestIdImage, setWalkInGuestIdImage] = useState<string | null>(null);
  const [isParsingIdImage, setIsParsingIdImage] = useState(false);
  const [idParsedSuccess, setIdParsedSuccess] = useState(false);
  const [walkInCheckIn, setWalkInCheckIn] = useState(new Date().toISOString().split('T')[0]);
  const [walkInCheckOut, setWalkInCheckOut] = useState(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [walkInGuestsCount, setWalkInGuestsCount] = useState(1);
  const [walkInDeposit, setWalkInDeposit] = useState('150');
  const [walkInBillingType, setWalkInBillingType] = useState<'pay_now_pos' | 'online_receipt' | 'bill_to_individual'>('pay_now_pos');
  const [walkInOnlineReceiptNumber, setWalkInOnlineReceiptNumber] = useState('');

  // Extend Stay / Prolong Reservation state
  const [showExtendStayModal, setShowExtendStayModal] = useState(false);
  const [extendingBooking, setExtendingBooking] = useState<Booking | null>(null);
  const [extendNewCheckOutDate, setExtendNewCheckOutDate] = useState('');
  const [extendBillingType, setExtendBillingType] = useState<'pay_now_pos' | 'online_receipt' | 'bill_to_individual'>('pay_now_pos');
  const [extendOnlineReceiptNumber, setExtendOnlineReceiptNumber] = useState('');

  // POS Checkout Payment state
  const [showPosCheckoutModal, setShowPosCheckoutModal] = useState(false);
  const [posCheckoutBooking, setPosCheckoutBooking] = useState<Booking | null>(null);
  const [posPaymentMethod, setPosPaymentMethod] = useState<'cash' | 'card' | 'momo' | 'apple_pay' | 'split'>('cash');
  const [posMomoPhone, setPosMomoPhone] = useState('');
  const [isProcessingPosPayment, setIsProcessingPosPayment] = useState(false);

  // Drag-and-Drop Unassigned Bookings state
  const [draggedBookingId, setDraggedBookingId] = useState<string | null>(null);
  const [dragOverRoomId, setDragOverRoomId] = useState<string | null>(null);

  // Room Folio & Incidental Billing state
  const [selectedFolioBooking, setSelectedFolioBooking] = useState<Booking | null>(null);
  const [newChargeCategory, setNewChargeCategory] = useState<RoomCharge['category']>('Minibar');
  const [newChargeDescription, setNewChargeDescription] = useState('');
  const [newChargeAmount, setNewChargeAmount] = useState('');

  // Automated Checkout Cleaning/Maintenance notice banner
  const [checkoutNotice, setCheckoutNotice] = useState<{ ticketId: string; roomNumber: string; guestName: string } | null>(null);

  // Automated Checkout Invoice & Email Dispatch Modal state
  const [completedCheckoutInvoice, setCompletedCheckoutInvoice] = useState<{
    invoice: CheckoutInvoiceData;
    booking: Booking;
    cleaningTaskId: string;
    emailSent: boolean;
    deliveryTimestamp: string;
  } | null>(null);

  // Google / Outlook Calendar 2-Way Sync state
  const [isSimulatingCalendarSync, setIsSimulatingCalendarSync] = useState(false);
  const [calendarAutoBlockEnabled, setCalendarAutoBlockEnabled] = useState(true);

  // User Custom External iCal Feeds Integration
  const [externalIcalFeeds, setExternalIcalFeeds] = useState<{ id: string; roomId: string; roomNumber: string; channelName: string; url: string; lastSynced: string }[]>(() => {
    const saved = localStorage.getItem('tumi_external_ical_feeds');
    return saved ? JSON.parse(saved) : [
      { id: '1', roomId: rooms[0]?.id || 'room_1', roomNumber: rooms[0]?.number || '101', channelName: 'Airbnb', url: 'https://www.airbnb.com/calendar/ical/101.ics', lastSynced: new Date().toLocaleString() },
      { id: '2', roomId: rooms[1]?.id || 'room_2', roomNumber: rooms[1]?.number || '102', channelName: 'Booking.com', url: 'https://admin.booking.com/ical/102.ics', lastSynced: new Date().toLocaleString() }
    ];
  });

  const [newExtIcalUrl, setNewExtIcalUrl] = useState('');
  const [newExtIcalChannel, setNewExtIcalChannel] = useState<ChannelName>('Airbnb');
  const [newExtIcalRoomId, setNewExtIcalRoomId] = useState(rooms[0]?.id || 'ALL');
  const [syncingFeedId, setSyncingFeedId] = useState<string | null>(null);

  const handleAddExternalIcal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExtIcalUrl.trim()) return;

    const matchedRoom = rooms.find(r => r.id === newExtIcalRoomId);
    const roomNum = matchedRoom ? matchedRoom.number : 'All Rooms';

    const newFeed = {
      id: 'ext_' + Date.now(),
      roomId: newExtIcalRoomId,
      roomNumber: roomNum,
      channelName: newExtIcalChannel,
      url: newExtIcalUrl.trim(),
      lastSynced: 'Never'
    };

    const updated = [...externalIcalFeeds, newFeed];
    setExternalIcalFeeds(updated);
    localStorage.setItem('tumi_external_ical_feeds', JSON.stringify(updated));
    setNewExtIcalUrl('');
    
    // Add sync log
    const now = new Date().toISOString();
    dataStore.addChannelSyncLog({
      id: 'log_' + Date.now(),
      timestamp: now,
      channel: newExtIcalChannel,
      direction: 'import',
      status: 'success',
      recordsProcessed: 0,
      details: `Registered custom external iCal address for Room ${roomNum}: ${newExtIcalUrl}`
    } as any);
    setSyncLogs(dataStore.getChannelSyncLogs());

    setSyncToast(`Successfully registered ${newExtIcalChannel} iCal address for Room ${roomNum}!`);
    setTimeout(() => setSyncToast(null), 4000);
  };

  const handleSyncExternalFeed = (feedId: string) => {
    setSyncingFeedId(feedId);
    
    setTimeout(() => {
      const updated = externalIcalFeeds.map(f => {
        if (f.id === feedId) {
          const nowStr = new Date().toLocaleString();
          
          // Generate an elegant simulated synced booking
          const bookingCheckIn = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const bookingCheckOut = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          
          const newSimulatedBooking: Booking = {
            id: 'sync_' + Date.now(),
            roomId: f.roomId,
            roomNumber: f.roomNumber,
            guestName: `iCal Synced Guest (${f.channelName})`,
            guestEmail: `sync-${f.id}@ical-pms.net`,
            guestPhone: '+233 00 0000000',
            checkInDate: bookingCheckIn,
            checkOutDate: bookingCheckOut,
            guestsCount: 2,
            status: 'confirmed',
            paymentStatus: 'paid',
            sourceChannel: f.channelName as ChannelName,
            totalPrice: 450,
            roomCharges: [],
            createdAt: new Date().toISOString()
          };
          
          const exists = bookings.some(b => b.guestName.includes(`(${f.channelName})`) && b.roomId === f.roomId);
          if (!exists) {
            dataStore.addBooking(newSimulatedBooking);
            setBookings(dataStore.getBookings());
          }

          // Log sync details
          dataStore.addChannelSyncLog({
            id: 'log_' + Date.now(),
            timestamp: new Date().toISOString(),
            channel: f.channelName as ChannelName,
            direction: 'import',
            status: 'success',
            recordsProcessed: 1,
            details: `Pushed events and pulled booking updates from custom iCal url: ${f.url}`
          } as any);
          setSyncLogs(dataStore.getChannelSyncLogs());

          return { ...f, lastSynced: nowStr };
        }
        return f;
      });

      setExternalIcalFeeds(updated);
      localStorage.setItem('tumi_external_ical_feeds', JSON.stringify(updated));
      setSyncingFeedId(null);
      setSyncToast(`Sync Complete! Successfully connected and parsed live reservations from your external iCal feed.`);
      setTimeout(() => setSyncToast(null), 4000);
    }, 1200);
  };

  const handleDeleteExternalFeed = (feedId: string) => {
    const filtered = externalIcalFeeds.filter(f => f.id !== feedId);
    setExternalIcalFeeds(filtered);
    localStorage.setItem('tumi_external_ical_feeds', JSON.stringify(filtered));
    setSyncToast(`Unlinked external iCal address.`);
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Trigger Instant Channel Sync
  const handleSyncAllChannels = () => {
    setIsSyncingAll(true);
    setSyncToast('Initiating two-way calendar & rate sync with Airbnb, Booking.com, Hostelworld & Website API...');

    setTimeout(() => {
      const now = new Date().toISOString();
      // Update channel sync timestamps
      const updatedChannels = channels.map(c => ({
        ...c,
        lastSyncedAt: now,
        status: 'connected' as const
      }));
      setChannels(updatedChannels);
      dataStore.saveChannelConnections(updatedChannels);

      // Log sync events
      const log1 = dataStore.addChannelSyncLog({
        channelName: 'Airbnb API & iCal',
        event: 'Availability Calendar Push',
        status: 'success',
        timestamp: now,
        details: `Successfully exported availability for ${rooms.length} room units across September dates.`
      });

      const log2 = dataStore.addChannelSyncLog({
        channelName: 'Booking.com Extranet',
        event: 'Rate & Inventory Exchange',
        status: 'success',
        timestamp: now,
        details: 'Updated nightly pricing tiers & instant reservation blocks.'
      });

      setSyncLogs(dataStore.getChannelSyncLogs());
      setIsSyncingAll(false);
      setSyncToast('Channel Sync Complete! All 4 OTAs & Website synced successfully.');
      setTimeout(() => setSyncToast(null), 4000);
    }, 1500);
  };

  // Housekeeping room status toggle
  const handleStatusChange = (roomId: string, newStatus: RoomStatus) => {
    dataStore.updateRoomStatus(roomId, newStatus);
    const updated = dataStore.getRooms();
    setRooms(updated);
    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'UPDATE',
      `room_${roomId}`,
      `Changed room status to ${newStatus}`
    );
  };

  // Add Room submit
  const handleAddRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amenitiesArr = newRoomAmenities.split(',').map(a => a.trim()).filter(Boolean);
    const newRoom: Room = {
      id: 'room_' + Date.now(),
      number: newRoomNumber,
      name: newRoomName,
      type: newRoomType,
      status: 'Clean',
      nightlyRate: Number(newRoomRate),
      capacity: Number(newRoomCapacity),
      floor: newRoomFloor,
      amenities: amenitiesArr
    };
    dataStore.addRoom(newRoom);
    setRooms(dataStore.getRooms());
    setShowAddRoomModal(false);
    // Reset form
    setNewRoomNumber('');
    setNewRoomName('');
  };

  // Add Booking submit
  const handleAddBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedRoom = rooms.find(r => r.id === bookRoomId) || rooms[0];
    
    // Calculate nights
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const nights = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)));
    const totalPrice = nights * (selectedRoom?.nightlyRate || 100);

    // Calculate payment status & billing attributes based on selected method
    let computedPaymentStatus: Booking['paymentStatus'] = 'paid';
    let computedAmountPaid = totalPrice;

    if (bookingBillingType === 'bill_to_individual') {
      computedPaymentStatus = 'unpaid';
      computedAmountPaid = 0;
    } else if (bookingBillingType === 'pay_now_pos') {
      computedPaymentStatus = 'pending';
      computedAmountPaid = 0;
    }

    const newBooking: Booking = {
      id: 'book_' + Date.now(),
      roomId: selectedRoom.id,
      roomNumber: selectedRoom.number,
      guestName,
      guestEmail,
      guestPhone,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guestsCount: selectedRoom.capacity,
      totalPrice,
      sourceChannel: channelSource,
      status: 'confirmed',
      paymentStatus: computedPaymentStatus,
      billingType: bookingBillingType,
      amountPaid: computedAmountPaid,
      onlineReceiptNumber: bookingBillingType === 'online_receipt' ? (bookingOnlineReceiptNumber.trim() || `ONL-REC-${Date.now().toString().slice(-6)}`) : undefined,
      specialRequests: specialReq,
      createdAt: new Date().toISOString()
    };

    dataStore.addBooking(newBooking);

    // If "Bill to Individual", automatically log an initial uncollected room charge in guest folio
    if (bookingBillingType === 'bill_to_individual') {
      dataStore.addRoomCharge(newBooking.id, {
        category: 'Incidental',
        description: `Room Accommodation Stay (${nights} nights @ $${selectedRoom.nightlyRate}/night) - Bill to Individual (Pay at Checkout)`,
        amount: totalPrice,
        billedBy: activeUser.name
      }, activeUser.name);
    }

    // Automatically synchronize/upsert the guest profile into CRM database
    try {
      dataStore.upsertCustomerFromGuest({
        name: guestName.trim(),
        email: guestEmail.trim() || `walkin_${Date.now()}@traveler.com`,
        phone: guestPhone.trim() || '+1 (555) 000-0000',
        totalSpend: totalPrice,
        source: `Lodging (${channelSource})`,
        stayDate: checkIn,
        roomNumber: selectedRoom.number,
        notes: specialReq.trim() || undefined,
        tag: channelSource === 'Walk-In POS' ? 'walk-in' : 'guest',
        buyingHabits: [],
        demands: specialReq.trim() ? [specialReq.trim()] : []
      });
    } catch (crmErr) {
      console.warn("Could not sync guest reservation to CRM:", crmErr);
    }

    setBookings(dataStore.getBookings());
    setRooms(dataStore.getRooms()); // status may have updated
    setShowAddBookingModal(false);

    // If POS payment chosen, immediately launch POS Checkout Payment modal
    if (bookingBillingType === 'pay_now_pos') {
      setPosCheckoutBooking(newBooking);
      setShowPosCheckoutModal(true);
    }

    // Reset inputs
    setGuestName('');
    setGuestEmail('');
    setGuestPhone('');
    setSpecialReq('');
    setBookingOnlineReceiptNumber('');
    setBookingBillingType('pay_now_pos');

    // Auto log audit
    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'CREATE',
      `booking_${newBooking.id}`,
      `Created booking for ${guestName} via ${channelSource} (${bookingBillingType})`
    );
  };

  // Extend Stay / Prolong Reservation submit
  const handleConfirmExtendStay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendingBooking || !extendNewCheckOutDate) return;

    const selectedRoom = rooms.find(r => r.id === extendingBooking.roomId || r.number === extendingBooking.roomNumber) || rooms[0];
    
    const d1 = new Date(extendingBooking.checkOutDate);
    const d2 = new Date(extendNewCheckOutDate);
    if (d2 <= d1) {
      alert("New check-out date must be after the current check-out date.");
      return;
    }

    const additionalNights = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)));
    const additionalAmount = Number((additionalNights * (selectedRoom?.nightlyRate || 100)).toFixed(2));
    const newTotalPrice = Number((extendingBooking.totalPrice + additionalAmount).toFixed(2));

    const extensionRecord = {
      extendedAt: new Date().toISOString(),
      previousCheckOutDate: extendingBooking.checkOutDate,
      newCheckOutDate: extendNewCheckOutDate,
      additionalNights,
      additionalAmount,
      paymentMode: extendBillingType,
      onlineReceiptNumber: extendBillingType === 'online_receipt' ? (extendOnlineReceiptNumber.trim() || `EXT-REC-${Date.now().toString().slice(-6)}`) : undefined
    };

    let updatedPaymentStatus = extendingBooking.paymentStatus;
    let updatedAmountPaid = extendingBooking.amountPaid || (extendingBooking.paymentStatus === 'paid' ? extendingBooking.totalPrice : 0);

    if (extendBillingType === 'online_receipt') {
      updatedAmountPaid += additionalAmount;
      updatedPaymentStatus = 'paid';
    } else if (extendBillingType === 'bill_to_individual') {
      if (updatedPaymentStatus === 'paid') updatedPaymentStatus = 'partially_paid';
      // Automatically post a folio charge for the extension
      dataStore.addRoomCharge(extendingBooking.id, {
        category: 'Room Stay Extension',
        description: `Extended stay by +${additionalNights} night(s) to ${extendNewCheckOutDate} - Bill to Individual`,
        amount: additionalAmount,
        billedBy: activeUser.name
      }, activeUser.name);
    }

    const updatedBooking: Booking = {
      ...extendingBooking,
      checkOutDate: extendNewCheckOutDate,
      totalPrice: newTotalPrice,
      amountPaid: updatedAmountPaid,
      paymentStatus: updatedPaymentStatus,
      onlineReceiptNumber: extendBillingType === 'online_receipt' ? extensionRecord.onlineReceiptNumber : extendingBooking.onlineReceiptNumber,
      extendedStayHistory: [...(extendingBooking.extendedStayHistory || []), extensionRecord]
    };

    // Save updated booking
    const currentBookings = dataStore.getBookings();
    const updatedBookings = currentBookings.map(b => b.id === extendingBooking.id ? updatedBooking : b);
    dataStore.saveBookings(updatedBookings);
    setBookings(updatedBookings);

    // If folio view was open for this booking, update selectedFolioBooking
    if (selectedFolioBooking?.id === extendingBooking.id) {
      setSelectedFolioBooking(updatedBooking);
    }

    setShowExtendStayModal(false);

    // If "Pay Now via POS", trigger POS Payment Checkout Modal immediately
    if (extendBillingType === 'pay_now_pos') {
      setPosCheckoutBooking({
        ...updatedBooking,
        totalPrice: additionalAmount,
        roomCharges: []
      });
      setShowPosCheckoutModal(true);
    }

    // Reset states
    setExtendingBooking(null);
    setExtendNewCheckOutDate('');
    setExtendOnlineReceiptNumber('');
    setExtendBillingType('pay_now_pos');

    // Audit log
    dataStore.logAudit(
      activeUser.uid,
      activeUser.name,
      activeUser.role,
      'UPDATE',
      `booking_${updatedBooking.id}`,
      `Extended stay for ${updatedBooking.guestName} by +${additionalNights} nights to ${extendNewCheckOutDate} (+$${additionalAmount}, Mode: ${extendBillingType})`
    );

    setSyncToast(`Extended stay for ${updatedBooking.guestName} to ${extendNewCheckOutDate} (+${additionalNights} nights, +$${additionalAmount})!`);
    setTimeout(() => setSyncToast(null), 5000);
  };

  // Check-In / Check-Out Actions with Automated Housekeeping Ticket Trigger & Email PDF Invoice
  const handleBookingStatusToggle = async (booking: Booking, nextStatus: Booking['status']) => {
    if (nextStatus === 'checked_out') {
      // 1. Resolve room and CRM profile
      const room = rooms.find(r => r.id === booking.roomId || r.number === booking.roomNumber);
      const crmCustomer = dataStore.findOrCreateCustomerForGuest(booking);
      
      // 2. Build official checkout invoice data
      const invoiceData = buildCheckoutInvoiceData(
        booking,
        room,
        crmCustomer,
        activeUser.name,
        'Settled at Front Desk'
      );

      // 3. Complete checkout, create Housekeeping ticket & trigger automated email dispatch service
      const result = await dataStore.completeBookingCheckoutAndInvoice(
        booking,
        activeUser,
        invoiceData,
        'Standard checkout turnover',
        true
      );

      setBookings(dataStore.getBookings());
      setRooms(dataStore.getRooms());
      
      setCheckoutNotice({
        ticketId: result.automationResult.cleaningTask.id,
        roomNumber: booking.roomNumber,
        guestName: booking.guestName
      });

      setCompletedCheckoutInvoice({
        invoice: invoiceData,
        booking,
        cleaningTaskId: result.automationResult.cleaningTask.id,
        emailSent: true,
        deliveryTimestamp: new Date().toLocaleTimeString()
      });

      setSyncToast(`Checked out ${booking.guestName}! Official PDF Invoice #${invoiceData.invoiceNumber} ($${invoiceData.grandTotal.toFixed(2)}) auto-emailed to ${invoiceData.dispatchedToEmail}. Cleaning Ticket #${result.automationResult.cleaningTask.id} created.`);
      setTimeout(() => {
        setSyncToast(null);
      }, 7000);
      return;
    }

    const current = dataStore.getBookings();
    const updated = current.map(b => b.id === booking.id ? { ...b, status: nextStatus } : b);
    dataStore.saveBookings(updated);
    setBookings(updated);

    if (nextStatus === 'checked_in') {
      dataStore.updateRoomStatus(booking.roomId, 'Occupied');
    }
    setRooms(dataStore.getRooms());
  };

  // Drag-and-Drop Reservation Auto-Assignment
  const handleAssignBooking = (bookingId: string, roomId: string) => {
    const updatedBooking = dataStore.assignBookingToRoom(bookingId, roomId, activeUser);
    if (updatedBooking) {
      setBookings(dataStore.getBookings());
      setRooms(dataStore.getRooms());
      setSyncToast(`Assigned reservation for "${updatedBooking.guestName}" to Room #${updatedBooking.roomNumber}!`);
      setTimeout(() => setSyncToast(null), 5000);
    }
  };

  // Walk-In Guest Check-In & AI ID Document Parser
  const handleParseWalkInGuestIdImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingIdImage(true);
    setIdParsedSuccess(false);

    const reader = new FileReader();
    reader.onload = () => {
      const imgDataUrl = reader.result as string;
      setWalkInGuestIdImage(imgDataUrl);

      // Simulate AI Document OCR Extraction (or use server endpoint if available)
      setTimeout(() => {
        const sampleGuestNames = ['Alexander Vance', 'Kwame Mensah', 'Elena Rostova', 'Chioma Adebayo', 'David Stern'];
        const sampleIdNumbers = ['GHA-90182412-A', 'PAS-772910482', 'DL-GH-8819241', 'RES-44810294'];
        const sampleAddresses = ['45 Palm Ridge Avenue, Accra, Ghana', '12 Independence Square, Osu, Accra', '78 East Legon Highway, Accra', '102 Airport Residential Area, Accra'];
        const samplePhones = ['+233 24 881 9021', '+233 55 492 1102', '+233 20 119 4820', '+233 27 662 0192'];

        const randomName = sampleGuestNames[Math.floor(Math.random() * sampleGuestNames.length)];
        const randomIdNum = sampleIdNumbers[Math.floor(Math.random() * sampleIdNumbers.length)];
        const randomAddr = sampleAddresses[Math.floor(Math.random() * sampleAddresses.length)];
        const randomPhone = samplePhones[Math.floor(Math.random() * samplePhones.length)];

        setWalkInGuestName(randomName);
        setWalkInGuestIdNumber(randomIdNum);
        setWalkInGuestAddress(randomAddr);
        setWalkInGuestPhone(randomPhone);
        if (!walkInGuestEmail) setWalkInGuestEmail(`${randomName.toLowerCase().replace(/[^a-z]/g, '')}@guest.hostel.org`);

        setIsParsingIdImage(false);
        setIdParsedSuccess(true);
        setSyncToast(`ID Image parsed successfully! Extracted Guest: "${randomName}", ID #${randomIdNum}. Saved into database.`);
        setTimeout(() => setSyncToast(null), 5000);
      }, 1500);
    };
    reader.readAsDataURL(file);
  };

  const handleCompleteWalkInCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInGuestName.trim() || !walkInRoomId) {
      alert('Please enter guest name and select a room/bed.');
      return;
    }

    const selectedRoom = rooms.find(r => r.id === walkInRoomId) || rooms[0];
    const nights = Math.max(1, Math.ceil((new Date(walkInCheckOut).getTime() - new Date(walkInCheckIn).getTime()) / (1000 * 3600 * 24)));
    const calculatedRoomPrice = selectedRoom.nightlyRate * nights;

    let walkInPaymentStatus: Booking['paymentStatus'] = 'paid';
    let walkInAmountPaid = calculatedRoomPrice;

    if (walkInBillingType === 'bill_to_individual') {
      walkInPaymentStatus = 'unpaid';
      walkInAmountPaid = 0;
    } else if (walkInBillingType === 'pay_now_pos') {
      walkInPaymentStatus = 'pending';
      walkInAmountPaid = 0;
    }

    const newBooking: Booking = {
      id: 'walkin_' + Date.now().toString().slice(-6),
      roomId: selectedRoom.id,
      roomNumber: selectedRoom.number,
      guestName: walkInGuestName.trim(),
      guestEmail: walkInGuestEmail.trim() || `${walkInGuestName.toLowerCase().replace(/[^a-z]/g, '')}@hostel.org`,
      guestPhone: walkInGuestPhone.trim() || '+233 24 000 0000',
      guestAddress: walkInGuestAddress.trim(),
      guestIdType: walkInGuestIdType,
      guestIdNumber: walkInGuestIdNumber.trim(),
      guestIdImage: walkInGuestIdImage || undefined,
      guestParsedFromImage: idParsedSuccess,
      checkInDate: walkInCheckIn,
      checkOutDate: walkInCheckOut,
      guestsCount: walkInGuestsCount,
      totalPrice: calculatedRoomPrice,
      sourceChannel: 'Walk-In Hostel Front Desk',
      status: 'checked_in',
      paymentStatus: walkInPaymentStatus,
      billingType: walkInBillingType,
      amountPaid: walkInAmountPaid,
      onlineReceiptNumber: walkInBillingType === 'online_receipt' ? (walkInOnlineReceiptNumber.trim() || `WALKIN-ONL-${Date.now().toString().slice(-6)}`) : undefined,
      specialRequests: 'Walk-in Hostel Guest Check-in with ID verification',
      createdAt: new Date().toISOString(),
      roomCharges: []
    };

    dataStore.saveBookings([newBooking, ...dataStore.getBookings()]);

    // If Bill to Individual, add initial room charge to guest folio
    if (walkInBillingType === 'bill_to_individual') {
      dataStore.addRoomCharge(newBooking.id, {
        category: 'Incidental',
        description: `Walk-In Room Accommodation Stay (${nights} nights @ $${selectedRoom.nightlyRate}/night) - Bill to Individual`,
        amount: calculatedRoomPrice,
        billedBy: activeUser.name
      }, activeUser.name);
    }

    // Update room status to Occupied
    dataStore.saveRooms(dataStore.getRooms().map(r => r.id === selectedRoom.id ? { ...r, status: 'Occupied' } : r));

    // Create or update CRM Customer profile
    const existingCustomers = dataStore.getCustomers();
    const newCustomer: CustomerProfile = {
      id: 'cust_walkin_' + Date.now(),
      name: walkInGuestName.trim(),
      email: newBooking.guestEmail,
      phone: newBooking.guestPhone,
      lifetime_value: calculatedRoomPrice,
      ai_churn_risk: 0.05,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tag: 'walk-in'
    };

    if (!existingCustomers.some(c => c.email === newBooking.guestEmail)) {
      dataStore.saveCustomers([newCustomer, ...existingCustomers]);
    }

    setBookings(dataStore.getBookings());
    setRooms(dataStore.getRooms());
    setShowWalkInModal(false);

    // If POS payment selected, immediately launch POS Checkout payment modal
    if (walkInBillingType === 'pay_now_pos') {
      setPosCheckoutBooking(newBooking);
      setShowPosCheckoutModal(true);
    }

    // Reset Form
    setWalkInGuestName('');
    setWalkInGuestEmail('');
    setWalkInGuestPhone('');
    setWalkInGuestAddress('');
    setWalkInGuestIdNumber('');
    setWalkInGuestIdImage(null);
    setIdParsedSuccess(false);
    setWalkInOnlineReceiptNumber('');
    setWalkInBillingType('pay_now_pos');

    setSyncToast(`Walk-In Guest "${newBooking.guestName}" checked in into Room #${newBooking.roomNumber}! Room status set to Occupied.`);
    setTimeout(() => setSyncToast(null), 5000);
  };

  // Execute POS Checkout & Payment Total Calculation
  const handleExecutePosCheckout = () => {
    if (!posCheckoutBooking) return;

    setIsProcessingPosPayment(true);

    const roomChargesTotal = posCheckoutBooking.roomCharges?.reduce((sum, c) => sum + c.amount, 0) || 0;
    const accommodationCost = posCheckoutBooking.totalPrice || 0;
    const grandTotal = Number((accommodationCost + roomChargesTotal).toFixed(2));

    setTimeout(() => {
      // 1. Create itemized POS Order
      const posOrderId = 'POS-CHECKOUT-' + Date.now().toString().slice(-6);
      const posOrder = {
        id: posOrderId,
        items: [
          {
            id: 'item_room_stay',
            productId: `ROOM-${posCheckoutBooking.roomNumber}`,
            name: `Room #${posCheckoutBooking.roomNumber} Accommodation Stay (${posCheckoutBooking.checkInDate} to ${posCheckoutBooking.checkOutDate})`,
            price: accommodationCost,
            quantity: 1
          },
          ...(posCheckoutBooking.roomCharges || []).map(c => ({
            id: 'item_' + c.id,
            productId: `FOLIO-${c.category.substring(0, 3).toUpperCase()}`,
            name: `Folio Incidentals: ${c.category} - ${c.description}`,
            price: c.amount,
            quantity: 1
          }))
        ],
        totalAmount: grandTotal,
        cashierId: activeUser.uid,
        cashierName: activeUser.name,
        status: 'completed' as const,
        offline: false,
        customerName: posCheckoutBooking.guestName,
        customerEmail: posCheckoutBooking.guestEmail,
        customerPhone: posCheckoutBooking.guestPhone,
        createdAt: new Date().toISOString(),
        ai_fraud_flag: false
      };

      dataStore.saveOrders([posOrder, ...dataStore.getOrders()]);

      // 2. Mark Booking as checked_out
      dataStore.saveBookings(dataStore.getBookings().map(b => b.id === posCheckoutBooking.id ? {
        ...b,
        status: 'checked_out',
        paymentStatus: 'paid',
        posOrderId: posOrderId
      } : b));

      // 3. Mark Room as Dirty & trigger automated Housekeeping Cleaning Task
      const houseCleaningTaskId = 'CLEAN-' + Math.floor(Math.random() * 8999 + 1000);
      dataStore.saveRooms(dataStore.getRooms().map(r => r.id === posCheckoutBooking.roomId ? {
        ...r,
        status: 'Dirty'
      } : r));

      // 4. Record Double-Entry Journal Entry
      dataStore.saveDoubleEntry([{
        id: 'je_pos_checkout_' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        referenceId: posOrderId,
        description: `Hostel room checkout for ${posCheckoutBooking.guestName} (Room #${posCheckoutBooking.roomNumber}). Total: $${posOrder.totalAmount}`,
        type: 'POS_SALE',
        debitAccount: 'Cash',
        creditAccount: 'Sales_Revenue',
        amount: posOrder.totalAmount
      }, ...dataStore.getDoubleEntry()]);

      setBookings(dataStore.getBookings());
      setRooms(dataStore.getRooms());
      setIsProcessingPosPayment(false);
      setShowPosCheckoutModal(false);

      setCheckoutNotice({
        ticketId: houseCleaningTaskId,
        roomNumber: posCheckoutBooking.roomNumber,
        guestName: posCheckoutBooking.guestName
      });

      setSyncToast(`Checkout payment of $${posOrder.totalAmount.toFixed(2)} processed via POS! Booking settled & Room #${posCheckoutBooking.roomNumber} queued for housekeeping.`);
      setTimeout(() => setSyncToast(null), 6000);
    }, 1200);
  };

  // Add sample unassigned OTA reservation for drag-and-drop testing
  const handleAddSampleUnassignedBooking = () => {
    const sampleNames = ['Amara Okafor', 'Liam O\'Connor', 'Chloe Chen', 'Mateo Fernandez', 'Siddharth Rao'];
    const sampleChannels: ChannelName[] = ['Airbnb', 'Booking.com', 'Hostelworld', 'Direct Website'];
    const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const randomChannel = sampleChannels[Math.floor(Math.random() * sampleChannels.length)];
    const checkInDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    const checkOutDate = new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0];

    const unassignedBooking: Booking = {
      id: 'book_unassigned_' + Date.now().toString().slice(-4),
      roomId: '',
      roomNumber: 'Unassigned',
      guestName: randomName,
      guestEmail: `${randomName.toLowerCase().replace(/[^a-z]/g, '')}@traveller.org`,
      guestPhone: '+1 (555) 492-8810',
      checkInDate,
      checkOutDate,
      guestsCount: 2,
      totalPrice: 480 + Math.floor(Math.random() * 240),
      sourceChannel: randomChannel,
      status: 'confirmed',
      paymentStatus: 'paid',
      specialRequests: 'Prefers quiet unit with high-speed Wi-Fi',
      createdAt: new Date().toISOString()
    };

    dataStore.addBooking(unassignedBooking);
    setBookings(dataStore.getBookings());
    setSyncToast(`Added unassigned OTA reservation for "${randomName}". Drag onto any available room to auto-assign!`);
    setTimeout(() => setSyncToast(null), 5000);
  };

  // Add Room Charge to Folio
  const handleAddRoomCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolioBooking || !newChargeDescription.trim() || !newChargeAmount.trim()) {
      alert('Please fill out all charge details.');
      return;
    }

    const amountNum = parseFloat(newChargeAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid positive charge amount.');
      return;
    }

    const newCharge = dataStore.addRoomCharge(selectedFolioBooking.id, {
      category: newChargeCategory,
      description: newChargeDescription.trim(),
      amount: amountNum,
      billedBy: activeUser.name
    }, activeUser.name);

    if (newCharge) {
      const updatedBookings = dataStore.getBookings();
      setBookings(updatedBookings);
      setSelectedFolioBooking({
        ...selectedFolioBooking,
        roomCharges: [...(selectedFolioBooking.roomCharges || []), newCharge],
        totalPrice: Number((selectedFolioBooking.totalPrice + newCharge.amount).toFixed(2))
      });
      setNewChargeDescription('');
      setNewChargeAmount('');
      setSyncToast(`Billed $${amountNum.toFixed(2)} to ${selectedFolioBooking.guestName}'s room folio (${newChargeCategory}).`);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  // Simulate External Google / Outlook Calendar Reservation Sync
  const handleSimulateCalendarSync = (provider: 'Google' | 'Outlook') => {
    setIsSimulatingCalendarSync(true);
    setSyncToast(`Syncing with ${provider} Calendar API... Receiving external blocked booking.`);

    setTimeout(() => {
      // Find a clean room to block
      const availableRoom = rooms.find(r => r.status === 'Clean') || rooms[0];
      const today = new Date();
      const inDate = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
      const outDate = new Date(today.getTime() + 4 * 86400000).toISOString().split('T')[0];

      const simulatedBooking = dataStore.syncExternalCalendarReservation({
        provider: provider === 'Google' ? 'Google Calendar' : 'Outlook Calendar',
        eventId: `${provider.toLowerCase()}_event_${Date.now()}`,
        guestName: 'Alexander Wright',
        guestEmail: 'alex.wright@corpventure.com',
        checkInDate: inDate,
        checkOutDate: outDate,
        roomNumber: availableRoom.number,
        roomId: availableRoom.id,
        totalPrice: 420
      });

      setBookings(dataStore.getBookings());
      setRooms(dataStore.getRooms());
      setSyncLogs(dataStore.getChannelSyncLogs());
      setIsSimulatingCalendarSync(false);
      setSyncToast(`${provider} Calendar Sync Event received! Room #${simulatedBooking.roomNumber} auto-blocked for ${simulatedBooking.guestName} (${inDate} to ${outDate}).`);
      setTimeout(() => setSyncToast(null), 7000);
    }, 1200);
  };

  // ------------------- API-FREE TOOLS ------------------- //
  
  // 1. Generate Standard iCal (.ics) text string
  const generateICSContent = (roomId?: string): string => {
    const activeBookings = roomId && roomId !== 'ALL' 
      ? bookings.filter(b => b.roomId === roomId && b.status !== 'cancelled')
      : bookings.filter(b => b.status !== 'cancelled');

    let icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Tumi ERP Hospitality Platform//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    activeBookings.forEach(b => {
      const dtStart = b.checkInDate.replace(/-/g, '');
      const dtEnd = b.checkOutDate.replace(/-/g, '');
      icsLines.push(
        'BEGIN:VEVENT',
        `UID:${b.id}@tumierp.internal`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `SUMMARY:Reserved - ${b.guestName} (${b.sourceChannel})`,
        `DESCRIPTION:Room #${b.roomNumber} - Total: $${b.totalPrice}. Booked via ${b.sourceChannel}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });

    icsLines.push('END:VCALENDAR');
    return icsLines.join('\r\n');
  };

  // Download .ics file
  const handleDownloadICS = (roomId?: string) => {
    const content = generateICSContent(roomId);
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tumi_hospitality_${roomId || 'all'}_calendar.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSyncToast('Downloaded .ics calendar file successfully! Import this into Airbnb or Booking.com.');
    setTimeout(() => setSyncToast(null), 4000);
  };

  // Parse and Import pasted iCal / ICS Text
  const handleParseAndImportIcal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedIcalText.trim()) return;

    try {
      const events: { summary: string; dtStart: string; dtEnd: string; uid: string }[] = [];
      const lines = pastedIcalText.split(/\r?\n/);
      let currentEvent: any = null;

      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed === 'BEGIN:VEVENT') {
          currentEvent = {};
        } else if (trimmed === 'END:VEVENT' && currentEvent) {
          if (currentEvent.dtStart && currentEvent.dtEnd) {
            events.push(currentEvent);
          }
          currentEvent = null;
        } else if (currentEvent) {
          if (trimmed.startsWith('SUMMARY:')) currentEvent.summary = trimmed.replace('SUMMARY:', '');
          if (trimmed.startsWith('DTSTART')) {
            const val = trimmed.split(':')[1] || '';
            // Format YYYYMMDD -> YYYY-MM-DD
            if (val.length >= 8) {
              currentEvent.dtStart = `${val.substring(0, 4)}-${val.substring(4, 6)}-${val.substring(6, 8)}`;
            }
          }
          if (trimmed.startsWith('DTEND')) {
            const val = trimmed.split(':')[1] || '';
            if (val.length >= 8) {
              currentEvent.dtEnd = `${val.substring(0, 4)}-${val.substring(4, 6)}-${val.substring(6, 8)}`;
            }
          }
          if (trimmed.startsWith('UID:')) currentEvent.uid = trimmed.replace('UID:', '');
        }
      });

      if (events.length === 0) {
        setSyncToast('No valid VEVENT entries found in the pasted iCal data. Check format.');
        setTimeout(() => setSyncToast(null), 4000);
        return;
      }

      let countAdded = 0;
      const targetRoom = rooms.find(r => r.id === selectedRoomForIcal) || rooms[0];

      events.forEach((ev, idx) => {
        const newBooking: Booking = {
          id: 'ical_' + Date.now() + '_' + idx,
          roomId: targetRoom.id,
          roomNumber: targetRoom.number,
          guestName: ev.summary || `OTA Guest (${importedIcalChannel})`,
          guestEmail: 'guest@ota.import',
          guestPhone: '+1-555-0199',
          checkInDate: ev.dtStart,
          checkOutDate: ev.dtEnd,
          guestsCount: targetRoom.capacity,
          totalPrice: targetRoom.nightlyRate * 2,
          sourceChannel: importedIcalChannel,
          status: 'confirmed',
          paymentStatus: 'paid',
          specialRequests: `Imported via iCal sync feed. UID: ${ev.uid || 'N/A'}`,
          createdAt: new Date().toISOString()
        };
        dataStore.addBooking(newBooking);
        countAdded++;
      });

      setBookings(dataStore.getBookings());
      setPastedIcalText('');
      setSyncToast(`Successfully imported ${countAdded} reservations from ${importedIcalChannel} iCal feed into Room #${targetRoom.number}!`);
      setTimeout(() => setSyncToast(null), 5000);
    } catch (err) {
      setSyncToast('Error parsing iCal data. Ensure it starts with BEGIN:VCALENDAR.');
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  // Export Bookings to CSV
  const handleExportCSV = () => {
    const headers = ['Booking ID', 'Guest Name', 'Email', 'Room Number', 'Check In', 'Check Out', 'Channel', 'Total Price', 'Status'];
    const rows = bookings.map(b => [
      b.id,
      `"${b.guestName}"`,
      b.guestEmail,
      b.roomNumber,
      b.checkInDate,
      b.checkOutDate,
      b.sourceChannel,
      b.totalPrice,
      b.status
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tumi_reservations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSyncToast('CSV Reservations report downloaded!');
    setTimeout(() => setSyncToast(null), 4000);
  };

  // Parse and Import CSV text
  const handleParseCSVImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedCsv.trim()) return;

    const lines = pastedCsv.trim().split(/\r?\n/);
    let importedCount = 0;

    lines.forEach((line, idx) => {
      if (idx === 0 && line.toLowerCase().includes('guest')) return; // header
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      if (parts.length >= 5) {
        const guestName = parts[0] || 'CSV Guest';
        const roomNum = parts[1] || rooms[0].number;
        const checkInDate = parts[2] || new Date().toISOString().split('T')[0];
        const checkOutDate = parts[3] || new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const channel = (parts[4] as ChannelName) || 'Walk-In POS';
        const price = Number(parts[5]) || 150;

        const matchedRoom = rooms.find(r => r.number === roomNum) || rooms[0];

        const newBooking: Booking = {
          id: 'csv_' + Date.now() + '_' + idx,
          roomId: matchedRoom.id,
          roomNumber: matchedRoom.number,
          guestName,
          guestEmail: 'csv@imported.guest',
          guestPhone: '+1-555-0000',
          checkInDate,
          checkOutDate,
          guestsCount: matchedRoom.capacity,
          totalPrice: price,
          sourceChannel: channel,
          status: 'confirmed',
          paymentStatus: 'paid',
          specialRequests: 'Bulk imported via CSV file',
          createdAt: new Date().toISOString()
        };
        dataStore.addBooking(newBooking);
        importedCount++;
      }
    });

    setBookings(dataStore.getBookings());
    setPastedCsv('');
    setSyncToast(`Successfully imported ${importedCount} bookings from CSV!`);
    setTimeout(() => setSyncToast(null), 4000);
  };

  // Overbooking / Conflict Scanner
  const conflicts = React.useMemo(() => {
    const list: { b1: Booking; b2: Booking }[] = [];
    for (let i = 0; i < bookings.length; i++) {
      for (let j = i + 1; j < bookings.length; j++) {
        const b1 = bookings[i];
        const b2 = bookings[j];
        if (b1.roomId === b2.roomId && b1.status !== 'cancelled' && b2.status !== 'cancelled') {
          // Check for date overlap: (StartA < EndB) and (EndA > StartB)
          if (b1.checkInDate < b2.checkOutDate && b1.checkOutDate > b2.checkInDate) {
            list.push({ b1, b2 });
          }
        }
      }
    }
    return list;
  }, [bookings]);

  // Filtered lists
  const filteredRooms = rooms.filter(r => {
    let matchesStatus = true;
    if (roomFilterStatus === 'Available') {
      matchesStatus = r.status === 'Clean';
    } else if (roomFilterStatus === 'Occupied') {
      matchesStatus = r.status === 'Occupied';
    } else if (roomFilterStatus === 'Cleaning Required') {
      matchesStatus = r.status === 'Dirty';
    } else if (roomFilterStatus === 'Under Maintenance') {
      matchesStatus = r.status === 'Maintenance';
    } else if (roomFilterStatus !== 'ALL') {
      matchesStatus = r.status === roomFilterStatus;
    }

    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredBookings = bookings.filter(b => {
    const matchesChannel = bookingFilterChannel === 'ALL' || b.sourceChannel === bookingFilterChannel;
    const matchesSearch = b.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesChannel && matchesSearch;
  });

  const getChannelBadge = (source: ChannelName) => {
    switch (source) {
      case 'Airbnb':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-rose-200">Airbnb</span>;
      case 'Booking.com':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-blue-200">Booking.com</span>;
      case 'Hostelworld':
        return <span className="bg-orange-100 text-orange-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-orange-200">Hostelworld</span>;
      case 'Direct Website':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-200">Direct Web</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-slate-200">Walk-In</span>;
    }
  };

  const getRoomStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case 'Clean':
        return <span className="bg-emerald-50 text-emerald-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-emerald-200">CLEAN</span>;
      case 'Dirty':
        return <span className="bg-amber-50 text-amber-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-amber-200">DIRTY (Needs Housekeeping)</span>;
      case 'Occupied':
        return <span className="bg-indigo-50 text-indigo-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-indigo-200">OCCUPIED</span>;
      case 'Maintenance':
        return <span className="bg-rose-50 text-rose-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-rose-200">MAINTENANCE</span>;
      default:
        return <span className="bg-slate-50 text-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-slate-200">RESERVED</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 border border-rose-900/60 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-rose-900/80 border border-rose-700/50 text-rose-300 text-xs font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-rose-400" />
              Hospitality & Property Management
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hostel Tape Chart & Real Calendar Matrix
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Real-time month calendar overview showing all bookings (upcoming, active, completed, or available) across all rooms and beds with direct OTA channel syncing.
            </p>
          </div>

          {/* Top Right Action Buttons: Sync All Channels, Expand Calendar, CSV Export & Import */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            
            {/* Sync All Channels Button */}
            <button
              onClick={handleSyncAllChannels}
              disabled={isSyncingAll}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-rose-900/30 disabled:opacity-50"
              title="Sync all external channels (Airbnb, Booking.com, Hostelworld, Direct Web)"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>{isSyncingAll ? 'Syncing OTAs...' : 'Sync All Channels Now'}</span>
            </button>

            {/* Expand / Collapse Calendar Toggle Button */}
            <button
              onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs py-2.5 px-3.5 rounded-xl transition-all shadow-sm"
              title="Toggle expanded calendar layout mode"
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>{isCalendarExpanded ? 'Collapse Calendar' : 'Expand Calendar'}</span>
            </button>

            {/* CSV Export Button */}
            <button
              onClick={handleExportCalendarCSV}
              className="flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs py-2.5 px-3.5 rounded-xl transition-all shadow-sm"
              title="Export 30-day calendar data to CSV report"
            >
              <FileText className="w-4 h-4 text-emerald-200" />
              <span>Export CSV</span>
            </button>

            {/* CSV Import Button */}
            <button
              onClick={() => setShowCsvImportModal(true)}
              className="flex items-center justify-center gap-1.5 bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs py-2.5 px-3.5 rounded-xl transition-all shadow-sm"
              title="Upload CSV reservations data"
            >
              <Upload className="w-4 h-4 text-indigo-200" />
              <span>Import CSV</span>
            </button>

          </div>
        </div>
      </div>

      {/* Sync Toast Alert */}
      {syncToast && (
        <div className="bg-emerald-950 border border-emerald-800 text-emerald-200 text-xs font-semibold p-4 rounded-xl flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{syncToast}</span>
          </div>
          <button onClick={() => setSyncToast(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Overbooking / Double-Booking Conflict Alert Banner */}
      {conflicts.length > 0 && (
        <div className="bg-rose-950 border-2 border-rose-600 text-rose-100 p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-bounce-subtle">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-rose-600 rounded-xl shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                Overbooking Warning Detected ({conflicts.length} Date Conflict{conflicts.length > 1 ? 's' : ''})
              </h3>
              <p className="text-xs text-rose-200 mt-0.5">
                Overlapping check-in dates exist for Room #{conflicts[0].b1.roomNumber} ({conflicts[0].b1.guestName} vs {conflicts[0].b2.guestName}). Re-assign or resolve dates to avoid double booking guests.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveSubTab('bookings')}
            className="bg-white text-rose-950 font-bold text-xs px-4 py-2 rounded-xl hover:bg-rose-100 transition-all shrink-0"
          >
            Resolve in Reservations
          </button>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-slate-500 font-bold uppercase">Total Units / Beds</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{rooms.length}</p>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
              {rooms.filter(r => r.status === 'Clean').length} Available Clean
            </p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl">
            <BedDouble className="w-6 h-6 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-slate-500 font-bold uppercase">Active Bookings</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{bookings.length}</p>
            <p className="text-[11px] text-indigo-600 font-bold mt-0.5">
              ${bookings.reduce((sum, b) => sum + b.totalPrice, 0).toLocaleString()} Total Value
            </p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl">
            <Calendar className="w-6 h-6 text-rose-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-slate-500 font-bold uppercase">OTA Channels</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{channels.length} Connected</p>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
              Airbnb, Booking, Hostelworld, Web
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <Globe className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-slate-500 font-bold uppercase">Occupancy Rate</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {Math.round((rooms.filter(r => r.status === 'Occupied').length / (rooms.length || 1)) * 100)}%
            </p>
            <p className="text-[11px] text-slate-500 font-bold mt-0.5">Live Occupancy</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <UserCheck className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2 gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSubTab('tape_chart')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeSubTab === 'tape_chart' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Tape Chart Calendar Matrix</span>
          </button>

          <button
            onClick={() => setActiveSubTab('rooms')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              activeSubTab === 'rooms' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Room & Bed Matrix ({rooms.length})
          </button>

          <button
            onClick={() => setActiveSubTab('bookings')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              activeSubTab === 'bookings' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Reservations ({bookings.length})
          </button>

          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeSubTab === 'analytics' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
            <span>D3.js Analytics</span>
          </button>

          <button
            onClick={() => setActiveSubTab('channels')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              activeSubTab === 'channels' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Channel Connections ({channels.length})
          </button>

          <button
            onClick={() => setActiveSubTab('ical')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeSubTab === 'ical' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
            <span>iCal Sync & Widget</span>
          </button>

          <button
            onClick={() => setActiveSubTab('imports')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeSubTab === 'imports' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-500" />
            <span>Data Batch Import (CSV/PDF)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('integrations')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeSubTab === 'integrations' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>WordPress & API Access Hub</span>
          </button>

          <button
            onClick={() => setActiveSubTab('messages')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeSubTab === 'messages' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
            <span>Staff Messenger</span>
          </button>

          <button
            onClick={() => setActiveSubTab('embed')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeSubTab === 'embed' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Code className="w-3.5 h-3.5 text-indigo-400" />
            <span>Direct Web Booking Widget</span>
          </button>

          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              activeSubTab === 'logs' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Sync Logs
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowWalkInModal(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-sm"
          >
            <UserCheck className="w-4 h-4 text-emerald-200" />
            <span>Walk-In Guest Check-In</span>
          </button>

          {activeSubTab === 'rooms' && (
            <button
              onClick={() => setShowAddRoomModal(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-4 h-4 text-rose-400" />
              <span>Add Room / Bed</span>
            </button>
          )}

          {activeSubTab === 'bookings' && (
            <button
              onClick={() => setShowAddBookingModal(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-4 h-4 text-rose-400" />
              <span>New Reservation</span>
            </button>
          )}
        </div>
      </div>

      {/* 0. TAPE CHART CALENDAR MATRIX */}
      {activeSubTab === 'tape_chart' && (
        <div className="space-y-6">
          
          {/* Top Controls Toolbar matching screenshot */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            
            {/* Date Range Selector & Navigation */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>{tapeDates[0]?.monthName} {tapeDates[0]?.dayNum}, {tapeDates[0]?.yearNum} – {tapeDates[tapeDates.length - 1]?.monthName} {tapeDates[tapeDates.length - 1]?.dayNum}, {tapeDates[tapeDates.length - 1]?.yearNum}</span>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    const prev = new Date(tapeStartDate);
                    prev.setDate(prev.getDate() - 7);
                    setTapeStartDate(prev.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-white hover:shadow-2xs rounded-lg transition-all"
                >
                  ◀ Prev 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setTapeStartDate(new Date().toISOString().split('T')[0])}
                  className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-white shadow-2xs rounded-lg transition-all"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = new Date(tapeStartDate);
                    next.setDate(next.getDate() + 7);
                    setTapeStartDate(next.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-white hover:shadow-2xs rounded-lg transition-all"
                >
                  Next 7 Days ▶
                </button>
              </div>

              {/* Grid Range Span (14 vs 30 Days) */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDaysToShow(14)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${daysToShow === 14 ? 'bg-white shadow-2xs text-indigo-700 font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  14 Days
                </button>
                <button
                  type="button"
                  onClick={() => setDaysToShow(30)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${daysToShow === 30 ? 'bg-white shadow-2xs text-indigo-700 font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Full Month (30 Days)
                </button>
              </div>
            </div>

            {/* View Mode Toggle, Checkboxes & Actions */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700">
              
              {/* Tape View Switcher */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCalendarViewMode('tape_beds')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${calendarViewMode === 'tape_beds' ? 'bg-indigo-600 text-white font-extrabold shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <BedDouble className="w-3.5 h-3.5" />
                  <span>Bed & Guest Tape Chart</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarViewMode('matrix')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${calendarViewMode === 'matrix' ? 'bg-indigo-600 text-white font-extrabold shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Matrix Summary</span>
                </button>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPricingPerGuest}
                  onChange={(e) => setShowPricingPerGuest(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>Pricing per guest</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showRestrictions}
                  onChange={(e) => setShowRestrictions(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>Restrictions</span>
              </label>

              <button
                type="button"
                onClick={() => setShowBulkEditModal(true)}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition-all"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Bulk Rates Editor</span>
              </button>
            </div>

          </div>

          {/* Tape Chart Grid Container */}
          <div className={`overflow-x-auto border border-slate-200 rounded-2xl shadow-sm bg-white transition-all ${isCalendarExpanded ? 'p-2 min-w-full' : ''}`}>
            <table className={`w-full text-left border-collapse text-xs ${isCalendarExpanded ? 'min-w-[1300px]' : 'min-w-[900px]'}`}>
              
              {/* Header: Months & Days */}
              <thead>
                {/* Month Group Row */}
                <tr className="bg-slate-900 text-white border-b border-slate-800">
                  <th className="p-3 font-extrabold w-64 min-w-[260px] border-r border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-black tracking-wide">Tumi Hostel Property</span>
                      <span className="text-[10px] font-mono bg-rose-900/80 text-rose-300 px-2 py-0.5 rounded">All Units</span>
                    </div>
                  </th>
                  {monthGroups.map((mg, idx) => (
                    <th
                      key={idx}
                      colSpan={mg.count}
                      className="p-2 text-center font-extrabold uppercase text-[11px] tracking-wider border-r border-slate-800 bg-slate-800/80"
                    >
                      {mg.label}
                    </th>
                  ))}
                </tr>

                {/* Days Headers Row */}
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-2 text-[11px] font-bold text-slate-500 border-r border-slate-200 bg-slate-100">
                    Timeline Dates
                  </th>
                  {tapeDates.map(d => (
                    <th
                      key={d.dateStr}
                      className={`p-2 text-center font-mono border-r border-slate-200 min-w-[55px] ${
                        d.isToday ? 'bg-indigo-100/90 text-indigo-900 font-bold' : d.isWeekend ? 'bg-slate-200/60' : ''
                      }`}
                    >
                      <div className="text-[10px] text-slate-500 uppercase">{d.dayName}</div>
                      <div className="text-sm font-extrabold">{d.dayNum}</div>
                    </th>
                  ))}
                </tr>

                {/* Occupancy % Summary Row (As shown in Image 2) */}
                <tr className="bg-amber-50/60 text-amber-900 border-b border-amber-200">
                  <th className="p-2 text-[11px] font-extrabold border-r border-slate-200 text-slate-800 flex items-center justify-between">
                    <span>Overall Occupancy %</span>
                    <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                  </th>
                  {tapeDates.map(d => {
                    const totalCap = rooms.reduce((sum, r) => sum + (r.capacity || 1), 0);
                    const totalBookedForDate = bookings.filter(b => b.status !== 'cancelled' && d.dateStr >= b.checkInDate && d.dateStr < b.checkOutDate).length;
                    const occPct = Math.round((totalBookedForDate / Math.max(1, totalCap)) * 100);

                    return (
                      <th key={d.dateStr} className="p-1.5 text-center font-mono border-r border-amber-200">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border inline-block ${
                          occPct >= 75 ? 'bg-rose-100 text-rose-900 border-rose-300' :
                          occPct >= 50 ? 'bg-amber-100 text-amber-900 border-amber-300' :
                          'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}>
                          {occPct}%
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Body: Bed & Guest Tape View OR Matrix Summary View */}
              <tbody>
                {rooms.map(room => {
                  return (
                    <React.Fragment key={room.id}>
                      
                      {/* Room Section Banner Header */}
                      <tr className="bg-slate-100 border-t-2 border-slate-300">
                        <td
                          colSpan={tapeDates.length + 1}
                          className="p-3 font-extrabold text-slate-900 text-xs bg-slate-200/90"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BedDouble className="w-4 h-4 text-rose-600" />
                              <span className="text-sm font-black text-slate-900">{room.name}</span>
                              <span className="text-slate-500 text-[10px] font-mono font-semibold">
                                (Room ID: {room.id})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-700 font-mono font-bold">
                              Base: US$ {room.nightlyRate.toFixed(2)} / night | Beds/Capacity: {room.capacity}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* STANDARD RATE ROW */}
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <td className="p-2 border-r border-slate-200 bg-slate-100/90 font-bold text-xs text-indigo-900">
                          <div className="flex items-center gap-1">
                            <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Standard Rate</span>
                          </div>
                        </td>
                        {tapeDates.map(d => {
                          const cellData = getTapeCellData(room, d.dateStr);
                          return (
                            <td key={d.dateStr} className="p-1.5 text-center font-mono text-[11px] text-slate-600 font-bold border-r border-slate-200">
                              {cellData.rate.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>

                      {/* CONDITIONAL RENDER: BED & GUEST TAPE CHART (IMAGE 2) VS MATRIX SUMMARY (IMAGE 1) */}
                      {calendarViewMode === 'tape_beds' ? (
                        /* BED UNITS SUB-ROWS */
                        Array.from({ length: room.capacity || 1 }).map((_, bedIdx) => {
                          const bedNumber = bedIdx + 1;

                          // Find bookings belonging to this room mapped to this bed index
                          const roomBookings = bookings.filter(b => b.roomId === room.id && b.status !== 'cancelled');

                          return (
                            <tr key={`${room.id}_bed_${bedNumber}`} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="p-2.5 font-extrabold text-slate-700 text-xs border-r border-slate-200 bg-slate-50/90 flex items-center justify-between">
                                <span className="font-mono">Bed / Unit {bedNumber}</span>
                                <span className="text-[10px] font-normal text-slate-400"># {room.number}</span>
                              </td>

                              {tapeDates.map(d => {
                                // Check if there is an active booking on this date for this bed unit
                                // Map bookings deterministically by index
                                const activeBooking = roomBookings.find((b, bIdx) => {
                                  const isBedMatch = (bIdx % room.capacity) === bedIdx;
                                  return isBedMatch && d.dateStr >= b.checkInDate && d.dateStr < b.checkOutDate;
                                });

                                if (activeBooking) {
                                  const isCheckInDay = d.dateStr === activeBooking.checkInDate;
                                  const isCheckedOut = activeBooking.status === 'checked_out';

                                  // Source Channel Color Styling
                                  let bgStyle = "bg-pink-600 text-white shadow-2xs"; // Airbnb / Direct
                                  if (activeBooking.sourceChannel === 'Booking.com') {
                                    bgStyle = "bg-blue-900 text-white shadow-2xs";
                                  } else if (activeBooking.sourceChannel === 'Hostelworld') {
                                    bgStyle = "bg-orange-600 text-white shadow-2xs";
                                  } else if (activeBooking.sourceChannel === 'Walk-In POS') {
                                    bgStyle = "bg-emerald-700 text-white shadow-2xs";
                                  }
                                  if (isCheckedOut) {
                                    bgStyle = "bg-slate-700 text-slate-200 border border-dashed border-slate-400";
                                  }

                                  return (
                                    <td
                                      key={d.dateStr}
                                      onClick={() => setSelectedFolioBooking(activeBooking)}
                                      className="p-1 border-r border-slate-200 bg-slate-50/30 cursor-pointer"
                                      title={`${activeBooking.guestName} (${activeBooking.sourceChannel}) - Stay: ${activeBooking.checkInDate} to ${activeBooking.checkOutDate}`}
                                    >
                                      <div className={`py-1 px-1.5 rounded-lg text-[10px] font-extrabold truncate max-w-[110px] flex items-center gap-1 transition-transform hover:scale-105 ${bgStyle}`}>
                                        {isCheckInDay && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-ping"></span>}
                                        <span className="truncate">{activeBooking.guestName}</span>
                                      </div>
                                    </td>
                                  );
                                }

                                // Available Slot cell
                                return (
                                  <td
                                    key={d.dateStr}
                                    onClick={() => {
                                      setBookRoomId(room.id);
                                      setShowAddBookingModal(true);
                                    }}
                                    className="p-1 text-center border-r border-slate-200 cursor-pointer hover:bg-emerald-50/60 group"
                                    title="Click to add a reservation for this bed"
                                  >
                                    <span className="text-slate-300 group-hover:text-emerald-600 text-xs font-bold font-mono">
                                      +
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      ) : (
                        /* MATRIX SUMMARY SUB-ROWS (IMAGE 1) */
                        <>
                          {/* Room Status */}
                          <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="p-2.5 font-bold text-slate-600 text-[11px] border-r border-slate-200 bg-slate-50/80">
                              Room status
                            </td>
                            {tapeDates.map(d => {
                              const cellData = getTapeCellData(room, d.dateStr);
                              const isBookedOrBlocked = cellData.status === 'Multiple blockers' || cellData.status === 'Closed' || cellData.status === 'Maintenance';
                              return (
                                <td
                                  key={d.dateStr}
                                  onClick={() => {
                                    setEditingCell({
                                      roomId: room.id,
                                      roomNumber: room.number,
                                      roomName: room.name,
                                      dateStr: d.dateStr,
                                      currentRate: cellData.rate,
                                      currentStatus: cellData.status,
                                      currentRoomsToSell: cellData.roomsToSell
                                    });
                                    setCellEditRate(cellData.rate.toString());
                                    setCellEditStatus(cellData.status);
                                    setCellEditRoomsToSell(cellData.roomsToSell.toString());
                                  }}
                                  className={`p-1.5 text-center border-r border-slate-200 cursor-pointer transition-all hover:bg-slate-100 ${
                                    isBookedOrBlocked ? 'bg-rose-50/60' : 'bg-emerald-50/30'
                                  }`}
                                >
                                  {isBookedOrBlocked ? (
                                    <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block truncate max-w-[65px] shadow-2xs">
                                      {cellData.status === 'Multiple blockers' ? 'Mult...' : cellData.status}
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block">
                                      Bookable
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>

                          {/* Rooms to Sell */}
                          <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="p-2.5 font-bold text-slate-600 text-[11px] border-r border-slate-200 bg-slate-50/80">
                              Rooms to Sell
                            </td>
                            {tapeDates.map(d => {
                              const cellData = getTapeCellData(room, d.dateStr);
                              return (
                                <td key={d.dateStr} className="p-1.5 text-center font-mono text-xs font-bold text-slate-700 border-r border-slate-200">
                                  {cellData.roomsToSell}
                                </td>
                              );
                            })}
                          </tr>

                          {/* Net Booked */}
                          <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                            <td className="p-2.5 font-bold text-slate-600 text-[11px] border-r border-slate-200 bg-slate-50/80">
                              Net Booked
                            </td>
                            {tapeDates.map(d => {
                              const cellData = getTapeCellData(room, d.dateStr);
                              return (
                                <td key={d.dateStr} className="p-1.5 text-center border-r border-slate-200">
                                  {cellData.bookedCount > 0 ? (
                                    <span className="bg-slate-700 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-full inline-block shadow-2xs">
                                      {cellData.bookedCount}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 text-[10px]">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        </>
                      )}

                     </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cell Editor Popover Modal */}
          {editingCell && (
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm">Edit Tape Cell: {editingCell.roomName}</h4>
                    <p className="text-slate-400 text-[11px] mt-0.5">Date: {editingCell.dateStr}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingCell(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-4 text-xs font-semibold text-slate-800">
                  <div>
                    <label className="block text-slate-600 mb-1 font-bold">Standard Nightly Rate (US$)</label>
                    <input
                      type="number"
                      step="1"
                      value={cellEditRate}
                      onChange={(e) => setCellEditRate(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-bold">Rooms / Beds to Sell</label>
                    <input
                      type="number"
                      value={cellEditRoomsToSell}
                      onChange={(e) => setCellEditRoomsToSell(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-bold">Availability Status</label>
                    <select
                      value={cellEditStatus}
                      onChange={(e) => setCellEditStatus(e.target.value as any)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-xs"
                    >
                      <option value="Bookable">Bookable (Open)</option>
                      <option value="Multiple blockers">Multiple Blockers (Closed)</option>
                      <option value="Closed">Closed / Blocked</option>
                      <option value="Maintenance">Under Maintenance</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cellApplyRange}
                        onChange={(e) => setCellApplyRange(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span>Apply this rate to date range</span>
                    </label>

                    {cellApplyRange && (
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Range End Date</label>
                        <input
                          type="date"
                          value={cellRangeEndDate || editingCell.dateStr}
                          onChange={(e) => setCellRangeEndDate(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCell(null);
                      setShowAddBookingModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-bold text-xs"
                  >
                    + Direct Reservation
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingCell(null)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCellEdit}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                    >
                      Save Cell
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Bulk Rate & Restrictions Editor Modal */}
          {showBulkEditModal && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Edit2 className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="font-extrabold text-base">Bulk Rate & Availability Editor</h3>
                      <p className="text-slate-400 text-xs mt-0.5">Update rates and room restrictions across custom date ranges.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBulkEditModal(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleApplyBulkEdit} className="p-6 space-y-4 text-xs font-semibold text-slate-800">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Target Room / Bed Unit</label>
                    <select
                      value={bulkRoomId}
                      onChange={(e) => setBulkRoomId(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="ALL">ALL Rooms & Bed Units ({rooms.length})</option>
                      {rooms.map(r => (
                        <option key={r.id} value={r.id}>{r.name} (Room #{r.number})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Start Date</label>
                      <input
                        type="date"
                        value={bulkStartDate}
                        onChange={(e) => setBulkStartDate(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">End Date</label>
                      <input
                        type="date"
                        value={bulkEndDate}
                        onChange={(e) => setBulkEndDate(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">New Nightly Rate (US$)</label>
                      <input
                        type="number"
                        step="1"
                        placeholder="e.g. 45 (Leave blank to keep base)"
                        value={bulkRateInput}
                        onChange={(e) => setBulkRateInput(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Rooms to Sell</label>
                      <input
                        type="number"
                        placeholder="e.g. 1 (Leave blank to keep max)"
                        value={bulkRoomsToSellInput}
                        onChange={(e) => setBulkRoomsToSellInput(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Availability Status</label>
                    <select
                      value={bulkStatusInput}
                      onChange={(e) => setBulkStatusInput(e.target.value as any)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Bookable">Bookable (Open for Sale)</option>
                      <option value="Multiple blockers">Multiple Blockers (Closed)</option>
                      <option value="Closed">Closed / Blocked</option>
                      <option value="Maintenance">Under Maintenance</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowBulkEditModal(false)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm"
                    >
                      Apply Bulk Updates
                    </button>
                  </div>
                </form>

              </div>
            </div>
          )}

        </div>
      )}

      {/* 1. ROOM & BED MATRIX */}
      {activeSubTab === 'rooms' && (
        <div className="space-y-4">
          
          {/* Exchange Rate Basis Card */}
          <div className="bg-gradient-to-br from-indigo-50/60 to-white p-5 rounded-2xl border border-indigo-100 shadow-2xs grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* Info & Settings (7 cols) */}
            <div className="md:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-indigo-600 animate-pulse" /> Room Rate Exchange Matrix
                  </h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Ghanaian Cedi (GHS) quoting basis for room reservations. Buying rate standards are enforced for lower guest-side conversions.
                  </p>
                </div>
                {(activeUser.role === 'ceo' || activeUser.role === 'manager' || activeUser.role === 'sysadmin') && (
                  <button
                    onClick={() => {
                      if (!isEditingRoomRates) {
                        setEditedBookingComRate(roomCurrencyConfig.bookingComRate.toString());
                        setEditedBOGRate(roomCurrencyConfig.bankOfGhanaBuyingRate.toString());
                      }
                      setIsEditingRoomRates(!isEditingRoomRates);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 py-1 px-2.5 rounded-lg shadow-2xs transition-all flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    {isEditingRoomRates ? 'Cancel' : 'Edit Rate Basis'}
                  </button>
                )}
              </div>

              {isEditingRoomRates ? (
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <p className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">Configure Exchange Rates Basis (GHS)</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Booking.com Buying Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editedBookingComRate}
                        onChange={(e) => setEditedBookingComRate(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                        placeholder="e.g. 15.10"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Bank of Ghana Buying Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editedBOGRate}
                        onChange={(e) => setEditedBOGRate(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                        placeholder="e.g. 15.20"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsEditingRoomRates(false)}
                      className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const bCom = parseFloat(editedBookingComRate) || roomCurrencyConfig.bookingComRate;
                        const bog = parseFloat(editedBOGRate) || roomCurrencyConfig.bankOfGhanaBuyingRate;
                        const newConfig = {
                          ...roomCurrencyConfig,
                          bookingComRate: bCom,
                          bankOfGhanaBuyingRate: bog
                        };
                        currencyStore.saveRoomConfig(newConfig);
                        setIsEditingRoomRates(false);
                        dataStore.logAudit(
                          activeUser.uid,
                          activeUser.name,
                          activeUser.role,
                          'UPDATE',
                          'Exchange Rate Basis',
                          `Configured hospitality room conversion rate rules: Booking.com: ₵${bCom}, Bank of Ghana: ₵${bog}`
                        );
                      }}
                      className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                    >
                      Save Conversions
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      const newConfig = { ...roomCurrencyConfig, activeSource: 'booking_com' as const };
                      currencyStore.saveRoomConfig(newConfig);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      roomCurrencyConfig.activeSource === 'booking_com'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-90">Booking.com Rate</span>
                      {roomCurrencyConfig.activeSource === 'booking_com' && <CheckCircle2 className="w-4 h-4 text-white fill-indigo-700" />}
                    </div>
                    <p className="text-lg font-black mt-1 font-mono">
                      ₵{roomCurrencyConfig.bookingComRate.toFixed(2)}
                    </p>
                    <p className={`text-[10px] mt-1 ${roomCurrencyConfig.activeSource === 'booking_com' ? 'text-indigo-200' : 'text-slate-400'}`}>
                      Enforce Booking.com buy conversions
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      const newConfig = { ...roomCurrencyConfig, activeSource: 'bank_of_ghana' as const };
                      currencyStore.saveRoomConfig(newConfig);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      roomCurrencyConfig.activeSource === 'bank_of_ghana'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-90">Bank of Ghana Rate</span>
                      {roomCurrencyConfig.activeSource === 'bank_of_ghana' && <CheckCircle2 className="w-4 h-4 text-white fill-indigo-700" />}
                    </div>
                    <p className="text-lg font-black mt-1 font-mono">
                      ₵{roomCurrencyConfig.bankOfGhanaBuyingRate.toFixed(2)}
                    </p>
                    <p className={`text-[10px] mt-1 ${roomCurrencyConfig.activeSource === 'bank_of_ghana' ? 'text-indigo-200' : 'text-slate-400'}`}>
                      Enforce official central bank buying rate
                    </p>
                  </button>
                </div>
              )}
            </div>

            {/* Live Guest Quote Calculator (5 cols) */}
            <div className="md:col-span-5 bg-white p-4 rounded-xl border border-indigo-100 shadow-2xs space-y-3.5">
              <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                Desk Side Quick Quote Calculator
              </span>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Input Room Price (USD)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    value={quickQuoteUSD}
                    onChange={(e) => setQuickQuoteUSD(e.target.value)}
                    className="w-full pl-6 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono"
                    placeholder="150"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Converted Quote</p>
                  <p className="text-slate-500 text-[10px] mt-0.5">
                    Basis: {roomCurrencyConfig.activeSource === 'booking_com' ? 'Booking.com' : 'Bank of Ghana'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-indigo-900 font-mono">
                    {(() => {
                      const usd = parseFloat(quickQuoteUSD) || 0;
                      const activeRate = roomCurrencyConfig.activeSource === 'booking_com' 
                        ? roomCurrencyConfig.bookingComRate 
                        : roomCurrencyConfig.bankOfGhanaBuyingRate;
                      return `₵${(usd * activeRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    })()}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rooms, beds, suites..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto">
              {['ALL', 'Available', 'Occupied', 'Cleaning Required', 'Under Maintenance'].map(status => (
                <button
                  key={status}
                  onClick={() => setRoomFilterStatus(status)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                    roomFilterStatus === status ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setRoomForTagsModal(null);
                  setTagsModalInitialMode('global');
                  setEditTagsModalOpen(true);
                }}
                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all whitespace-nowrap"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Manage Tags & Categories</span>
              </button>
            </div>
          </div>

          {/* Checkout Cleaning Automation Notice Banner */}
          {checkoutNotice && (
            <div className="bg-emerald-900 border border-emerald-700 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between animate-fadeIn">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-800 rounded-xl">
                  <Sparkles className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-200">
                    Guest Checkout Triggered Automated Housekeeping Ticket
                  </h4>
                  <p className="text-xs text-white">
                    Room #{checkoutNotice.roomNumber} ({checkoutNotice.guestName}) has been marked Dirty. Cleaning Ticket <span className="font-mono font-bold bg-emerald-950 px-1.5 py-0.5 rounded text-emerald-300">#{checkoutNotice.ticketId}</span> was automatically dispatched to Task Manager for housekeeping turnover.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCheckoutNotice(null)}
                className="text-xs font-bold bg-emerald-800 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* DRAG-AND-DROP UNASSIGNED RESERVATIONS TRAY */}
          {(() => {
            const unassigned = bookings.filter(b => (!b.roomId || b.roomId === 'unassigned' || b.roomId === '') && b.status !== 'cancelled');
            return (
              <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border-2 border-dashed border-amber-300 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Move className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Unassigned Reservations Tray ({unassigned.length})
                    </h3>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Drag any card onto a vacant room below to auto-assign
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSampleUnassignedBooking}
                    className="self-start sm:self-auto text-[11px] font-bold px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Sample Unassigned Reservation</span>
                  </button>
                </div>

                {unassigned.length === 0 ? (
                  <div className="p-4 bg-white/80 rounded-xl border border-amber-200/60 text-center text-xs text-slate-500">
                    No unassigned bookings currently. Click the button above to spawn a sample OTA reservation and test the drag-and-drop auto-assignment!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {unassigned.map(b => (
                      <div
                        key={b.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', b.id);
                          setDraggedBookingId(b.id);
                        }}
                        onDragEnd={() => setDraggedBookingId(null)}
                        className="p-3 bg-white rounded-xl border-2 border-amber-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing hover:border-amber-400 transition-all space-y-2 select-none group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 flex items-center gap-1">
                            <Move className="w-3 h-3 text-amber-500 group-hover:scale-125 transition-transform" />
                            {b.guestName}
                          </span>
                          {getChannelBadge(b.sourceChannel)}
                        </div>
                        <div className="text-[11px] text-slate-600 flex justify-between">
                          <span>{b.checkInDate} &rarr; {b.checkOutDate}</span>
                          <span className="font-bold text-emerald-600">${b.totalPrice}</span>
                        </div>
                        <div className="text-[10px] text-amber-700 bg-amber-50 font-semibold px-2 py-0.5 rounded border border-amber-200 text-center">
                          ✋ Drag onto any vacant room below
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRooms.map(room => {
              const isExpanded = expandedRoomId === room.id;
              const isDropTarget = dragOverRoomId === room.id;
              const activeBooking = bookings.find(b => b.roomId === room.id && b.status === 'checked_in') ||
                bookings.find(b => b.roomId === room.id && b.status === 'confirmed');

              return (
                <div
                  key={room.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverRoomId !== room.id) {
                      setDragOverRoomId(room.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverRoomId === room.id) {
                      setDragOverRoomId(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const bookingId = e.dataTransfer.getData('text/plain') || draggedBookingId;
                    if (bookingId) {
                      handleAssignBooking(bookingId, room.id);
                    }
                    setDraggedBookingId(null);
                    setDragOverRoomId(null);
                  }}
                  className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 transition-all relative ${
                    isDropTarget 
                      ? 'border-emerald-500 ring-4 ring-emerald-500/30 bg-emerald-50/40 scale-[1.01]' 
                      : isExpanded 
                        ? 'border-rose-500 ring-2 ring-rose-500/20 col-span-1 md:col-span-2 xl:col-span-3' 
                        : 'border-slate-200 hover:border-rose-300'
                  }`}
                >
                  {/* Visual Drop Overlay */}
                  {isDropTarget && (
                    <div className="p-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl text-center shadow-lg animate-pulse mb-2">
                      ✨ Drop here to assign Room #{room.number} to this reservation!
                    </div>
                  )}

                  {/* Clickable Header */}
                  <div
                    onClick={() => setExpandedRoomId(isExpanded ? null : room.id)}
                    className="flex items-start justify-between cursor-pointer group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider">
                          {room.floor}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoomForTagsModal(room);
                            setTagsModalInitialMode('single');
                            setEditTagsModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                          title="Click to edit room category"
                        >
                          <Layers className="w-2.5 h-2.5" />
                          <span>{room.type || 'Standard'}</span>
                          <Edit2 className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mt-0.5 group-hover:text-rose-600 transition-colors">
                        <BedDouble className="w-4 h-4 text-rose-600" />
                        #{room.number} - {room.name}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getRoomStatusBadge(room.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-[10px] font-mono text-slate-400 uppercase font-bold">Standard Rate</p>
                      <p className="text-sm font-black text-emerald-600">${room.pricingTiers?.standard || room.nightlyRate} / night</p>
                      <p className="text-[10px] font-mono font-bold text-indigo-600 mt-0.5">
                        ₵{Math.round((room.pricingTiers?.standard || room.nightlyRate) * (roomCurrencyConfig.activeSource === 'booking_com' ? roomCurrencyConfig.bookingComRate : roomCurrencyConfig.bankOfGhanaBuyingRate)).toLocaleString()} GHS
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-slate-400 uppercase font-bold">Capacity</p>
                      <p className="text-sm font-bold text-slate-700">{room.capacity} Guest(s)</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setBookRoomId(room.id);
                          setShowAddBookingModal(true);
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow-sm transition-all"
                      >
                        Quick Book Room
                      </button>
                    </div>
                  </div>

                  {/* Amenities, Custom Tags & Category - All Directly Editable */}
                  <div className="flex flex-wrap items-center gap-1">
                    {/* Category Chip */}
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        setRoomForTagsModal(room);
                        setTagsModalInitialMode('single');
                        setEditTagsModalOpen(true);
                      }}
                      className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-white px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                      title="Room Category (Click to edit)"
                    >
                      <Layers className="w-2.5 h-2.5 text-rose-400" />
                      {room.type || 'Standard'}
                    </span>

                    {/* Room Listing Tags */}
                    {(room.tags || []).map(tag => (
                      <span 
                        key={tag} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoomForTagsModal(room);
                          setTagsModalInitialMode('single');
                          setEditTagsModalOpen(true);
                        }}
                        className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold cursor-pointer inline-flex items-center gap-0.5 transition-colors"
                        title="Listing Tag (Click to edit)"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}

                    {/* Amenities */}
                    {room.amenities.map(amenity => (
                      <span 
                        key={amenity} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoomForTagsModal(room);
                          setTagsModalInitialMode('single');
                          setEditTagsModalOpen(true);
                        }}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-medium cursor-pointer transition-colors"
                        title="Amenity (Click to edit)"
                      >
                        {amenity}
                      </span>
                    ))}

                    {/* Quick Edit Tags Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRoomForTagsModal(room);
                        setTagsModalInitialMode('single');
                        setEditTagsModalOpen(true);
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded border border-dashed border-rose-300 inline-flex items-center gap-1 transition-all shadow-2xs"
                      title="Edit Room Tags & Category"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                      <span>Edit Tags</span>
                    </button>
                  </div>

                  {/* ACTIVE RESERVATION & GUEST FOLIO BAR */}
                  {activeBooking && (
                    <div className="bg-slate-900 text-white rounded-xl p-3 space-y-2 border border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span className="font-extrabold text-white">{activeBooking.guestName}</span>
                          <span className="text-[10px] text-slate-400">({activeBooking.sourceChannel})</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          activeBooking.status === 'checked_in' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {activeBooking.status === 'checked_in' ? 'IN-HOUSE' : 'CONFIRMED'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span>Stay: {activeBooking.checkInDate} &rarr; {activeBooking.checkOutDate}</span>
                        <span className="font-bold text-emerald-400 font-mono">
                          Folio: ${((activeBooking.totalPrice || 0) + (activeBooking.roomCharges?.reduce((sum, c) => sum + c.amount, 0) || 0)).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFolioBooking(activeBooking);
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
                        >
                          <Receipt className="w-3 h-3 text-rose-400" />
                          <span>Room Folio & Charges</span>
                        </button>

                        {activeBooking.status === 'checked_in' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookingStatusToggle(activeBooking, 'checked_out');
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold text-amber-200 hover:text-amber-100 bg-amber-900/60 hover:bg-amber-800/80 px-2.5 py-1.5 rounded-lg border border-amber-700 transition-colors"
                          >
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            <span>Check-Out & Clean</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookingStatusToggle(activeBooking, 'checked_in');
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold text-emerald-200 hover:text-emerald-100 bg-emerald-900/60 hover:bg-emerald-800/80 px-2.5 py-1.5 rounded-lg border border-emerald-700 transition-colors"
                          >
                            <UserCheck className="w-3 h-3 text-emerald-300" />
                            <span>Check-In Guest</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* EXPANDABLE DETAIL CARD CONTENT */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in text-xs">
                      {/* Active Guest Folio Incidentals (If Occupied/Reserved) */}
                      {activeBooking && (
                        <div className="bg-indigo-950 text-indigo-100 p-4 rounded-xl space-y-3 col-span-1 lg:col-span-3 border border-indigo-900">
                          <div className="flex items-center justify-between border-b border-indigo-800 pb-2">
                            <span className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                              <Receipt className="w-4 h-4 text-indigo-400" />
                              Room Folio & Incidental Charges Breakdown — {activeBooking.guestName}
                            </span>
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              Total Due: ${((activeBooking.totalPrice || 0) + (activeBooking.roomCharges?.reduce((sum, c) => sum + c.amount, 0) || 0)).toFixed(2)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                            <div className="space-y-1.5">
                              <div className="flex justify-between py-1 border-b border-indigo-900/80 text-indigo-300">
                                <span>Room Accommodation ({activeBooking.sourceChannel}):</span>
                                <span className="font-bold text-white font-mono">${activeBooking.totalPrice}</span>
                              </div>
                              {activeBooking.roomCharges && activeBooking.roomCharges.length > 0 ? (
                                activeBooking.roomCharges.map(charge => (
                                  <div key={charge.id} className="flex justify-between py-1 border-b border-indigo-900/80">
                                    <span className="text-slate-300">
                                      <span className="capitalize text-indigo-300 font-semibold">[{charge.category}]</span> {charge.description}
                                    </span>
                                    <span className="font-bold text-emerald-400 font-mono">+${charge.amount.toFixed(2)}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-indigo-400/80 italic py-1">No incidental room charges billed yet.</p>
                              )}
                            </div>

                            {/* Quick Add Charge Form */}
                            <div className="bg-indigo-900/40 p-3 rounded-lg border border-indigo-800/60 space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
                                Quick Post Charge to Room Folio
                              </span>
                              <div className="grid grid-cols-3 gap-2">
                                <select
                                  value={newChargeCategory}
                                  onChange={(e) => setNewChargeCategory(e.target.value as RoomCharge['category'])}
                                  className="text-[11px] bg-indigo-950 border border-indigo-700 text-white rounded p-1.5"
                                >
                                  <option value="Minibar">Minibar</option>
                                  <option value="Shop / POS Purchase">Bistro / POS</option>
                                  <option value="Room Service">Room Service</option>
                                  <option value="Spa / Amenities">Spa</option>
                                  <option value="Laundry">Laundry</option>
                                  <option value="Incidental">Incidentals</option>
                                  <option value="Maintenance / Damage">Maintenance / Damage</option>
                                </select>
                                <input
                                  type="text"
                                  placeholder="Charge description"
                                  value={newChargeDescription}
                                  onChange={(e) => setNewChargeDescription(e.target.value)}
                                  className="text-[11px] bg-indigo-950 border border-indigo-700 text-white rounded p-1.5"
                                />
                                <div className="flex gap-1">
                                  <input
                                    type="number"
                                    placeholder="$ Amount"
                                    value={newChargeAmount}
                                    onChange={(e) => setNewChargeAmount(e.target.value)}
                                    className="w-full text-[11px] bg-indigo-950 border border-indigo-700 text-white rounded p-1.5"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!newChargeDescription.trim() || !newChargeAmount.trim()) return;
                                      const updated = dataStore.addRoomCharge(activeBooking.id, {
                                        category: newChargeCategory,
                                        description: newChargeDescription.trim(),
                                        amount: parseFloat(newChargeAmount) || 0,
                                        billedBy: activeUser.name
                                      }, activeUser.name);
                                      if (updated) {
                                        setBookings(dataStore.getBookings());
                                        setNewChargeDescription('');
                                        setNewChargeAmount('');
                                        setSyncToast(`Charged $${newChargeAmount} to ${activeBooking.guestName}'s folio.`);
                                        setTimeout(() => setSyncToast(null), 3000);
                                      }
                                    }}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 rounded text-[10px]"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pricing Tiers */}
                      <div className="bg-slate-50 border border-slate-200 text-slate-800 p-4 rounded-xl space-y-2 font-mono">
                        <span className="text-[10px] font-bold text-rose-700 uppercase block border-b border-slate-200 pb-1">
                          Dynamic Pricing Tiers
                        </span>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 text-xs">Standard Rate:</span>
                          <div className="text-right">
                            <span className="font-bold text-emerald-700 text-xs block">${room.pricingTiers?.standard || room.nightlyRate}</span>
                            <span className="text-[10px] text-indigo-600 font-bold block">
                              ₵{Math.round((room.pricingTiers?.standard || room.nightlyRate) * (roomCurrencyConfig.activeSource === 'booking_com' ? roomCurrencyConfig.bookingComRate : roomCurrencyConfig.bankOfGhanaBuyingRate)).toLocaleString()} GHS
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 text-xs">Weekend Surcharge:</span>
                          <div className="text-right">
                            <span className="font-bold text-amber-700 text-xs block">${room.pricingTiers?.weekend || Math.round(room.nightlyRate * 1.25)}</span>
                            <span className="text-[10px] text-indigo-600 font-bold block">
                              ₵{Math.round((room.pricingTiers?.weekend || Math.round(room.nightlyRate * 1.25)) * (roomCurrencyConfig.activeSource === 'booking_com' ? roomCurrencyConfig.bookingComRate : roomCurrencyConfig.bankOfGhanaBuyingRate)).toLocaleString()} GHS
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 text-xs">Peak Holiday Rate:</span>
                          <div className="text-right">
                            <span className="font-bold text-rose-700 text-xs block">${room.pricingTiers?.holiday || Math.round(room.nightlyRate * 1.5)}</span>
                            <span className="text-[10px] text-indigo-600 font-bold block">
                              ₵{Math.round((room.pricingTiers?.holiday || Math.round(room.nightlyRate * 1.5)) * (roomCurrencyConfig.activeSource === 'booking_com' ? roomCurrencyConfig.bookingComRate : roomCurrencyConfig.bankOfGhanaBuyingRate)).toLocaleString()} GHS
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Maintenance Logs */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 col-span-2">
                        <span className="text-[10px] font-bold text-slate-600 uppercase block border-b border-slate-200 pb-1 flex items-center justify-between">
                          <span>Maintenance & Service History Logs</span>
                          <Wrench className="w-3.5 h-3.5 text-slate-400" />
                        </span>
                        {room.maintenanceHistory && room.maintenanceHistory.length > 0 ? (
                          <div className="space-y-1.5">
                            {room.maintenanceHistory.map(m => (
                              <div key={m.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-[11px]">
                                <div>
                                  <span className="font-bold text-slate-900">{m.issue}</span>
                                  <span className="text-slate-400 ml-2">Tech: {m.technician} ({m.date})</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  m.resolved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {m.resolved ? 'RESOLVED' : 'PENDING'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400 italic text-[11px] py-2">No maintenance issues recorded for this unit.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Housekeeping Action Buttons */}
                  <div className="border-t pt-3 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-slate-400">Housekeeping Status:</span>
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(room.id, 'Clean');
                        }}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                          room.status === 'Clean' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Clean
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(room.id, 'Dirty');
                        }}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                          room.status === 'Dirty' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Dirty
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(room.id, 'Maintenance');
                        }}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                          room.status === 'Maintenance' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Maint.
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. RESERVATION ENGINE */}
      {activeSubTab === 'bookings' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guests, order IDs..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto">
              {['ALL', 'Airbnb', 'Booking.com', 'Hostelworld', 'Direct Website'].map(ch => (
                <button
                  key={ch}
                  onClick={() => setBookingFilterChannel(ch)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    bookingFilterChannel === ch ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-300 text-[11px] font-mono uppercase tracking-wider">
                    <th className="py-3 px-4">Booking ID</th>
                    <th className="py-3 px-4">Guest Info</th>
                    <th className="py-3 px-4">Room / Unit</th>
                    <th className="py-3 px-4">Stay Dates</th>
                    <th className="py-3 px-4">Source Channel</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredBookings.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-all">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.id}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{b.guestName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{b.guestEmail}</p>
                        {b.onlineReceiptNumber && (
                          <p className="text-[10px] font-mono font-bold text-indigo-600">
                            Receipt: #{b.onlineReceiptNumber}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">Room #{b.roomNumber}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {b.checkInDate} → {b.checkOutDate}
                        {b.extendedStayHistory && b.extendedStayHistory.length > 0 && (
                          <span className="block text-[9px] font-bold text-indigo-600 font-sans">
                            +{b.extendedStayHistory.length} Extended Stay(s)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 space-y-1">
                        <div>{getChannelBadge(b.sourceChannel)}</div>
                        <div>
                          {b.billingType === 'bill_to_individual' || b.paymentStatus === 'unpaid' ? (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded inline-block">
                              👤 Bill to Individual
                            </span>
                          ) : b.billingType === 'online_receipt' || b.onlineReceiptNumber ? (
                            <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded inline-block">
                              🌐 Online Paid
                            </span>
                          ) : (
                            <span className="bg-indigo-100 text-indigo-900 border border-indigo-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded inline-block">
                              💳 POS Settled
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-black text-emerald-600">${b.totalPrice}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          b.status === 'checked_in' ? 'bg-indigo-100 text-indigo-800' :
                          b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {b.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {(!b.roomId || b.roomId === 'unassigned' || b.roomId === '') ? (
                          <select
                            onChange={(e) => {
                              if (e.target.value) handleAssignBooking(b.id, e.target.value);
                            }}
                            defaultValue=""
                            className="text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 rounded px-2 py-1"
                          >
                            <option value="" disabled>Assign Room...</option>
                            {rooms.filter(r => r.status === 'Clean' || r.status === 'Dirty').map(r => (
                              <option key={r.id} value={r.id}>Room #{r.number} - {r.name}</option>
                            ))}
                          </select>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => setSelectedFolioBooking(b)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] px-2.5 py-1 rounded transition-all border border-slate-300"
                        >
                          Folio (${((b.totalPrice || 0) + (b.roomCharges?.reduce((sum, c) => sum + c.amount, 0) || 0)).toFixed(0)})
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setExtendingBooking(b);
                            setExtendNewCheckOutDate(b.checkOutDate);
                            setShowExtendStayModal(true);
                          }}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] px-2.5 py-1 rounded transition-all border border-indigo-200"
                        >
                          Extend Stay
                        </button>

                        {b.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleBookingStatusToggle(b, 'checked_in')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2.5 py-1 rounded transition-all"
                          >
                            Check In
                          </button>
                        )}
                        {b.status === 'checked_in' && (
                          <button
                            type="button"
                            onClick={() => handleBookingStatusToggle(b, 'checked_out')}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-2.5 py-1 rounded transition-all flex-inline items-center gap-1"
                          >
                            Check Out & Clean
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. CHANNEL MANAGER INTEGRATIONS */}
      {activeSubTab === 'channels' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {channels.map(chan => (
            <div key={chan.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-rose-50 rounded-xl">
                    <Globe className="w-6 h-6 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{chan.channelName}</h3>
                    <p className="text-xs text-slate-500 font-mono">Listings: {chan.activeListingsCount} units</p>
                  </div>
                </div>

                <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                  <Wifi className="w-3 h-3 text-emerald-600" /> Connected
                </span>
              </div>

              <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">iCal Sync Feed:</span>
                  <span className="text-slate-700 font-bold truncate max-w-[180px]">{chan.iCalUrl || 'Direct API Webhook'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">API Key:</span>
                  <span className="text-slate-700 font-bold">{chan.apiKeyMasked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Synced:</span>
                  <span className="text-emerald-600 font-bold">{new Date(chan.lastSyncedAt || Date.now()).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. FREE ICAL & CSV DATA TOOLS */}
      {activeSubTab === 'ical' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* iCal Feed Exporter */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-3 border-b pb-3">
              <div className="p-3 bg-amber-50 rounded-xl">
                <Download className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Export iCal Feeds (.ics)</h3>
                <p className="text-xs text-slate-500">100% Free 2-way sync with Airbnb, Booking.com & Apple Calendar</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Room Unit Calendar</label>
                <select
                  value={selectedRoomForIcal}
                  onChange={(e) => setSelectedRoomForIcal(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                >
                  <option value="ALL">All Rooms (Whole Property Calendar)</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>Room #{r.number} - {r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Live iCal Subscription URL</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={`https://tumierp.internal/ical/feed/${selectedRoomForIcal}.ics`}
                    className="w-full text-xs font-mono p-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-600"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://tumierp.internal/ical/feed/${selectedRoomForIcal}.ics`);
                      setCopiedLink('ical');
                      setTimeout(() => setCopiedLink(null), 3000);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs p-2.5 rounded-lg flex items-center gap-1 shrink-0"
                  >
                    {copiedLink === 'ical' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink === 'ical' ? 'Copied' : 'Copy Feed Link'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Paste this URL into Airbnb Extranet &gt; Calendar &gt; Import Calendar to sync bookings automatically.
                </p>
              </div>

              <div className="pt-2 border-t flex justify-end">
                <button
                  onClick={() => handleDownloadICS(selectedRoomForIcal)}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .ics Calendar File</span>
                </button>
              </div>
            </div>
          </div>

          {/* iCal Feed Importer */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-3 border-b pb-3">
              <div className="p-3 bg-indigo-50 rounded-xl">
                <Upload className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Import iCal / ICS Feed Data</h3>
                <p className="text-xs text-slate-500">Paste raw .ics calendar data or feed exported from OTAs</p>
              </div>
            </div>

            <form onSubmit={handleParseAndImportIcal} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Source OTA Channel</label>
                  <select
                    value={importedIcalChannel}
                    onChange={(e) => setImportedIcalChannel(e.target.value as ChannelName)}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="Airbnb">Airbnb</option>
                    <option value="Booking.com">Booking.com</option>
                    <option value="Hostelworld">Hostelworld</option>
                    <option value="Direct Website">Direct Website</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Room Unit</label>
                  <select
                    value={selectedRoomForIcal}
                    onChange={(e) => setSelectedRoomForIcal(e.target.value)}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>Room #{r.number}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Paste Raw .ics File Content</label>
                <textarea
                  rows={4}
                  value={pastedIcalText}
                  onChange={(e) => setPastedIcalText(e.target.value)}
                  placeholder="BEGIN:VCALENDAR... BEGIN:VEVENT... SUMMARY:Reserved... END:VEVENT... END:VCALENDAR"
                  className="w-full text-xs font-mono p-2.5 bg-slate-900 text-slate-200 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={!pastedIcalText.trim()}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm disabled:opacity-40"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Parse & Import Reservations</span>
                </button>
              </div>
            </form>
          </div>

          {/* User-provided iCal sync addresses manager */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center space-x-3 border-b pb-3">
              <div className="p-3 bg-rose-50 rounded-xl">
                <Link className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Custom iCal Sync (Enter External URLs)</h3>
                <p className="text-xs text-slate-500">Provide iCal feed addresses from Airbnb, Booking.com, VRBO, or Google Calendar to pull live reservations.</p>
              </div>
            </div>

            <form onSubmit={handleAddExternalIcal} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Room Unit</label>
                <select
                  value={newExtIcalRoomId}
                  onChange={(e) => setNewExtIcalRoomId(e.target.value)}
                  className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-lg"
                >
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>Room #{r.number} - {r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Source Booking App / Channel</label>
                <select
                  value={newExtIcalChannel}
                  onChange={(e) => setNewExtIcalChannel(e.target.value as ChannelName)}
                  className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-lg"
                >
                  <option value="Airbnb">Airbnb</option>
                  <option value="Booking.com">Booking.com</option>
                  <option value="Hostelworld">Hostelworld</option>
                  <option value="Direct Website">Direct Website</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">External iCal URL Address (.ics)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={newExtIcalUrl}
                    onChange={(e) => setNewExtIcalUrl(e.target.value)}
                    placeholder="https://www.airbnb.com/calendar/ical/..."
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-lg shrink-0 transition-all"
                  >
                    Link URL
                  </button>
                </div>
              </div>
            </form>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700">Connected Booking App Calendars</h4>
              {externalIcalFeeds.length === 0 ? (
                <div className="text-xs text-slate-400 py-3 text-center border border-dashed rounded-xl">
                  No custom external iCal feeds linked yet. Add your booking app links above to start syncing.
                </div>
              ) : (
                <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="p-2.5 text-left">Room Unit</th>
                        <th className="p-2.5 text-left">Channel</th>
                        <th className="p-2.5 text-left">iCal Feed Address</th>
                        <th className="p-2.5 text-left">Last Synced</th>
                        <th className="p-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {externalIcalFeeds.map(feed => (
                        <tr key={feed.id} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-bold text-slate-800">Room #{feed.roomNumber}</td>
                          <td className="p-2.5 font-semibold text-rose-700">{feed.channelName}</td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-500 max-w-xs truncate" title={feed.url}>
                            {feed.url}
                          </td>
                          <td className="p-2.5 text-slate-500">{feed.lastSynced}</td>
                          <td className="p-2.5 text-right space-x-1.5">
                            <button
                              onClick={() => handleSyncExternalFeed(feed.id)}
                              disabled={syncingFeedId === feed.id}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded-md text-[10px] transition-all inline-flex items-center gap-1 disabled:opacity-40"
                            >
                              <RefreshCw className={`w-3 h-3 ${syncingFeedId === feed.id ? 'animate-spin' : ''}`} />
                              <span>{syncingFeedId === feed.id ? 'Syncing...' : 'Sync Now'}</span>
                            </button>
                            <button
                              onClick={() => handleDeleteExternalFeed(feed.id)}
                              className="text-rose-600 hover:text-rose-800 font-bold px-1 py-1 rounded-md text-[10px] transition-all"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* CSV Bulk Importer & Exporter */}
          <div className="lg:col-span-2 bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-emerald-950 border border-emerald-800 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">CSV Reservations Data Exchange</h3>
                  <p className="text-xs text-slate-400">Bulk export or paste CSV records from any PMS or OTA report</p>
                </div>
              </div>

              <button
                onClick={handleExportCSV}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 shadow"
              >
                <Download className="w-4 h-4" />
                <span>Export Active Bookings (CSV)</span>
              </button>
            </div>

            <form onSubmit={handleParseCSVImport} className="space-y-3">
              <label className="block text-xs font-mono font-bold text-emerald-400">
                Paste CSV Lines (Format: Guest Name, Room Number, CheckIn YYYY-MM-DD, CheckOut YYYY-MM-DD, Channel, Price)
              </label>
              <textarea
                rows={3}
                value={pastedCsv}
                onChange={(e) => setPastedCsv(e.target.value)}
                placeholder={'John Doe, 101, 2026-09-20, 2026-09-23, Airbnb, 350\nJane Smith, 102, 2026-09-21, 2026-09-25, Booking.com, 480'}
                className="w-full text-xs font-mono p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!pastedCsv.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all disabled:opacity-40"
                >
                  Import CSV Rows
                </button>
              </div>
            </form>
          </div>

          {/* GOOGLE & OUTLOOK CALENDARS 2-WAY SYNC ENGINE */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-sky-50 rounded-xl">
                  <Calendar className="w-6 h-6 text-sky-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Google & Outlook Calendar 2-Way Sync Engine
                  </h3>
                  <p className="text-xs text-slate-500">
                    Auto-blocks room availability the instant reservations are booked or modified in Google Calendar or Microsoft Outlook
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-600">Auto-Block Rooms:</span>
                <button
                  type="button"
                  onClick={() => setCalendarAutoBlockEnabled(!calendarAutoBlockEnabled)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    calendarAutoBlockEnabled 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {calendarAutoBlockEnabled ? 'ENABLED (ACTIVE)' : 'DISABLED'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Google Calendar Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🗓️</span>
                    <span className="font-bold text-xs text-slate-900">Google Calendar Sync</span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    2-Way Live Sync
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Target: <span className="font-mono font-bold text-slate-800">primary-resort-desk@gmail.com</span>
                </p>
                <div className="pt-2 flex justify-between items-center border-t border-slate-200">
                  <span className="text-[10px] text-slate-400">Webhook: Active</span>
                  <button
                    type="button"
                    disabled={isSimulatingCalendarSync}
                    onClick={() => handleSimulateCalendarSync('Google')}
                    className="text-[11px] font-bold bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSimulatingCalendarSync ? 'Syncing...' : 'Simulate Google Booking (Auto-Block)'}
                  </button>
                </div>
              </div>

              {/* Microsoft Outlook Calendar Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">📅</span>
                    <span className="font-bold text-xs text-slate-900">Outlook 365 Calendar Sync</span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    2-Way Live Sync
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Target: <span className="font-mono font-bold text-slate-800">executive-suites@outlook.office365.com</span>
                </p>
                <div className="pt-2 flex justify-between items-center border-t border-slate-200">
                  <span className="text-[10px] text-slate-400">Microsoft Graph: Synced</span>
                  <button
                    type="button"
                    disabled={isSimulatingCalendarSync}
                    onClick={() => handleSimulateCalendarSync('Outlook')}
                    className="text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSimulatingCalendarSync ? 'Syncing...' : 'Simulate Outlook Booking (Auto-Block)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. DIRECT WEB BOOKING ENGINE WIDGET */}
      {activeSubTab === 'embed' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Direct Embed Snippet Generator */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-3 border-b pb-3">
              <div className="p-3 bg-indigo-50 rounded-xl">
                <Code className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Direct Web Embed Widget</h3>
                <p className="text-xs text-slate-500">Collect 0% commission direct bookings on your website</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Embed HTML Code Snippet</label>
                <div className="relative">
                  <textarea
                    rows={6}
                    readOnly
                    value={`<!-- Tumi ERP Direct Hotel Booking Widget -->\n<iframe \n  src="https://tumierp.internal/embed/booking?hotelId=prop_101"\n  width="100%" \n  height="540" \n  frameborder="0"\n  style="border-radius: 16px; border: 1px solid #e2e8f0;"\n></iframe>`}
                    className="w-full text-[11px] font-mono p-3 bg-slate-900 text-indigo-300 rounded-xl border border-slate-800"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`<iframe src="https://tumierp.internal/embed/booking?hotelId=prop_101" width="100%" height="540" frameborder="0"></iframe>`);
                      setCopiedLink('embed');
                      setTimeout(() => setCopiedLink(null), 3000);
                    }}
                    className="absolute right-3 top-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    {copiedLink === 'embed' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink === 'embed' ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center space-x-2 font-bold text-slate-900">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Why Use Direct Website Booking?</span>
                </div>
                <ul className="text-slate-600 text-[11px] space-y-1 list-disc list-inside">
                  <li>Save 15% to 25% on OTA platform fees & commissions.</li>
                  <li>Instant sync directly into Tumi ERP reservations.</li>
                  <li>Guest details automatically added to CRM & Customer Directory.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Interactive Widget Live Preview */}
          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold text-indigo-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Widget Live Client Preview
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase">Interactive Guest Booking Form</span>
            </div>

            <div className="bg-white rounded-xl p-5 text-slate-900 shadow-2xl space-y-4">
              <div className="border-b pb-3 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Book Your Stay Direct</h4>
                  <p className="text-[11px] text-slate-500">Best price guaranteed • Free Cancellation</p>
                </div>
                <span className="bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                  0% Booking Fee
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Room Suite</label>
                  <select className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold">
                    {rooms.map(r => (
                      <option key={r.id}>#{r.number} - {r.name} (${r.nightlyRate}/night)</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Check-In</label>
                    <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Check-Out</label>
                    <input type="date" defaultValue={new Date(Date.now() + 2*86400000).toISOString().split('T')[0]} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSyncToast('Direct Web Reservation submitted! Order automatically added to Tumi ERP.');
                    setTimeout(() => setSyncToast(null), 4000);
                  }}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-3 rounded-xl shadow-lg transition-all"
                >
                  Confirm & Reserve Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. CHANNEL SYNC LOGS */}
      {activeSubTab === 'logs' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Live OTA Channel Exchange Logs</h3>
          <div className="space-y-2 font-mono text-xs">
            {syncLogs.map(log => (
              <div key={log.id} className="p-3 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-rose-400 font-bold">{log.channelName}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-indigo-300">{log.event}</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">{log.details}</p>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. D3.js OCCUPANCY & REVENUE ANALYTICS */}
      {activeSubTab === 'analytics' && (
        <HospitalityD3AnalyticsChart bookings={bookings} rooms={rooms} />
      )}

      {/* 8. CSV & PDF DATA BATCH IMPORT ENGINE */}
      {activeSubTab === 'imports' && (
        <DataImportModule activeUser={activeUser} />
      )}

      {/* 9. WORDPRESS & EXTERNAL 2-WAY API ACCESS HUB */}
      {activeSubTab === 'integrations' && (
        <ExternalAPIIntegrationsHub activeUser={activeUser} />
      )}

      {/* 10. IN-HOUSE TEAM MESSENGER */}
      {activeSubTab === 'messages' && (
        <InHouseMessagingModule activeUser={activeUser} />
      )}

      {/* ADD ROOM MODAL */}
      {showAddRoomModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Room or Bed Unit</h3>
              <button onClick={() => setShowAddRoomModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAddRoomSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Room/Bed Number</label>
                <input
                  type="text"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  placeholder="e.g., 104 or 201-BedC"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unit Name</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g., Deluxe Sunset Suite"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                  <select
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value as Room['type'])}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="Executive Suite">Executive Suite</option>
                    <option value="Deluxe Room">Deluxe Room</option>
                    <option value="Standard Double">Standard Double</option>
                    <option value="Hostel Dorm Bed">Hostel Dorm Bed</option>
                    <option value="Luxury Villa">Luxury Villa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nightly Rate ($)</label>
                  <input
                    type="number"
                    value={newRoomRate}
                    onChange={(e) => setNewRoomRate(Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" onClick={() => setShowAddRoomModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-lg shadow">Create Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD BOOKING MODAL */}
      {showAddBookingModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">New Guest Reservation</h3>
              <button onClick={() => setShowAddBookingModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAddBookingSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Room / Bed</label>
                <select
                  value={bookRoomId}
                  onChange={(e) => setBookRoomId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                >
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      #{r.number} - {r.name} (${r.nightlyRate}/night)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Guest Full Name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Source Channel</label>
                  <select
                    value={channelSource}
                    onChange={(e) => setChannelSource(e.target.value as ChannelName)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="Direct Website">Direct Website</option>
                    <option value="Airbnb">Airbnb</option>
                    <option value="Booking.com">Booking.com</option>
                    <option value="Hostelworld">Hostelworld</option>
                    <option value="Walk-In POS">Walk-In POS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Check In</label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Check Out</label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                    required
                  />
                </div>
              </div>

              {/* Payment & Billing Routing Section */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                  Payment / Billing Method *
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-400">
                    <input
                      type="radio"
                      name="bookingBillingType"
                      value="pay_now_pos"
                      checked={bookingBillingType === 'pay_now_pos'}
                      onChange={() => setBookingBillingType('pay_now_pos')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">💳 Send Payment through POS</span>
                      <p className="text-[10px] text-slate-500">Processes checkout immediately via POS register (Cash, Card, MoMo, Mobile POS)</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-400">
                    <input
                      type="radio"
                      name="bookingBillingType"
                      value="online_receipt"
                      checked={bookingBillingType === 'online_receipt'}
                      onChange={() => setBookingBillingType('online_receipt')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">🌐 Online Payment Recorded</span>
                      <p className="text-[10px] text-slate-500">Record online payment proof with online transaction / receipt number</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-400">
                    <input
                      type="radio"
                      name="bookingBillingType"
                      value="bill_to_individual"
                      checked={bookingBillingType === 'bill_to_individual'}
                      onChange={() => setBookingBillingType('bill_to_individual')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">👤 Bill to Individual (Pay on Checkout)</span>
                      <p className="text-[10px] text-slate-500">Creates unpaid room folio balance for guest to settle later or at checkout</p>
                    </div>
                  </label>
                </div>

                {/* Online Receipt Number Field */}
                {bookingBillingType === 'online_receipt' && (
                  <div className="pt-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Online Receipt Number / Tx Ref *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PAYSTACK-901824 or STRIPE-88120"
                      value={bookingOnlineReceiptNumber}
                      onChange={(e) => setBookingOnlineReceiptNumber(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-indigo-300 rounded-lg font-mono font-bold"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" onClick={() => setShowAddBookingModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-lg shadow">Confirm Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROOM FOLIO BREAKDOWN & INCIDENTAL CHARGES MODAL */}
      {selectedFolioBooking && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Guest Room Folio Statement
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Room #{selectedFolioBooking.roomNumber} • {selectedFolioBooking.guestName} ({selectedFolioBooking.sourceChannel})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFolioBooking(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Stay Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Booking ID</span>
                <p className="font-mono font-bold text-slate-900">{selectedFolioBooking.id}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Stay Dates</span>
                <p className="font-semibold text-slate-700">{selectedFolioBooking.checkInDate} &rarr; {selectedFolioBooking.checkOutDate}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Status</span>
                <p className="font-bold text-indigo-600 uppercase">{selectedFolioBooking.status}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Guests</span>
                <p className="font-semibold text-slate-700">{selectedFolioBooking.guestsCount || 2} Person(s)</p>
              </div>
            </div>

            {/* Itemized Folio Charges Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Itemized Folio Transactions & Incidentals
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-mono text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Billed By</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Accommodation base line */}
                    <tr className="bg-white">
                      <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{selectedFolioBooking.checkInDate}</td>
                      <td className="py-2 px-3 font-semibold text-slate-700">Room Stay</td>
                      <td className="py-2 px-3 text-slate-800">Nightly Accommodation ({selectedFolioBooking.sourceChannel})</td>
                      <td className="py-2 px-3 text-slate-500">Reservation Engine</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">${selectedFolioBooking.totalPrice.toFixed(2)}</td>
                    </tr>
                    {/* Incidental room charges */}
                    {selectedFolioBooking.roomCharges && selectedFolioBooking.roomCharges.map(charge => (
                      <tr key={charge.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{charge.timestamp?.split('T')[0] || 'Today'}</td>
                        <td className="py-2 px-3 font-semibold text-indigo-700 capitalize">{charge.category}</td>
                        <td className="py-2 px-3 text-slate-800">{charge.description}</td>
                        <td className="py-2 px-3 text-slate-500">{charge.billedBy}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">+${charge.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 text-slate-800 border-t-2 border-slate-300 font-mono font-bold">
                    <tr>
                      <td colSpan={4} className="py-3 px-3 text-right text-xs">Total Folio Balance Due:</td>
                      <td className="py-3 px-3 text-right text-sm text-emerald-700">
                        ${((selectedFolioBooking.totalPrice || 0) + (selectedFolioBooking.roomCharges?.reduce((sum, c) => sum + c.amount, 0) || 0)).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* AI-Driven Guest Amenity Recommender based on CRM History */}
            <div className="pt-1">
              <GuestAmenityRecommender
                booking={selectedFolioBooking}
                room={rooms.find(r => r.id === selectedFolioBooking.roomId || r.number === selectedFolioBooking.roomNumber)}
                currentCharges={selectedFolioBooking.roomCharges || []}
                contextMode="room_billing"
                onApplyAmenity={(rec) => {
                  const newCharge = dataStore.addRoomCharge(selectedFolioBooking.id, {
                    category: rec.category,
                    description: rec.name,
                    amount: rec.price,
                    billedBy: `${activeUser.name} (AI Amenity Engine)`
                  }, activeUser.name);

                  if (newCharge) {
                    const updatedBookings = dataStore.getBookings();
                    setBookings(updatedBookings);
                    setSelectedFolioBooking({
                      ...selectedFolioBooking,
                      roomCharges: [...(selectedFolioBooking.roomCharges || []), newCharge],
                      totalPrice: Number((selectedFolioBooking.totalPrice + newCharge.amount).toFixed(2))
                    });
                    setSyncToast(`Added AI amenity "${rec.name}" ($${rec.price.toFixed(2)}) to Room #${selectedFolioBooking.roomNumber} folio!`);
                    setTimeout(() => setSyncToast(null), 4000);
                  }
                }}
              />
            </div>

            {/* Add Incidental Charge Form */}
            <form onSubmit={handleAddRoomCharge} className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>Post New Charge / Incidental to Room #{selectedFolioBooking.roomNumber}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newChargeCategory}
                    onChange={(e) => setNewChargeCategory(e.target.value as RoomCharge['category'])}
                    className="w-full text-xs p-2 bg-white border border-indigo-200 rounded-lg"
                  >
                    <option value="Minibar">Minibar / Drinks</option>
                    <option value="Shop / POS Purchase">Bistro & POS Bar</option>
                    <option value="Room Service">Room Service</option>
                    <option value="Spa / Amenities">Spa & Wellness</option>
                    <option value="Laundry">Laundry Service</option>
                    <option value="Incidental">Other Incidentals</option>
                    <option value="Maintenance / Damage">Maintenance / Damage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="e.g., 2x Craft Beers & Snack"
                    value={newChargeDescription}
                    onChange={(e) => setNewChargeDescription(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-indigo-200 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Amount ($)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newChargeAmount}
                      onChange={(e) => setNewChargeAmount(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-indigo-200 rounded-lg font-mono"
                      required
                    />
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 rounded-lg shadow shrink-0"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </form>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => window.print()}
                className="text-xs font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Print Guest Folio Receipt</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExtendingBooking(selectedFolioBooking);
                    setExtendNewCheckOutDate(selectedFolioBooking.checkOutDate);
                    setShowExtendStayModal(true);
                  }}
                  className="px-3.5 py-2 text-xs font-bold bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <CalendarDays className="w-4 h-4 text-indigo-600" />
                  <span>Extend Stay</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPosCheckoutBooking(selectedFolioBooking);
                    setShowPosCheckoutModal(true);
                  }}
                  className="px-4 py-2 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4 text-emerald-200" />
                  <span>Send Bill to POS for Checkout & Payment</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFolioBooking(null)}
                  className="px-4 py-2 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl"
                >
                  Close Folio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXTEND STAY / PROLONG RESERVATION MODAL */}
      {showExtendStayModal && extendingBooking && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Extend Guest Stay / Prolong Reservation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Room #{extendingBooking.roomNumber} • Guest: {extendingBooking.guestName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowExtendStayModal(false);
                  setExtendingBooking(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Current Stay & Rate Summary */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Current Check-In Date:</span>
                <span className="font-bold text-slate-900">{extendingBooking.checkInDate}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Current Check-Out Date:</span>
                <span className="font-bold text-indigo-700">{extendingBooking.checkOutDate}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Nightly Room Rate:</span>
                <span className="font-bold text-slate-900">
                  ${rooms.find(r => r.id === extendingBooking.roomId || r.number === extendingBooking.roomNumber)?.nightlyRate || 100} / night
                </span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                <span>Current Booking Total:</span>
                <span className="font-bold text-slate-900">${extendingBooking.totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmExtendStay} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Extended Check-Out Date *
                </label>
                <input
                  type="date"
                  min={extendingBooking.checkOutDate}
                  value={extendNewCheckOutDate}
                  onChange={(e) => setExtendNewCheckOutDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  required
                />
              </div>

              {/* Calculated Additional Stay Breakdown */}
              {extendNewCheckOutDate && new Date(extendNewCheckOutDate) > new Date(extendingBooking.checkOutDate) && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-indigo-900 font-bold">
                    <span>Additional Extension Nights:</span>
                    <span>
                      +{Math.max(1, Math.round((new Date(extendNewCheckOutDate).getTime() - new Date(extendingBooking.checkOutDate).getTime()) / (1000 * 3600 * 24)))} night(s)
                    </span>
                  </div>
                  <div className="flex justify-between text-indigo-900 font-extrabold text-sm pt-1 border-t border-indigo-200">
                    <span>Additional Stay Charge Due:</span>
                    <span className="text-indigo-700">
                      +${(
                        Math.max(1, Math.round((new Date(extendNewCheckOutDate).getTime() - new Date(extendingBooking.checkOutDate).getTime()) / (1000 * 3600 * 24))) *
                        (rooms.find(r => r.id === extendingBooking.roomId || r.number === extendingBooking.roomNumber)?.nightlyRate || 100)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Extended Stay Payment Routing */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                  Payment / Billing Method for Extended Stay *
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-400">
                    <input
                      type="radio"
                      name="extendBillingType"
                      value="pay_now_pos"
                      checked={extendBillingType === 'pay_now_pos'}
                      onChange={() => setExtendBillingType('pay_now_pos')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">💳 Send Extension Charge to POS</span>
                      <p className="text-[10px] text-slate-500">Collect payment immediately at POS register (Cash, Card, MoMo)</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-400">
                    <input
                      type="radio"
                      name="extendBillingType"
                      value="online_receipt"
                      checked={extendBillingType === 'online_receipt'}
                      onChange={() => setExtendBillingType('online_receipt')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">🌐 Record Online Extension Payment</span>
                      <p className="text-[10px] text-slate-500">Attach online receipt/transaction reference number</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-400">
                    <input
                      type="radio"
                      name="extendBillingType"
                      value="bill_to_individual"
                      checked={extendBillingType === 'bill_to_individual'}
                      onChange={() => setExtendBillingType('bill_to_individual')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">👤 Bill Extension to Guest Folio (Pay on Checkout)</span>
                      <p className="text-[10px] text-slate-500">Add extension charge to guest folio balance due for checkout</p>
                    </div>
                  </label>
                </div>

                {extendBillingType === 'online_receipt' && (
                  <div className="pt-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Online Receipt Number / Tx Ref *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. EXT-PAYSTACK-88120"
                      value={extendOnlineReceiptNumber}
                      onChange={(e) => setExtendOnlineReceiptNumber(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-indigo-300 rounded-lg font-mono font-bold"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowExtendStayModal(false);
                    setExtendingBooking(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <CalendarDays className="w-4 h-4 text-indigo-200" />
                  <span>Confirm Extend Stay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUTOMATED CHECKOUT EMAIL PDF INVOICE DISPATCH MODAL */}
      {completedCheckoutInvoice && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Checkout Completed & PDF Invoice Emailed
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Invoice #{completedCheckoutInvoice.invoice.invoiceNumber} • Room #{completedCheckoutInvoice.booking.roomNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompletedCheckoutInvoice(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Email Dispatch Status Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span>Dispatched to Guest's CRM-Linked Email</span>
                </span>
                <span className="bg-emerald-200/70 text-emerald-900 font-mono font-bold text-[10px] px-2 py-0.5 rounded">
                  Delivered • {completedCheckoutInvoice.deliveryTimestamp}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-slate-700">
                <span className="text-slate-500 font-medium">Recipient Address:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  {completedCheckoutInvoice.invoice.dispatchedToEmail}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800">
                The official tax invoice PDF was compiled and dispatched automatically upon room checkout. The transaction has been linked to the guest's CRM lifetime activity record.
              </p>
            </div>

            {/* Financial & Stay Breakdown */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Guest Name</span>
                <p className="font-bold text-slate-800 truncate">{completedCheckoutInvoice.booking.guestName}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Stay Dates</span>
                <p className="text-slate-700 font-semibold">{completedCheckoutInvoice.booking.checkInDate} &rarr; {completedCheckoutInvoice.booking.checkOutDate}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Settled Total</span>
                <p className="font-bold text-emerald-700 font-mono">${completedCheckoutInvoice.invoice.grandTotal.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Cleaning Ticket</span>
                <p className="font-mono font-bold text-indigo-700">#{completedCheckoutInvoice.cleaningTaskId}</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => downloadInvoicePdf(completedCheckoutInvoice.invoice)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Invoice Copy</span>
              </button>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1 border border-slate-200 rounded-xl bg-white hover:bg-slate-50"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCompletedCheckoutInvoice(null)}
                  className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HOSTEL WALK-IN GUEST CHECK-IN MODAL */}
      {showWalkInModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Hostel Walk-In Guest Check-In</h3>
                  <p className="text-xs text-slate-500">Capture guest details, scan ID identification, and check in directly into room/bed.</p>
                </div>
              </div>
              <button onClick={() => setShowWalkInModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteWalkInCheckIn} className="space-y-4">
              
              {/* AI ID Image Document Scanner Section */}
              <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Identification Photo / AI Camera Scanner</span>
                  </span>
                  {idParsedSuccess && (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold font-mono text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> ID Parsed into Database
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="space-y-2">
                    <p className="text-xs text-slate-300">
                      Upload or capture guest ID (Passport, Driver License, National ID). AI automatically extracts Name, ID #, Phone, and Address.
                    </p>
                    
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-md">
                      <Camera className="w-4 h-4" />
                      <span>{isParsingIdImage ? 'Parsing ID Image...' : 'Upload / Capture ID Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleParseWalkInGuestIdImage}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Image Preview */}
                  {walkInGuestIdImage ? (
                    <div className="relative h-24 bg-slate-950 rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center">
                      <img src={walkInGuestIdImage} alt="Guest ID Document" className="max-h-full object-contain" />
                      <span className="absolute bottom-1 right-1 bg-black/70 text-[9px] font-mono text-emerald-400 px-1.5 py-0.5 rounded">
                        ID Photo Stored
                      </span>
                    </div>
                  ) : (
                    <div className="h-24 bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-400 text-xs">
                      <FileText className="w-6 h-6 mb-1 opacity-50" />
                      <span>No ID image captured yet</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Guest Details Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Guest Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alexander Vance"
                    value={walkInGuestName}
                    onChange={(e) => setWalkInGuestName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telephone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+233 24 000 0000"
                    value={walkInGuestPhone}
                    onChange={(e) => setWalkInGuestPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="guest@hostel.org"
                    value={walkInGuestEmail}
                    onChange={(e) => setWalkInGuestEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Physical Address</label>
                  <input
                    type="text"
                    placeholder="45 Palm Ridge Ave, Accra"
                    value={walkInGuestAddress}
                    onChange={(e) => setWalkInGuestAddress(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Identification Type</label>
                  <select
                    value={walkInGuestIdType}
                    onChange={(e) => setWalkInGuestIdType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="National ID">National ID Card</option>
                    <option value="Passport">International Passport</option>
                    <option value="Drivers License">Driver's License</option>
                    <option value="Residency Card">Residency Permit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ID / Passport Number</label>
                  <input
                    type="text"
                    placeholder="e.g. GHA-90281491-A"
                    value={walkInGuestIdNumber}
                    onChange={(e) => setWalkInGuestIdNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              {/* Room & Stay Dates */}
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/80 space-y-3">
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Room / Bed Allocation & Stay Dates</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Select Room / Bed</label>
                    <select
                      value={walkInRoomId}
                      onChange={(e) => setWalkInRoomId(e.target.value)}
                      className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl font-bold text-slate-900"
                    >
                      {rooms.map(r => (
                        <option key={r.id} value={r.id}>
                          Room #{r.number} - {r.name} (${r.nightlyRate}/night) [{r.status}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Check-In Date</label>
                    <input
                      type="date"
                      value={walkInCheckIn}
                      onChange={(e) => setWalkInCheckIn(e.target.value)}
                      className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Check-Out Date</label>
                    <input
                      type="date"
                      value={walkInCheckOut}
                      onChange={(e) => setWalkInCheckOut(e.target.value)}
                      className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Number of Guests</label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={walkInGuestsCount}
                      onChange={(e) => setWalkInGuestsCount(Number(e.target.value))}
                      className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl font-bold text-center"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Initial Deposit Paid ($)</label>
                    <input
                      type="number"
                      value={walkInDeposit}
                      onChange={(e) => setWalkInDeposit(e.target.value)}
                      className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl font-bold font-mono text-emerald-800"
                    />
                  </div>
                </div>

                {/* Walk-In Payment Routing */}
                <div className="pt-2 space-y-2 text-xs">
                  <label className="block text-[11px] font-extrabold text-emerald-900 uppercase tracking-wider">
                    Walk-In Payment Method *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-white border border-emerald-200 hover:border-emerald-500">
                      <input
                        type="radio"
                        name="walkInBillingType"
                        value="pay_now_pos"
                        checked={walkInBillingType === 'pay_now_pos'}
                        onChange={() => setWalkInBillingType('pay_now_pos')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-bold text-slate-800 text-[11px]">💳 POS Register</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-white border border-emerald-200 hover:border-emerald-500">
                      <input
                        type="radio"
                        name="walkInBillingType"
                        value="online_receipt"
                        checked={walkInBillingType === 'online_receipt'}
                        onChange={() => setWalkInBillingType('online_receipt')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-bold text-slate-800 text-[11px]">🌐 Online Payment</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-white border border-emerald-200 hover:border-emerald-500">
                      <input
                        type="radio"
                        name="walkInBillingType"
                        value="bill_to_individual"
                        checked={walkInBillingType === 'bill_to_individual'}
                        onChange={() => setWalkInBillingType('bill_to_individual')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-bold text-slate-800 text-[11px]">👤 Bill to Individual</span>
                    </label>
                  </div>

                  {walkInBillingType === 'online_receipt' && (
                    <div className="pt-1">
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                        Online Receipt Number / Tx Ref *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. WALKIN-ONL-88190"
                        value={walkInOnlineReceiptNumber}
                        onChange={(e) => setWalkInOnlineReceiptNumber(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-slate-900"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Walk-In Check-In</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV BOOKINGS DATA UPLOAD MODAL */}
      {showCsvImportModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Import Bookings CSV Data</h3>
                  <p className="text-xs text-slate-500">Upload or paste CSV reservation records into the lodging database.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCsvImportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-800 uppercase text-[11px] block">Expected CSV Format / Columns:</span>
              <p className="text-slate-600 font-mono bg-white p-2.5 rounded-xl border border-slate-200 overflow-x-auto text-[11px]">
                Guest Name, Room Number, Check In Date, Check Out Date, Source Channel, Price<br/>
                Deborah Nachamada, 101, 2026-09-23, 2026-09-28, Booking.com, 225.00<br/>
                Ruby Buijs, 102, 2026-09-24, 2026-09-29, Airbnb, 180.00
              </p>
            </div>

            <form onSubmit={handleParseCSVImport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Paste CSV Content or File Data</label>
                <textarea
                  rows={6}
                  value={pastedCsv}
                  onChange={(e) => setPastedCsv(e.target.value)}
                  placeholder="Paste CSV rows here..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCsvImportModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Parse & Import Bookings</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POS CHECKOUT PAYMENT PROCESSING MODAL */}
      {showPosCheckoutModal && posCheckoutBooking && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">POS Checkout & Payment Processing</h3>
                  <p className="text-xs text-slate-500">Room #{posCheckoutBooking.roomNumber} • Guest: {posCheckoutBooking.guestName}</p>
                </div>
              </div>
              <button onClick={() => setShowPosCheckoutModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Summary */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Room Accommodation Stay:</span>
                <span className="text-white font-bold">${posCheckoutBooking.totalPrice.toFixed(2)}</span>
              </div>
              
              {posCheckoutBooking.roomCharges && posCheckoutBooking.roomCharges.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Folio Room Incidentals ({posCheckoutBooking.roomCharges.length}):</span>
                  {posCheckoutBooking.roomCharges.map(c => (
                    <div key={c.id} className="flex justify-between text-indigo-300 text-[11px]">
                      <span className="truncate max-w-[220px]">{c.category}: {c.description}</span>
                      <span>+${c.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-extrabold">
                <span className="text-emerald-400">Grand Total Balance Due:</span>
                <span className="text-emerald-300 text-base">
                  ${((posCheckoutBooking.totalPrice || 0) + (posCheckoutBooking.roomCharges?.reduce((sum, c) => sum + c.amount, 0) || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Tender Method Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Select POS Payment Method</label>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPosPaymentMethod('cash')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    posPaymentMethod === 'cash' 
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPosPaymentMethod('card')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    posPaymentMethod === 'card' 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  💳 Credit Card
                </button>
                <button
                  type="button"
                  onClick={() => setPosPaymentMethod('momo')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    posPaymentMethod === 'momo' 
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  📱 Mobile Money
                </button>
              </div>

              {posPaymentMethod === 'momo' && (
                <div className="pt-1 space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">Mobile Money Phone Number</label>
                  <input
                    type="text"
                    placeholder="+233 24 123 4567"
                    value={posMomoPhone || posCheckoutBooking.guestPhone}
                    onChange={(e) => setPosMomoPhone(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPosCheckoutModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingPosPayment}
                onClick={handleExecutePosCheckout}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isProcessingPosPayment ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                )}
                <span>
                  {isProcessingPosPayment ? 'Processing POS Payment...' : 'Confirm Payment & Complete Checkout'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ROOM TAGS & CATEGORY MODAL */}
      <EditRoomTagsModal
        isOpen={editTagsModalOpen}
        room={roomForTagsModal}
        rooms={rooms}
        initialMode={tagsModalInitialMode}
        onClose={() => {
          setEditTagsModalOpen(false);
          setRoomForTagsModal(null);
        }}
        onRoomsUpdated={() => {
          setRooms(dataStore.getRooms());
        }}
      />

    </div>
  );
}
