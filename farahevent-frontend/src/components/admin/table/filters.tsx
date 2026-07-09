'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

/** Champ de recherche débouncé (350 ms). */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  // Resync si la valeur externe change (ex. réinitialisation des filtres).
  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (local !== valueRef.current) onChangeRef.current(local);
    }, 350);
    return () => clearTimeout(id);
  }, [local]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-ring/40 sm:w-64"
      />
    </div>
  );
}

/** Filtre déroulant (select natif) avec une option « tous ». */
export function SelectFilter({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  allLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring/40"
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
