import React from 'react';

export function Progress({ value = 0, className = '', ...props }) {
  return (
    <div className={`h-2 w-full bg-gray-200 rounded-full overflow-hidden ${className}`} {...props}>
      <div className="h-full bg-sky-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
