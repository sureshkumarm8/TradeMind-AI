
import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { NotificationType } from '../types';

interface ToastProps {
  notification: { message: string, type: NotificationType } | null;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto dismiss after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const getIcon = () => {
      switch(notification.type) {
          case 'success': return <CheckCircle2 className="text-emerald-400" size={20}/>;
          case 'error': return <AlertCircle className="text-red-400" size={20}/>;
          case 'info': return <Info className="text-blue-400" size={20}/>;
      }
  };

  const getBorderColor = () => {
      switch(notification.type) {
          case 'success': return 'border-emerald-500/50';
          case 'error': return 'border-red-500/50';
          case 'info': return 'border-blue-500/50';
      }
  };

  return (
    <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-4 bg-slate-900/90 backdrop-blur-md border ${getBorderColor()} rounded-xl shadow-2xl animate-fade-in-up min-w-[300px]`}>
        {getIcon()}
        <span className="text-sm font-bold text-white flex-1">{notification.message}</span>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition">
            <X size={16}/>
        </button>
    </div>
  );
};

export default Toast;
