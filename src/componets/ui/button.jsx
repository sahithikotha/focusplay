import React from 'react';

export function Button({ children, variant = 'default', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-sm';
  const variants = {
    default: 'bg-white',
    secondary: 'bg-slate-100',
    outline: 'bg-transparent',
    ghost: 'bg-transparent border-0',
  };
  const sizes = { sm: 'px-2 py-1 text-sm', md: '', icon: 'p-2 aspect-square' };
  return (
    <button className={`${base} ${variants[variant] || ''} ${sizes[size] || ''} ${className}`} {...props}>
      {children}
    </button>
  );
}
