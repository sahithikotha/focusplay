import React from 'react';

export function Badge({ className = '', children, ...props }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${className}`} {...props}>
      {children}
    </span>
  );
}
