'use client';

import { useEffect, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: ReactNode;
  footer?: ReactNode;
}

const maxWidthClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export function Modal({ open, onClose, title, maxWidth = 'lg', children, footer }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[color:rgba(30,2,39,0.5)]"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`relative bg-[var(--color-card)] text-[var(--color-card-foreground)] rounded-lg shadow-xl w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] overflow-y-auto`}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between p-6 pb-0">
                <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-[var(--color-muted-foreground)]" />
                </button>
              </div>
            )}
            {/* Body */}
            <div className="p-6">{children}</div>
            {/* Footer */}
            {footer && (
              <div className="px-6 pb-6 flex justify-end gap-3">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
