import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAttendanceContext } from '../../context/AttendanceContext';
import {
  LayoutDashboard,
  MapPin,
  Utensils,
  DollarSign,
  Coins,
  BarChart3,
  Settings,
  X,
  Building2,
  Shield,
  LogOut,
  BookOpen,
  ArrowRightLeft,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavGroup {
  label: string;
  items: Array<{
    name: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser, logout } = useAttendanceContext();

  const navGroups: NavGroup[] = [
    {
      label: 'OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'WORKFORCE & FIELD',
      items: [
        { name: 'Sites', path: '/sites', icon: MapPin },
        { name: 'Multiple Sites Employees', path: '/multi-site-employees', icon: ArrowRightLeft },
        ...(currentUser?.role === 'admin'
          ? [{ name: 'Opening Employees', path: '/opening-employees', icon: BookOpen }]
          : []),
      ],
    },
    {
      label: 'FOOD & WELFARE',
      items: [
        { name: 'Food Management', path: '/food', icon: Utensils },
      ],
    },
    {
      label: 'FINANCE & PAYROLL',
      items: [
        { name: 'Advance Payments and Status', path: '/advances', icon: DollarSign },
        { name: 'Referrers & Agents', path: '/referrers', icon: Coins },
      ],
    },
    {
      label: 'INSIGHTS & SYSTEM',
      items: [
        { name: 'Reports', path: '/reports', icon: BarChart3 },
        { name: 'Settings', path: '/settings', icon: Settings },
      ],
    },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/80">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 flex-shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="font-extrabold text-slate-900 text-base tracking-tight leading-tight block truncate">
              Univarsal Attandance
            </span>
            <span className="text-[10px] font-bold text-blue-600 tracking-wider uppercase block leading-tight mt-0.5">
              Workforce System
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Categorized Nav Menu */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => {
                    if (window.innerWidth < 768) onClose();
                  }}
                  className={({ isActive }) =>
                    `flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-600/20'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={`h-4.5 w-4.5 mr-3 flex-shrink-0 transition-colors ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-400 group-hover:text-blue-600'
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>



      {/* User profile card pinned at bottom */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
        <div className="flex items-center space-x-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-sm font-bold shadow-xs">
              {currentUser ? getInitials(currentUser.name) : 'U'}
            </div>
            {/* Online indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate leading-snug">
              {currentUser?.name || 'User'}
            </p>
            <div className="flex items-center space-x-1 mt-0.5">
              <Shield className="h-3 w-3 text-blue-600 flex-shrink-0" />
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight truncate">
                {currentUser?.role === 'admin'
                  ? 'System Admin'
                  : currentUser
                  ? `Supervisor (${currentUser.assignedSiteId})`
                  : 'Portal'}
              </span>
            </div>
          </div>

          {/* Switch Site button */}
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            title="Switch Site / Logout"
            aria-label="Switch Site"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity md:hidden animate-backdrop-fade"
          onClick={onClose}
        />
      )}

      {/* Desktop Sidebar Layout */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 shadow-xs">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Slide-out Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 transform transition-transform duration-300 ease-out md:hidden ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

    </>
  );
};
export default Sidebar;
