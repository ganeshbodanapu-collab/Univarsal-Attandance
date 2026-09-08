import React, { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
}) => {
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBox: 'bg-red-50 text-red-600 ring-1 ring-red-500/20',
          btnPrimary: 'bg-red-600 hover:bg-red-700 text-white shadow-xs focus:ring-red-500/30',
        };
      case 'primary':
        return {
          iconBox: 'bg-blue-50 text-blue-600 ring-1 ring-blue-500/20',
          btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs focus:ring-blue-500/30',
        };
      case 'warning':
      default:
        return {
          iconBox: 'bg-amber-50 text-amber-600 ring-1 ring-amber-500/20',
          btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs focus:ring-blue-500/30',
        };
    }
  };

  const { iconBox, btnPrimary } = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-backdrop-fade transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Box */}
      <div
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-slate-950/20 border border-slate-200/80 z-10 animate-sheet-slide-up sm:animate-modal-enter overflow-hidden"
        role="alertdialog"
        aria-modal="true"
      >
        {/* Mobile Swipe handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-slate-300" />
        </div>

        <div className="p-6 sm:p-6 pb-4">
          <div className="flex items-start space-x-4">
            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${iconBox}`}>
              <AlertCircle className="h-6 w-6" />
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors -mr-1"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-xs focus:outline-none focus:ring-2 active:scale-[0.98] ${btnPrimary}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
export default ConfirmDialog;
