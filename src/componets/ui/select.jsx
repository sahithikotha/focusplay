import React from 'react';

export function Select({ value, onValueChange, className = '', children }) {
  // Collect all <SelectItem> children (even if nested).
  const items = [];
  const collect = (kids) => {
    React.Children.forEach(kids, (c) => {
      if (!c) return;
      if (c.type && c.type.displayName === 'SelectItem') items.push(c);
      if (c.props && c.props.children) collect(c.props.children);
    });
  };
  collect(children);

  return (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      className={`border rounded-xl px-3 py-2 text-sm ${className}`}
    >
      {items.map((it, i) => (
        <option key={i} value={it.props.value}>
          {it.props.children}
        </option>
      ))}
    </select>
  );
}

// These are structural in your JSX; we don't render extra UI for them.
export function SelectTrigger({ children }) { return <>{children}</>; }
export function SelectValue() { return null; }
export function SelectContent({ children }) { return <>{children}</>; }

export function SelectItem({ value, children }) { return <option value={value}>{children}</option>; }
SelectItem.displayName = 'SelectItem';
