import React from 'react';

export function Switch({ checked, onCheckedChange, className = '', ...props }) {
  return (
    <input
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={className}
      {...props}
    />
  );
}
