import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  closeOnEsc?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'md',
  closeOnEsc = true,
  closeOnBackdrop = true,
  className = '',
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle Escape key press
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  // Size mapping for tablet and desktop
  const sizeClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
    '2xl': 'sm:max-w-5xl',
    full: 'sm:max-w-[94vw]',
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
      {/* Backdrop with modern blur */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-backdrop-fade transition-opacity"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Card wrapper: Bottom Sheet on Mobile, Centered Dialog on Tablet/Desktop */}
      <div
        className={`relative w-full ${sizeClasses} bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-slate-950/20 border border-slate-200/80 flex flex-col max-h-[92vh] sm:max-h-[88vh] z-10 animate-sheet-slide-up sm:animate-modal-enter ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Swipe / Drag Indicator Bar */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab">
          <div className="w-12 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-4 sm:py-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center space-x-3.5 min-w-0 pr-4">
            {icon && (
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/20 flex items-center justify-center flex-shrink-0 shadow-xs">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5 leading-normal truncate sm:whitespace-normal">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/30 flex-shrink-0 -mr-1"
            title="Close (Esc)"
            aria-label="Close dialog"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto px-6 py-5 flex-1 scrollbar-thin">
          {children}
        </div>

        {/* Optional Modal Footer Slot */}
        {footer && (
          <div className="px-6 py-3.5 sm:py-4 bg-slate-50/80 border-t border-slate-100 rounded-b-2xl flex-shrink-0 flex items-center justify-end space-x-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
export default Modal;
