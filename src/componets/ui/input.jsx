import React from 'react';

export function Input({ className = '', ...props }) {
  return <input className={`w-full border rounded-xl px-3 py-2 text-sm ${className}`} {...props} />;
}
