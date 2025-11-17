import React from 'react';

export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
      onClick={() => onOpenChange?.(false)}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ className = '', ...props }) {
  return <div className={`p-4 ${className}`} {...props} />;
}
export function DialogHeader({ className = '', ...props }) {
  return <div className={`p-4 pb-0 ${className}`} {...props} />;
}
export function DialogTitle({ className = '', ...props }) {
  return <h3 className={`text-lg font-semibold ${className}`} {...props} />;
}
export function DialogDescription({ className = '', ...props }) {
  return <p className={`text-sm text-slate-600 ${className}`} {...props} />;
}
export function DialogFooter({ className = '', ...props }) {
  return <div className={`p-4 pt-0 flex justify-end gap-2 ${className}`} {...props} />;
}
