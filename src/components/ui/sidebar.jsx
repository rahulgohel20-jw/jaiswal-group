'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const SidebarModal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'xl',
  headerActions,
  className,
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const widthClasses = {
    sm: 'w-full max-w-sm',
    md: 'w-full max-w-md',
    lg: 'w-full max-w-lg',
    xl: 'w-full max-w-xl',
    '2xl': 'w-full max-w-2xl',
    full: 'w-full',
  };

  // Don't render anything if not open
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with fade animation */}
      <div
        className="fixed inset-0 backdrop-blur-[3px] z-50 animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Modal with slide animation and spacing */}
      <div
        className={cn(
          'fixed right-4 top-4 bottom-4 bg-background z-50 shadow-2xl rounded-lg',
          'animate-in slide-in-from-right duration-300',
          widthClasses[width] || widthClasses.md,
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="h-full flex flex-col rounded-lg overflow-hidden">
          {/* Header with improved spacing */}
          <div className="flex items-start justify-between px-6 py-5 border-b shrink-0 bg-muted/30">
            <div className="flex-1 min-w-0 pr-4">
              {title && (
                <h2 className="text-lg font-semibold tracking-tight truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate mt-1.5">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg hover:bg-muted transition-colors"
                onClick={onClose}
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content with improved padding and scrolling */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="animate-in fade-in-50 duration-300">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SidebarModal;
