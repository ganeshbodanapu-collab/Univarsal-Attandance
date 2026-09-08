import React, { useState, useEffect } from 'react';
import { useAttendanceContext } from '../../context/AttendanceContext';
import type { Section, Site, MealType, CanteenOrderStatus } from '../../types';
import { Modal } from '../common/Modal';
import {
  Utensils,
  Sunrise,
  Sun,
  Moon,
  Send,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  ShieldCheck,
  Calendar,
  Users,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import {
  exportSectionMealSummaryAsImage,
  exportSectionMealSummaryAsPDF,
} from '../../utils/exportMealSummary';

interface SectionFoodOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: Section;
  site: Site | null;
  selectedDate: string;
  onDateChange?: (newDate: string) => void;
  initialMealType?: MealType;
  onSuccessToast?: (msg: string) => void;
}

export const SectionFoodOrderModal: React.FC<SectionFoodOrderModalProps> = ({
  isOpen,
  onClose,
  section,
  site,
  selectedDate,
  onDateChange,
  initialMealType = 'afternoon',
  onSuccessToast,
}) => {
  const {
    workers,
    attendance,
    foodOrders,
    saveSectionFoodOrder,
    pushFoodOrderToCanteen,
    updateCanteenStatus,
    receiveFoodOrderAtSection,
    requestShortageReSend,
    dispatchRemainingParcels,
    confirmRemainingParcelsReceived,
    currentUser,
  } = useAttendanceContext();

  const [activeMeal, setActiveMeal] = useState<MealType>(initialMealType);
  const [internalDate, setInternalDate] = useState(selectedDate);

  // Sync date when prop changes
  useEffect(() => {
    setInternalDate(selectedDate);
  }, [selectedDate]);

  const handleDateChange = (d: string) => {
    setInternalDate(d);
    if (onDateChange) onDateChange(d);
  };

  // Section workforce and attendance analysis
  const sectionWorkers = workers.filter((w) => w.currentSectionId === section.id);
  const activeWorkers = sectionWorkers.filter((w) => w.status === 'active');
  const secWorkerIds = new Set(sectionWorkers.map((w) => w.id));

  // Attendance for this date
  const dateAttendance = attendance.filter(
    (a) => a.date === internalDate && secWorkerIds.has(a.workerId)
  );

  const autoPresentCount = dateAttendance.filter(
    (a) => a.status === 'present' || a.status === 'halfDay'
  ).length;

  const autoAbsentCount = dateAttendance.filter(
    (a) => a.status === 'absent' || a.status === 'leave'
  ).length;

  const autoOutsideWorkersCount = activeWorkers.filter(
    (w) => w.workerType === 'outside'
  ).length;

  // Find existing order for section, date, activeMeal
  const currentOrder = foodOrders.find(
    (o) =>
      o.sectionId === section.id &&
      o.date === internalDate &&
      o.mealType === activeMeal
  );

  // Local Form state for activeMeal
  const [presentQty, setPresentQty] = useState<number>(autoPresentCount || activeWorkers.length);
  const [absentQty, setAbsentQty] = useState<number>(0);
  const [outsideQty, setOutsideQty] = useState<number>(autoOutsideWorkersCount);
  const [othersQty, setOthersQty] = useState<number>(0);
  const [indentRemarks, setIndentRemarks] = useState<string>('');

  // Supervisor Receiving state
  const [receivedQtyInput, setReceivedQtyInput] = useState<number>(0);
  const [receivingRemarks, setReceivingRemarks] = useState<string>('');
  const [supervisorName, setSupervisorName] = useState<string>(
    currentUser?.name || section.inCharge || 'Rahul Dev'
  );

  // Shortage & Re-send state
  const [shortageReason, setShortageReason] = useState<string>('Damaged / Missing packets in transit');
  const [remainingReceivedInput, setRemainingReceivedInput] = useState<number>(0);

  // Canteen simulation state
  const [canteenDeliveryNote, setCanteenDeliveryNote] = useState<string>('');
  const [canteenDriverName, setCanteenDriverName] = useState<string>('Driver Santosh (Tata Ace)');

  // Sync form state when activeMeal, internalDate, or currentOrder changes
  useEffect(() => {
    if (currentOrder) {
      setPresentQty(currentOrder.presentCount);
      setAbsentQty(currentOrder.absentCount);
      setOutsideQty(currentOrder.outsideWorkersCount);
      setOthersQty(currentOrder.othersCount);
      setIndentRemarks(currentOrder.remarks || '');
      setReceivedQtyInput(
        currentOrder.receivedQty !== undefined
          ? currentOrder.receivedQty
          : currentOrder.dispatchedQty ?? currentOrder.totalOrderedQty
      );
      setReceivingRemarks(currentOrder.receivingRemarks || '');
      setShortageReason(currentOrder.shortageReason || 'Damaged / Missing packets in transit');
      setRemainingReceivedInput(currentOrder.shortageQty || 0);
    } else {
      // Defaults from workforce calculation
      const calculatedPresent = autoPresentCount > 0 ? autoPresentCount : activeWorkers.length;
      setPresentQty(calculatedPresent);
      setAbsentQty(0);
      setOutsideQty(autoOutsideWorkersCount);
      setOthersQty(0);
      setIndentRemarks('');
      setReceivedQtyInput(calculatedPresent + autoOutsideWorkersCount);
      setReceivingRemarks('');
      setShortageReason('Damaged / Missing packets in transit');
      setRemainingReceivedInput(0);
    }
  }, [currentOrder, activeMeal, internalDate, autoPresentCount, autoOutsideWorkersCount, activeWorkers.length]);

  const totalCalculated =
    Number(presentQty || 0) +
    Number(absentQty || 0) +
    Number(outsideQty || 0) +
    Number(othersQty || 0);

  // Status helper
  const status: CanteenOrderStatus = currentOrder?.status || 'draft';

  // Handler: Push to Canteen
  const handlePushToCanteen = () => {
    if (totalCalculated <= 0) {
      alert('Total food quantity must be greater than 0.');
      return;
    }

    const saved = saveSectionFoodOrder({
      sectionId: section.id,
      siteId: section.siteId,
      date: internalDate,
      mealType: activeMeal,
      presentCount: Number(presentQty || 0),
      absentCount: Number(absentQty || 0),
      outsideWorkersCount: Number(outsideQty || 0),
      othersCount: Number(othersQty || 0),
      totalOrderedQty: totalCalculated,
      remarks: indentRemarks.trim() || undefined,
      status: 'pushed_to_canteen',
      pushedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      pushedBy: currentUser?.name || section.inCharge,
    });

    pushFoodOrderToCanteen(saved.id, indentRemarks);

    if (onSuccessToast) {
      onSuccessToast(
        `✓ ${activeMeal.toUpperCase()} Food Indent (${totalCalculated} meals) pushed to Canteen for Section ${section.name}!`
      );
    }
  };

  // Handler: Canteen Marks Packing
  const handleCanteenStartPacking = () => {
    if (!currentOrder) return;
    updateCanteenStatus(currentOrder.id, 'packing', {
      canteenRemarks: canteenDeliveryNote || 'Packed in insulated thermal boxes with hot food containers.',
    });
    if (onSuccessToast) {
      onSuccessToast(`👨‍🍳 Canteen status updated: Packing & Processing ${currentOrder.totalOrderedQty} meals.`);
    }
  };

  // Handler: Canteen Dispatches Food
  const handleCanteenDispatch = () => {
    if (!currentOrder) return;
    updateCanteenStatus(currentOrder.id, 'sent_to_section', {
      dispatchedBy: canteenDriverName,
      dispatchedQty: currentOrder.totalOrderedQty,
      canteenRemarks: canteenDeliveryNote || 'Dispatched from central canteen via delivery vehicle.',
    });
    if (onSuccessToast) {
      onSuccessToast(`🚚 Food dispatched! Sent to Section ${section.name} via ${canteenDriverName}.`);
    }
  };

  // Handler: Supervisor Receives & Pushes to Canteen
  const handleSupervisorReceive = () => {
    if (!currentOrder) return;
    const finalReceived = Number(receivedQtyInput);
    if (finalReceived < 0) {
      alert('Please enter a valid received quantity.');
      return;
    }

    receiveFoodOrderAtSection(
      currentOrder.id,
      finalReceived,
      supervisorName.trim() || currentUser?.name || section.inCharge,
      receivingRemarks.trim() || 'All meal packets received and verified at section.'
    );

    if (onSuccessToast) {
      onSuccessToast(
        `✓ ${activeMeal.toUpperCase()} Food verified: ${finalReceived} meals received at ${section.name}. Canteen updated!`
      );
    }
  };

  // Shortage calculations
  const expectedDispatchedQty =
    currentOrder?.dispatchedQty ?? currentOrder?.totalOrderedQty ?? totalCalculated;
  const numReceived = Number(receivedQtyInput);
  const isShortage = numReceived < expectedDispatchedQty;
  const shortageCount = Math.max(0, expectedDispatchedQty - numReceived);

  // Handler 1: Update Received Quantity in Canteen (Accept Shortage)
  const handleSupervisorAcceptShortage = () => {
    if (!currentOrder) return;
    const finalReceived = Number(receivedQtyInput);
    if (finalReceived < 0) {
      alert('Please enter a valid received quantity.');
      return;
    }

    receiveFoodOrderAtSection(
      currentOrder.id,
      finalReceived,
      supervisorName.trim() || currentUser?.name || section.inCharge,
      receivingRemarks.trim() || `Shortage of ${shortageCount} parcels accepted. Reason: ${shortageReason}. Verified ${finalReceived}/${expectedDispatchedQty} meals received.`
    );

    if (onSuccessToast) {
      onSuccessToast(
        `✓ Canteen updated: Received ${finalReceived} meals at Section ${section.name}. Shortage of ${shortageCount} parcels accepted & recorded.`
      );
    }
  };

  // Handler 2: Re-send to Canteen (Request Remaining Parcels)
  const handleSupervisorRequestReSend = () => {
    if (!currentOrder) return;
    const finalReceived = Number(receivedQtyInput);
    if (finalReceived < 0) {
      alert('Please enter a valid received quantity.');
      return;
    }

    requestShortageReSend(
      currentOrder.id,
      finalReceived,
      shortageCount,
      shortageReason.trim() || 'Missing / Damaged parcels in delivery crate',
      supervisorName.trim() || currentUser?.name || section.inCharge
    );

    if (onSuccessToast) {
      onSuccessToast(
        `🔄 Re-send requested to Canteen! Sending remaining ${shortageCount} parcels to Section ${section.name}.`
      );
    }
  };

  // Handler 3: Canteen Dispatches Remaining Parcels
  const handleCanteenDispatchRemaining = () => {
    if (!currentOrder || !currentOrder.shortageQty) return;
    dispatchRemainingParcels(
      currentOrder.id,
      currentOrder.shortageQty,
      canteenDriverName || 'Canteen Express Tata Ace'
    );
    if (onSuccessToast) {
      onSuccessToast(
        `🚚 Canteen dispatched remaining ${currentOrder.shortageQty} parcels to Section ${section.name}!`
      );
    }
  };

  // Handler 4: Supervisor Confirms Remaining Parcels Received
  const handleSupervisorConfirmRemaining = () => {
    if (!currentOrder || !currentOrder.shortageQty) return;
    const count = Number(remainingReceivedInput) || currentOrder.shortageQty;
    confirmRemainingParcelsReceived(
      currentOrder.id,
      count,
      supervisorName.trim() || currentUser?.name || section.inCharge
    );
    if (onSuccessToast) {
      onSuccessToast(
        `✓ Full Order Fulfilled! Received remaining ${count} parcels for Section ${section.name}. Canteen complete!`
      );
    }
  };

  // State & Handlers: Export Summary to Image or PDF
  const [isExportingImage, setIsExportingImage] = useState(false);

  const handleExportImage = async () => {
    try {
      setIsExportingImage(true);
      await exportSectionMealSummaryAsImage({
        section,
        siteName: site?.name || 'Project Site',
        date: internalDate,
        foodOrders,
      });
      if (onSuccessToast) {
        onSuccessToast(`🖼️ Meal Summary image for Section ${section.name} exported successfully!`);
      }
    } catch (err) {
      console.error('Export image error:', err);
      alert('Could not export image. Please try again.');
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleExportPDF = () => {
    try {
      exportSectionMealSummaryAsPDF({
        section,
        siteName: site?.name || 'Project Site',
        date: internalDate,
        foodOrders,
      });
      if (onSuccessToast) {
        onSuccessToast(`📄 Opening PDF print voucher for Section ${section.name}...`);
      }
    } catch (err) {
      console.error('Export PDF error:', err);
      alert('Could not open PDF voucher. Please try again.');
    }
  };

  // Meal pill helpers
  const mealConfig: Record<MealType, { label: string; time: string; icon: any; color: string }> = {
    morning: {
      label: 'Morning Breakfast',
      time: '07:00 AM - 09:00 AM',
      icon: Sunrise,
      color: 'from-amber-500 to-orange-500',
    },
    afternoon: {
      label: 'Afternoon Lunch',
      time: '12:30 PM - 02:30 PM',
      icon: Sun,
      color: 'from-blue-600 to-indigo-600',
    },
    night: {
      label: 'Night Dinner',
      time: '07:30 PM - 09:30 PM',
      icon: Moon,
      color: 'from-indigo-600 to-slate-800',
    },
  };

  const getOrderStatusBadge = (st: CanteenOrderStatus, count: number) => {
    switch (st) {
      case 'received':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Received ({count})</span>
          </span>
        );
      case 'sent_to_section':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Truck className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
            <span>Sent to Section ({count})</span>
          </span>
        );
      case 'packing':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Package className="h-3.5 w-3.5 text-amber-600" />
            <span>Packing ({count})</span>
          </span>
        );
      case 'pushed_to_canteen':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <Clock className="h-3.5 w-3.5 text-purple-600" />
            <span>Pushed to Canteen ({count})</span>
          </span>
        );
      case 'shortage_resend_requested':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
            <span>Shortage: Re-Send ({count})</span>
          </span>
        );
      case 'remaining_sent':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
            <Truck className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
            <span>Remaining En-Route ({count})</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <span>Draft ({count})</span>
          </span>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Section Food Management — ${section.name}`}
      subtitle={`Parent Site: ${site?.name || section.siteId} (${site?.code || section.siteId}) • Supervisor In Charge: ${section.inCharge}`}
      icon={<Utensils className="h-5 w-5 text-orange-600" />}
      size="2xl"
    >
      <div className="space-y-6">
        {/* Top Header Card with Section Identity and Date Selector */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-4 sm:p-5 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-500/30 border border-indigo-400/40 text-indigo-200">
                {section.code}
              </span>
              <span className="text-xs font-semibold text-slate-300">Section Workgroup</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{section.name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-medium">
              <span className="inline-flex items-center space-x-1">
                <Users className="h-3.5 w-3.5 text-blue-400" />
                <span>Total Workforce: <strong>{sectionWorkers.length}</strong> (Active: {activeWorkers.length})</span>
              </span>
              <span>•</span>
              <span className="inline-flex items-center space-x-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Supervisor: <strong>{section.inCharge}</strong></span>
              </span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-2.5 self-stretch sm:self-auto flex flex-col items-start sm:items-end">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-200 mb-1 flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>Operational Date</span>
            </label>
            <input
              type="date"
              value={internalDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-white text-slate-900 font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-inner outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* 3 Meal Tabs: Morning, Afternoon, Night */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {(['morning', 'afternoon', 'night'] as MealType[]).map((m) => {
            const conf = mealConfig[m];
            const Icon = conf.icon;
            const order = foodOrders.find(
              (o) => o.sectionId === section.id && o.date === internalDate && o.mealType === m
            );
            const isSelected = activeMeal === m;
            const orderSt = order?.status || 'draft';
            const orderCount = order?.totalOrderedQty ?? autoPresentCount;

            return (
              <button
                key={m}
                type="button"
                onClick={() => setActiveMeal(m)}
                className={`p-3 sm:p-3.5 rounded-2xl border transition-all text-left relative overflow-hidden cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-600/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`h-7 w-7 rounded-xl flex items-center justify-center text-white bg-gradient-to-tr ${conf.color} shadow-xs`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                      {conf.label.split(' ')[0]}
                    </span>
                  </div>
                  {getOrderStatusBadge(orderSt, orderCount)}
                </div>
                <div className="mt-2 text-[11px] text-slate-500 font-medium">
                  {conf.time}
                </div>
              </button>
            );
          })}
        </div>

        {/* Canteen Pipeline Stepper (Visual 4-Stage Progress) */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Canteen Order & Delivery Pipeline Status</span>
            </span>
            <div className="text-xs font-bold text-slate-700">
              Current: {getOrderStatusBadge(status, currentOrder?.totalOrderedQty ?? totalCalculated)}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center relative">
            {/* Step 1: Pushed to Canteen */}
            <div
              className={`p-2.5 rounded-xl border transition-all ${
                status !== 'draft'
                  ? 'bg-purple-50 border-purple-200 text-purple-900'
                  : 'bg-white border-slate-200 text-slate-400 opacity-60'
              }`}
            >
              <div className="flex items-center justify-center mb-1">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${status !== 'draft' ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  1
                </div>
              </div>
              <span className="text-[11px] font-bold block leading-tight">Pushed to Canteen</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                {currentOrder?.pushedAt || 'Not sent'}
              </span>
            </div>

            {/* Step 2: Packing in Processing */}
            <div
              className={`p-2.5 rounded-xl border transition-all ${
                status === 'packing' || status === 'sent_to_section' || status === 'received'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-400 opacity-60'
              }`}
            >
              <div className="flex items-center justify-center mb-1">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${status === 'packing' || status === 'sent_to_section' || status === 'received' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  2
                </div>
              </div>
              <span className="text-[11px] font-bold block leading-tight">Packing / Processing</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                {currentOrder?.packingStartedAt || 'Pending kitchen'}
              </span>
            </div>

            {/* Step 3: Food Sent to Section */}
            <div
              className={`p-2.5 rounded-xl border transition-all ${
                status === 'sent_to_section' || status === 'received'
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-white border-slate-200 text-slate-400 opacity-60'
              }`}
            >
              <div className="flex items-center justify-center mb-1">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${status === 'sent_to_section' || status === 'received' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  3
                </div>
              </div>
              <span className="text-[11px] font-bold block leading-tight">Sent to Section</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                {currentOrder?.dispatchedAt || 'Awaiting dispatch'}
              </span>
            </div>

            {/* Step 4: Received by Supervisor */}
            <div
              className={`p-2.5 rounded-xl border transition-all ${
                status === 'received'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-white border-slate-200 text-slate-400 opacity-60'
              }`}
            >
              <div className="flex items-center justify-center mb-1">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${status === 'received' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  4
                </div>
              </div>
              <span className="text-[11px] font-bold block leading-tight">Received & Verified</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                {currentOrder?.receivedAt || 'Pending delivery'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Automated Food Quantities Indent Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                <span>1. {mealConfig[activeMeal].label} Indent Quantities</span>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  Auto-Calculated from Attendance
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and adjust required food portions for this section before sending to canteen.
              </p>
            </div>

            {/* Total Highlight */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-4 py-2 rounded-xl text-right shadow-sm">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200 block">
                Total Food Required
              </span>
              <span className="text-xl sm:text-2xl font-black leading-none">{totalCalculated} Meals</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Present Employees */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700">Present Employees</label>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded">
                  {autoPresentCount} marked
                </span>
              </div>
              <input
                type="number"
                min="0"
                value={presentQty}
                onChange={(e) => setPresentQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-white border border-slate-300 font-bold text-sm px-3 py-1.5 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 block mt-1">Direct company / deployed</span>
            </div>

            {/* Absent Employees */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700">Absent Employees</label>
                <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1 rounded">
                  {autoAbsentCount} absent
                </span>
              </div>
              <input
                type="number"
                min="0"
                value={absentQty}
                onChange={(e) => setAbsentQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-white border border-slate-300 font-bold text-sm px-3 py-1.5 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 block mt-1">Normally 0 (unless packed)</span>
            </div>

            {/* Outside Workers */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700">Outside Workers</label>
                <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-1 rounded">
                  {autoOutsideWorkersCount} outside
                </span>
              </div>
              <input
                type="number"
                min="0"
                value={outsideQty}
                onChange={(e) => setOutsideQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-white border border-slate-300 font-bold text-sm px-3 py-1.5 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 block mt-1">Contract / hired workforce</span>
            </div>

            {/* Others */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700">Others / Visitors</label>
                <span className="text-[10px] text-slate-500 font-bold">Extra</span>
              </div>
              <input
                type="number"
                min="0"
                value={othersQty}
                onChange={(e) => setOthersQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-white border border-slate-300 font-bold text-sm px-3 py-1.5 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 block mt-1">Drivers, visitors, security</span>
            </div>
          </div>

          {/* Remarks for Canteen */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Remarks & Special Dietary Instructions for Canteen
            </label>
            <textarea
              rows={2}
              value={indentRemarks}
              onChange={(e) => setIndentRemarks(e.target.value)}
              placeholder="e.g. Pack in thermal hot box #3, 5 vegetarian meals, 15 non-veg meals, extra tea/coffee, spicy chutney..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Push to Canteen Action Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500 font-medium flex items-center space-x-1.5">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>
                {currentOrder?.pushedAt
                  ? `Last pushed to Canteen at ${currentOrder.pushedAt} by ${currentOrder.pushedBy}`
                  : 'Ready to send to Canteen kitchen queue'}
              </span>
            </div>

            <button
              type="button"
              onClick={handlePushToCanteen}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>{status === 'draft' ? '🚀 Push to Canteen' : '🔄 Update & Re-Push to Canteen'}</span>
            </button>
          </div>
        </div>

        {/* Section 2: Canteen Kitchen Simulation Controls (Shown when pushed or packing) */}
        {status !== 'draft' && (
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 flex items-center space-x-1.5">
                <Package className="h-4 w-4 text-amber-600" />
                <span>2. Central Canteen Kitchen Status Management</span>
              </span>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                Live Kitchen Link
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-amber-900 block mb-1">
                  Canteen Delivery Note / Packaging Info
                </label>
                <input
                  type="text"
                  value={canteenDeliveryNote}
                  onChange={(e) => setCanteenDeliveryNote(e.target.value)}
                  placeholder="e.g. Packed in insulated crate #4 with seal tag #884"
                  className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-amber-900 block mb-1">
                  Assigned Delivery Person / Vehicle
                </label>
                <input
                  type="text"
                  value={canteenDriverName}
                  onChange={(e) => setCanteenDriverName(e.target.value)}
                  placeholder="e.g. Driver Santosh (Tata Ace) / Delivery Staff"
                  className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {status === 'pushed_to_canteen' && (
                <button
                  type="button"
                  onClick={handleCanteenStartPacking}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>👨‍🍳 Canteen: Mark Packing in Progress</span>
                </button>
              )}

              {(status === 'pushed_to_canteen' || status === 'packing') && (
                <button
                  type="button"
                  onClick={handleCanteenDispatch}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Truck className="h-3.5 w-3.5" />
                  <span>🚚 Canteen: Dispatch & Send Food to Section</span>
                </button>
              )}

              {status === 'sent_to_section' && (
                <div className="text-xs text-blue-800 font-bold bg-blue-100 px-3 py-1.5 rounded-xl flex items-center space-x-2">
                  <Truck className="h-4 w-4 animate-bounce text-blue-600" />
                  <span>
                    Food is currently en-route to Section {section.name}! Dispatched by {currentOrder?.dispatchedBy || 'Canteen'}.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 3: Section Supervisor Receiving Verification in Same Modal */}
        {(status === 'sent_to_section' || status === 'received' || status === 'packing' || status === 'shortage_resend_requested' || status === 'remaining_sent') && (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
              <div>
                <h3 className="text-sm font-black text-emerald-950 flex items-center space-x-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>3. Section Supervisor Delivery Receipt & Verification</span>
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  When food arrives at Section {section.name}, verify the count and push confirmation to Canteen.
                </p>
              </div>

              {status === 'received' && (
                <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-800 bg-emerald-200/70 border border-emerald-300 px-3 py-1 rounded-full">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span>Delivery Acknowledged & Verified</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Ordered vs Dispatched */}
              <div className="bg-white p-3 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                  Ordered vs Dispatched
                </span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-lg font-black text-slate-800">
                    {currentOrder?.totalOrderedQty || totalCalculated}
                  </span>
                  <span className="text-xs text-slate-400">ordered</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-lg font-black text-blue-700">
                    {currentOrder?.dispatchedQty ?? currentOrder?.totalOrderedQty ?? totalCalculated}
                  </span>
                  <span className="text-xs text-blue-600 font-bold">sent</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">From Central Canteen</span>
              </div>

              {/* Received Quantity Input */}
              <div className="bg-white p-3 rounded-xl border border-emerald-200">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 block mb-1">
                  Quantity Received at Section *
                </label>
                <input
                  type="number"
                  min="0"
                  value={receivedQtyInput}
                  onChange={(e) => setReceivedQtyInput(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-emerald-50/50 border border-emerald-400 font-black text-lg px-3 py-1 rounded-lg text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <div className="mt-1">
                  {numReceived < expectedDispatchedQty ? (
                    <span className="text-[11px] text-amber-700 font-extrabold flex items-center space-x-1">
                      <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                      <span>Shortage: -{shortageCount} parcels ({numReceived}/{expectedDispatchedQty})</span>
                    </span>
                  ) : numReceived === expectedDispatchedQty ? (
                    <span className="text-[11px] text-emerald-700 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>100% full delivery ({numReceived}/{expectedDispatchedQty})</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-blue-700 font-bold">
                      +{numReceived - expectedDispatchedQty} Extra parcels received
                    </span>
                  )}
                </div>
              </div>

              {/* Receiving Supervisor Name */}
              <div className="bg-white p-3 rounded-xl border border-emerald-200">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 block mb-1">
                  Verified & Received By
                </label>
                <input
                  type="text"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  placeholder="Supervisor name"
                  className="w-full bg-white border border-slate-300 font-bold text-xs px-3 py-2 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Section in-charge supervisor</span>
              </div>
            </div>

            {/* Receiving Remarks */}
            <div>
              <label className="block text-xs font-bold text-emerald-950 mb-1">
                Receiving Notes & Quality Inspection Remarks
              </label>
              <input
                type="text"
                value={receivingRemarks}
                onChange={(e) => setReceivingRemarks(e.target.value)}
                placeholder="e.g. All meal packets hot, sealed and fresh. No shortages or damages."
                className="w-full bg-white border border-emerald-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* SHORTAGE DETECTED: 2 OPTIONS (Update in Canteen vs Re-Send Remaining) */}
            {isShortage && shortageCount > 0 && (
              <div className="bg-amber-50/90 border-2 border-amber-400 rounded-2xl p-4 space-y-3.5 shadow-sm animate-fade-in">
                <div className="flex items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-amber-950 flex items-center space-x-2">
                        <span>Shortage Detected: {shortageCount} Food Parcels Missing / Damaged!</span>
                      </h4>
                      <p className="text-xs text-amber-800 font-medium mt-0.5">
                        Sent from Canteen: <strong>{expectedDispatchedQty}</strong> • Received: <strong>{numReceived}</strong> • Deficit: <strong className="text-rose-700">-{shortageCount} parcels</strong>
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-200 text-amber-900 border border-amber-300 shrink-0">
                    -{shortageCount} Short
                  </span>
                </div>

                {/* Shortage Reason Input & Chips */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 block">
                    Reason for Shortage / Deficit Note
                  </label>
                  <input
                    type="text"
                    value={shortageReason}
                    onChange={(e) => setShortageReason(e.target.value)}
                    placeholder="e.g. Packets damaged during transit, leaked sambar box, or missing from crate..."
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {[
                      'Packets damaged in transit',
                      'Short delivery by driver',
                      'Crushed / unsealed boxes',
                      'Count deficit from kitchen',
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setShortageReason(chip)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                          shortageReason === chip
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white hover:bg-amber-100 text-amber-900 border-amber-200'
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* The Two Resolution Options */}
                <div className="border-t border-amber-200/80 pt-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 block mb-2">
                    Select Shortage Resolution:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option 1: Update Received Quantity in Canteen (Accept Shortage) */}
                    <div className="bg-white p-3.5 rounded-xl border border-amber-200/90 shadow-2xs flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center space-x-1.5 text-slate-900 font-black text-xs">
                          <CheckCircle2 className="h-4 w-4 text-slate-600" />
                          <span>Option 1: Update Received Qty in Canteen</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Accept only <strong>{numReceived} parcels</strong>. Log the shortage of <strong>{shortageCount} parcels</strong> in Canteen records.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleSupervisorAcceptShortage}
                        className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Update Received Qty in Canteen</span>
                      </button>
                    </div>

                    {/* Option 2: Re-Send to Canteen (Send Again Food in Section Remaining Parcels) */}
                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-3.5 rounded-xl border-2 border-orange-400 shadow-2xs flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center space-x-1.5 text-orange-950 font-black text-xs">
                          <RotateCcw className="h-4 w-4 text-orange-600" />
                          <span>Option 2: Re-Send to Canteen (Send Remaining)</span>
                        </div>
                        <p className="text-[11px] text-orange-950 mt-1">
                          Request Canteen to prepare and <strong>send again the remaining {shortageCount} parcels</strong> to Section {section.name}.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleSupervisorRequestReSend}
                        className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-orange-600/20 cursor-pointer active:scale-95 ring-1 ring-orange-300"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-white" />
                        <span>Re-Send: Send Again {shortageCount} Remaining</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Canteen Re-Send In-Progress Alert */}
            {status === 'shortage_resend_requested' && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <RotateCcw className="h-5 w-5 text-orange-600 animate-spin-slow" />
                    <div>
                      <h4 className="text-xs font-black text-orange-950">
                        Canteen Alert: Re-Send Active for {currentOrder?.shortageQty} Remaining Parcels!
                      </h4>
                      <p className="text-[11px] text-orange-800">
                        Section reported {currentOrder?.shortageQty} parcels missing ({currentOrder?.shortageReason}). Canteen is preparing supplementary batch.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-orange-200 text-orange-900 px-2 py-0.5 rounded">
                    Re-Dispatch Active
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-orange-200/80">
                  <span className="text-xs text-orange-900 font-medium">
                    Requested at: <strong>{currentOrder?.reSendRequestedAt || 'Just now'}</strong> by <strong>{currentOrder?.receivedBy}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleCanteenDispatchRemaining}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Truck className="h-4 w-4" />
                    <span>🚚 Canteen: Dispatch Remaining {currentOrder?.shortageQty} Parcels to Section</span>
                  </button>
                </div>
              </div>
            )}

            {/* Remaining Parcels Arrived & Confirm Receipt */}
            {status === 'remaining_sent' && (
              <div className="bg-indigo-50 border-2 border-indigo-300 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Truck className="h-5 w-5 text-indigo-600 animate-bounce" />
                    <div>
                      <h4 className="text-xs font-black text-indigo-950">
                        Remaining {currentOrder?.shortageQty} Parcels Dispatched & Arrived at Section!
                      </h4>
                      <p className="text-[11px] text-indigo-800">
                        Canteen delivery van arrived with the remaining {currentOrder?.shortageQty} parcels. Verify count to complete order.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-indigo-200/80">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-bold text-indigo-950">Remaining Parcels Received:</label>
                    <input
                      type="number"
                      min="0"
                      value={remainingReceivedInput || currentOrder?.shortageQty || 0}
                      onChange={(e) => setRemainingReceivedInput(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-20 bg-white border border-indigo-400 font-black text-sm px-2 py-1 rounded-lg text-indigo-900"
                    />
                    <span className="text-xs text-indigo-700 font-medium">parcels</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSupervisorConfirmRemaining}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center space-x-1.5 shadow-md active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>✓ Confirm Remaining {currentOrder?.shortageQty} Parcels Received (Fulfill 100%)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Submit Receiving Confirmation (Shown when NO active shortage) */}
            {!isShortage && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs text-emerald-800 font-medium">
                  {currentOrder?.receivedAt ? (
                    <span>
                      ✓ Acknowledged receipt on <strong>{currentOrder.receivedAt}</strong> by{' '}
                      <strong>{currentOrder.receivedBy}</strong>
                    </span>
                  ) : (
                    <span>All {numReceived} parcels received without shortage. Confirm count and push to Canteen.</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSupervisorReceive}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {status === 'received'
                      ? '✓ Update Received Quantity in Canteen'
                      : '📥 Push Received in Canteen'}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Section 4: Daily 3-Meal Summary Table for This Section */}
        <div className="border-t border-slate-200 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                <Utensils className="h-3.5 w-3.5 text-blue-600" />
                <span>Today's All Meals Summary for Section {section.name} ({internalDate})</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                3-session daily summary with ordered, dispatched, received count, and shortage status.
              </p>
            </div>

            {/* Export & Convert Options */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleExportImage}
                disabled={isExportingImage}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-black shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="Export high-resolution PNG image of this 3-meal summary"
              >
                <ImageIcon className="h-3.5 w-3.5 text-indigo-600" />
                <span>{isExportingImage ? 'Generating...' : 'Export to Image'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Convert & download/print this summary table as official PDF voucher"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                <span>Convert to PDF</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold">
                <tr>
                  <th className="px-3.5 py-2.5">Meal Session</th>
                  <th className="px-3.5 py-2.5">Time Window</th>
                  <th className="px-3.5 py-2.5">Ordered (P/A/O/X)</th>
                  <th className="px-3.5 py-2.5">Dispatched</th>
                  <th className="px-3.5 py-2.5">Received</th>
                  <th className="px-3.5 py-2.5">Canteen Status</th>
                  <th className="px-3.5 py-2.5 text-right">Switch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(['morning', 'afternoon', 'night'] as MealType[]).map((m) => {
                  const conf = mealConfig[m];
                  const ord = foodOrders.find(
                    (o) => o.sectionId === section.id && o.date === internalDate && o.mealType === m
                  );
                  const isCurrent = activeMeal === m;

                  return (
                    <tr key={m} className={isCurrent ? 'bg-blue-50/50 font-medium' : 'hover:bg-slate-50'}>
                      <td className="px-3.5 py-2.5 font-bold text-slate-900 flex items-center space-x-1.5">
                        <conf.icon className="h-3.5 w-3.5 text-slate-500" />
                        <span>{conf.label}</span>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-500">{conf.time}</td>
                      <td className="px-3.5 py-2.5">
                        {ord ? (
                          <span className="font-bold text-slate-900">
                            {ord.totalOrderedQty} meals{' '}
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({ord.presentCount}/{ord.absentCount}/{ord.outsideWorkersCount}/{ord.othersCount})
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not ordered</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono">
                        {ord?.dispatchedQty !== undefined ? (
                          <span className="font-bold text-blue-700">{ord.dispatchedQty}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono">
                        {ord?.receivedQty !== undefined ? (
                          <span className="font-bold text-emerald-700">{ord.receivedQty}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {getOrderStatusBadge(ord?.status || 'draft', ord?.totalOrderedQty || 0)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setActiveMeal(m)}
                          className={`text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isCurrent ? 'Active' : 'Manage'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
