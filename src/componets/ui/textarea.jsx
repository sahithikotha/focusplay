import React from 'react';

export function Textarea({ className = '', ...props }) {
  return <textarea className={`w-full border rounded-xl px-3 py-2 text-sm ${className}`} {...props} />;
}
