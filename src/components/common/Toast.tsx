import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type: 'success' | 'warning' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: {
      bg: 'bg-green-50 border-green-200',
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      text: 'text-green-800',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200',
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      text: 'text-amber-800',
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      text: 'text-red-800',
    },
  }[type];

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center p-4 border rounded-lg shadow-lg max-w-sm transition-all duration-300 ${config.bg}`}>
      <div className="flex-shrink-0">{config.icon}</div>
      <div className={`ml-3 mr-8 text-sm font-medium ${config.text}`}>{message}</div>
      <button
        onClick={onClose}
        className="ml-auto -mx-1.5 -my-1.5 p-1.5 inline-flex h-8 w-8 rounded-md hover:bg-black hover:bg-opacity-5 focus:outline-none"
      >
        <span className="sr-only">Close</span>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
