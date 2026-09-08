import React, { useState, useEffect } from 'react';
import { useAttendanceContext } from '../../context/AttendanceContext';
import { StatCard } from '../../components/common/StatCard';
import { Toast } from '../../components/common/Toast';
import { SectionFoodOrderModal } from '../../components/food/SectionFoodOrderModal';
import type { Section, MealType } from '../../types';
import {
  Utensils,
  Layers,
  Sunrise,
  Sun,
  Moon,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  Search,
  RotateCcw,
  FileText,
  Image as ImageIcon,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  exportSectionMealSummaryAsImage,
  exportSectionMealSummaryAsPDF,
} from '../../utils/exportMealSummary';

export const Food: React.FC = () => {
  const {
    workers,
    attendance,
    sites,
    sections,
    currentUser,
    foodOrders,
  } = useAttendanceContext();

  // Filters State: Date, Section, Section Search, Inactive, and Pipeline Status
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]); // default to today
  const [filterSection, setFilterSection] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchSectionQuery, setSearchSectionQuery] = useState('');
  const [filterOrderStatus, setFilterOrderStatus] = useState<string>('all');

  // Supervisor site scoping (background enforcement)
  const supervisorSiteId = currentUser?.role === 'supervisor' ? currentUser?.assignedSiteId || '' : '';

  // Section Food Order Modal State
  const [selectedSectionForFood, setSelectedSectionForFood] = useState<Section | null>(null);
  const [showFoodOrderModal, setShowFoodOrderModal] = useState(false);
  const [modalMealType, setModalMealType] = useState<MealType>('afternoon');

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reset section filter if user switches
  useEffect(() => {
    setFilterSection('');
  }, [currentUser]);

  // Active Sections scoped by supervisor site and active status
  const activeSections = sections.filter((sec) => {
    const siteMatch = !supervisorSiteId || sec.siteId === supervisorSiteId;
    const statusMatch = includeInactive || sec.status === 'active';
    return siteMatch && statusMatch;
  });

  // Filter dropdown options based on Active status & "Include Inactive"
  const sectionOptions = activeSections.map((sec) => {
    const site = sites.find((s) => s.id === sec.siteId);
    return {
      value: sec.id,
      label: supervisorSiteId ? sec.name : `${sec.name} (${site?.name || sec.code})`,
    };
  });

  // Section Orders Pipeline Calculations
  const relevantSectionIds = new Set(activeSections.map((s) => s.id));
  const relevantOrders = foodOrders.filter(
    (o) => o.date === filterDate && relevantSectionIds.has(o.sectionId)
  );

  const totalMealsOrderedToday = relevantOrders.reduce((sum, o) => sum + o.totalOrderedQty, 0);
  const ordersInPacking = relevantOrders.filter((o) => o.status === 'packing').length;
  const ordersDispatched = relevantOrders.filter((o) => o.status === 'sent_to_section').length;
  const ordersReceived = relevantOrders.filter((o) => o.status === 'received').length;

  const packingSectionsCount = activeSections.filter((sec) =>
    foodOrders.some((o) => o.sectionId === sec.id && o.date === filterDate && o.status === 'packing')
  ).length;

  const sentSectionsCount = activeSections.filter((sec) =>
    foodOrders.some((o) => o.sectionId === sec.id && o.date === filterDate && o.status === 'sent_to_section')
  ).length;

  const receivedSectionsCount = activeSections.filter((sec) =>
    foodOrders.some((o) => o.sectionId === sec.id && o.date === filterDate && o.status === 'received')
  ).length;

  const todayDefault = new Date().toISOString().split('T')[0];
  const isFiltered = Boolean(
    filterDate !== todayDefault ||
    filterSection ||
    includeInactive ||
    searchSectionQuery.trim() ||
    filterOrderStatus !== 'all'
  );

  const handleResetFilters = () => {
    setFilterDate(new Date().toISOString().split('T')[0]);
    setFilterSection('');
    setIncludeInactive(false);
    setSearchSectionQuery('');
    setFilterOrderStatus('all');
  };

  const filteredSectionsForOrders = activeSections.filter((sec) => {
    if (filterSection && sec.id !== filterSection) return false;
    if (filterOrderStatus !== 'all') {
      const match = foodOrders.some(
        (o) => o.sectionId === sec.id && o.date === filterDate && o.status === filterOrderStatus
      );
      if (!match) return false;
    }
    if (!searchSectionQuery.trim()) return true;
    const q = searchSectionQuery.toLowerCase();
    return (
      sec.name.toLowerCase().includes(q) ||
      sec.code.toLowerCase().includes(q) ||
      sec.inCharge.toLowerCase().includes(q)
    );
  });

  const handleOpenSectionFood = (sec: Section, meal: MealType = 'afternoon') => {
    setSelectedSectionForFood(sec);
    setModalMealType(meal);
    setShowFoodOrderModal(true);
  };

  const renderMealStatusPill = (sec: Section, meal: MealType) => {
    const ord = foodOrders.find(
      (o) => o.sectionId === sec.id && o.date === filterDate && o.mealType === meal
    );

    if (!ord) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenSectionFood(sec, meal);
          }}
          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
          title="Not ordered yet. Click to indent food."
        >
          <span>Draft • Indent</span>
        </button>
      );
    }

    const config = {
      received: {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100',
        icon: CheckCircle2,
        label: `Received (${ord.receivedQty ?? ord.totalOrderedQty})`,
      },
      sent_to_section: {
        bg: 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100',
        icon: Truck,
        label: `Sent (${ord.dispatchedQty ?? ord.totalOrderedQty})`,
      },
      packing: {
        bg: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
        icon: Package,
        label: `Packing (${ord.totalOrderedQty})`,
      },
      pushed_to_canteen: {
        bg: 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100',
        icon: Clock,
        label: `Pushed (${ord.totalOrderedQty})`,
      },
      shortage_resend_requested: {
        bg: 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100',
        icon: RotateCcw,
        label: `Shortage Re-Send (${ord.shortageQty || 'Active'})`,
      },
      remaining_sent: {
        bg: 'bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100',
        icon: Truck,
        label: `Remaining Sent (${ord.shortageQty || 'Dispatched'})`,
      },
      draft: {
        bg: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
        icon: Clock,
        label: `Draft (${ord.totalOrderedQty})`,
      },
    }[ord.status] || {
      bg: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
      icon: Clock,
      label: `${ord.status} (${ord.totalOrderedQty})`,
    };

    const Icon = config.icon;

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleOpenSectionFood(sec, meal);
        }}
        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${config.bg}`}
        title="Click to view & update canteen/receiving status"
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate">{config.label}</span>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Food Management</h1>
          <p className="text-sm text-gray-500">
            Section-wise meal indents, automated attendance quantities, and central canteen dispatch pipeline.
          </p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
        <StatCard
          title="Total Meals Indented"
          value={`${totalMealsOrderedToday} meals`}
          icon={<Utensils className="h-5 w-5 text-blue-600" />}
          description={`Today (${filterDate}) across all sessions`}
        />
        <StatCard
          title="Kitchen Packing"
          value={`${ordersInPacking} indents`}
          icon={<Package className="h-5 w-5 text-amber-600" />}
          description="Being packed in hot boxes"
        />
        <StatCard
          title="Sent to Sections"
          value={`${ordersDispatched} orders`}
          icon={<Truck className="h-5 w-5 text-blue-600 animate-pulse" />}
          description="En-route via site vehicles"
        />
        <StatCard
          title="Received & Verified"
          value={`${ordersReceived} sessions`}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          description="Confirmed by supervisors"
        />
      </div>

      {/* =========================================================================
          CLEAR VIEW ONLY FILTERS TAB
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4 print:hidden">
        {/* Top Header of Filters Tab */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Clear View Filters
                </h3>
                {isFiltered && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                    Filtered ({filteredSectionsForOrders.length} of {activeSections.length} sections)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Filter section meal orders and delivery receipts by date, operational section, and search query.
              </p>
            </div>
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="self-start sm:self-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl inline-flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear View / Reset Filters</span>
            </button>
          )}
        </div>

        {/* Quick Pipeline Status Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex-shrink-0">
            Pipeline Tab:
          </span>
          {[
            { id: 'all', label: 'All Sections', count: activeSections.length },
            { id: 'packing', label: 'Kitchen Packing', count: packingSectionsCount },
            { id: 'sent_to_section', label: 'Sent to Section', count: sentSectionsCount },
            { id: 'received', label: 'Received & Verified', count: receivedSectionsCount },
          ].map((tab) => {
            const isActive = filterOrderStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterOrderStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center space-x-1.5 flex-shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Controls Grid: Date, Section, Search Section, Include Inactive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* 1. Date */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Date
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all cursor-pointer"
            />
          </div>

          {/* 2. Section */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Section
            </label>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all cursor-pointer"
            >
              <option value="">All Sections</option>
              {sectionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Search Section */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Search Section
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search section, code, in-charge..."
                value={searchSectionQuery}
                onChange={(e) => setSearchSectionQuery(e.target.value)}
                className="w-full pl-9 pr-7 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all"
              />
              {searchSectionQuery && (
                <button
                  type="button"
                  onClick={() => setSearchSectionQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 4. Include Inactive Sections */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Section Status
            </label>
            <label className="flex items-center space-x-2.5 px-3 py-2 bg-slate-50/70 hover:bg-white border border-slate-200 rounded-xl cursor-pointer transition-all h-[38px]">
              <input
                type="checkbox"
                id="includeInactive"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700 select-none">
                Include Inactive Sections
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Section Directory Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            <span>Work Sections Meal Indent & Canteen Dispatch</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any section to auto-calculate Morning, Afternoon, and Night food from attendance, push to canteen, and verify delivery receipt in the same modal.
          </p>
        </div>
      </div>

      {/* Section Cards Grid */}
      {filteredSectionsForOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 print:hidden">
          <Utensils className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-700">No sections found</p>
          <p className="text-xs text-slate-400 mt-1">Try changing the search filter or section filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:hidden">
          {filteredSectionsForOrders.map((sec) => {
            const parentSite = sites.find((s) => s.id === sec.siteId);
            const secWorkers = workers.filter((w) => w.currentSectionId === sec.id);
            const activeSecWorkers = secWorkers.filter((w) => w.status === 'active');
            const secWorkerIds = new Set(secWorkers.map((w) => w.id));

            const dateAtt = attendance.filter(
              (a) => a.date === filterDate && secWorkerIds.has(a.workerId)
            );
            const secPresent = dateAtt.filter((a) => a.status === 'present' || a.status === 'halfDay').length;
            const secOutside = activeSecWorkers.filter((w) => w.workerType === 'outside').length;

            return (
              <div
                key={sec.id}
                onClick={() => handleOpenSectionFood(sec, 'afternoon')}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all p-4 flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  {/* Top row: Section Name, Code, and Site */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                          {sec.code}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 truncate max-w-[130px]">
                          {parentSite?.name || sec.siteId}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 mt-1 group-hover:text-blue-600 transition-colors">
                        {sec.name}
                      </h3>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Supervisor: <strong>{sec.inCharge}</strong> ({sec.mobile})
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Deployed</span>
                      <span className="text-xs font-bold text-slate-800">{secWorkers.length} Staff</span>
                    </div>
                  </div>

                  {/* Headcount pill summary */}
                  <div className="flex items-center space-x-2 mt-3 text-[11px] font-semibold text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-emerald-700 font-bold">{secPresent} Present</span>
                    <span>•</span>
                    <span className="text-purple-700 font-bold">{secOutside} Outside</span>
                    <span>•</span>
                    <span className="text-slate-500">{activeSecWorkers.length} Active</span>
                  </div>

                  {/* 3 Meal Rows */}
                  <div className="mt-3 space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-semibold flex items-center space-x-1.5">
                        <Sunrise className="h-3.5 w-3.5 text-amber-500" />
                        <span>Morning</span>
                      </span>
                      {renderMealStatusPill(sec, 'morning')}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-semibold flex items-center space-x-1.5">
                        <Sun className="h-3.5 w-3.5 text-blue-500" />
                        <span>Afternoon</span>
                      </span>
                      {renderMealStatusPill(sec, 'afternoon')}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-semibold flex items-center space-x-1.5">
                        <Moon className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Night</span>
                      </span>
                      {renderMealStatusPill(sec, 'night')}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-blue-600 font-bold group-hover:underline truncate">
                    Manage Food & Canteen →
                  </span>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await exportSectionMealSummaryAsImage({
                          section: sec,
                          siteName: parentSite?.name || 'Project Site',
                          date: filterDate,
                          foodOrders,
                        });
                        setToastMessage(`🖼️ Exported meal summary image for Section ${sec.name}`);
                      }}
                      className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all cursor-pointer"
                      title="Export Meal Summary as PNG Image"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportSectionMealSummaryAsPDF({
                          section: sec,
                          siteName: parentSite?.name || 'Project Site',
                          date: filterDate,
                          foodOrders,
                        });
                        setToastMessage(`📄 Opening PDF voucher for Section ${sec.name}`);
                      }}
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all cursor-pointer"
                      title="Convert & Download / Print as PDF"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSectionFood(sec, 'afternoon');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs flex items-center space-x-1 transition-all shadow-xs cursor-pointer"
                    >
                      <Utensils className="h-3.5 w-3.5" />
                      <span>Open Indent</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Section Food Order & Canteen Pipeline Modal */}
      {showFoodOrderModal && selectedSectionForFood && (
        <SectionFoodOrderModal
          isOpen={showFoodOrderModal}
          onClose={() => setShowFoodOrderModal(false)}
          section={selectedSectionForFood}
          site={sites.find((s) => s.id === selectedSectionForFood.siteId) || null}
          selectedDate={filterDate}
          onDateChange={(newD) => setFilterDate(newD)}
          initialMealType={modalMealType}
          onSuccessToast={(msg) => setToastMessage(msg)}
        />
      )}

      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default Food;
