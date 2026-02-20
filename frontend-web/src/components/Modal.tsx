import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
}

export default function Modal({ 
  open, 
  title, 
  onClose, 
  children, 
  footer,
  size = 'md',
  closeOnBackdrop = true,
}: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
        onClick={() => closeOnBackdrop && onClose()} 
      />
      
      {/* Modal */}
      <div className={`relative w-full ${sizeClasses[size]} bg-white rounded-2xl shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden`}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-700"
              aria-label="Fermer la fenêtre"
            >
              <X size={24} />
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="border-t border-neutral-200 bg-neutral-50 px-6 py-4 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
