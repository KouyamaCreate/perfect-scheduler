'use client';

import React, { useMemo, useState } from 'react';

type Props = {
  value: string; // YYYY-MM-DD or ''
  onChange: (v: string) => void;
  ariaLabel?: string;
};

function toDate(value: string | null | undefined): Date {
  if (!value) return new Date();
  const [y, m, d] = value.split('-').map((v) => parseInt(v, 10));
  if (!y || !m || !d) return new Date();
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return new Date();
  return dt;
}

function fmt(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const InlineCalendar: React.FC<Props> = ({ value, onChange, ariaLabel }) => {
  const initial = toDate(value);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth()); // 0-based

  const todayStr = useMemo(() => fmt(new Date()), []);
  const selectedStr = value || '';

  const { weeks, monthLabel } = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startDay = first.getDay(); // 0-6
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(viewYear, viewMonth, d));
    }
    while (days.length % 7 !== 0) days.push(null);

    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

    const monthLabel = `${viewYear}年 ${viewMonth + 1}月`;
    return { weeks, monthLabel };
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    const m = viewMonth - 1;
    if (m < 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth(m);
    }
  };

  const nextMonth = () => {
    const m = viewMonth + 1;
    if (m > 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth(m);
    }
  };

  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="border border-[var(--border)] rounded-md p-3 bg-[var(--background)]" aria-label={ariaLabel}>
      <div className="flex items-center justify-between mb-2">
        <button type="button" className="px-2 py-1 text-sm hover:text-[var(--primary)]" onClick={prevMonth} aria-label="前の月">
          ‹
        </button>
        <div className="text-sm font-medium">{monthLabel}</div>
        <button type="button" className="px-2 py-1 text-sm hover:text-[var(--primary)]" onClick={nextMonth} aria-label="次の月">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1">
        {weekdays.map((w) => (
          <div key={w} className="font-medium opacity-70">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weeks.flat().map((d, idx) => {
          if (!d) return <div key={idx} className="h-8" />;
          const dateStr = fmt(d);
          const isToday = dateStr === todayStr;
          const isSelected = selectedStr === dateStr;
          return (
            <button
              type="button"
              key={dateStr}
              onClick={() => onChange(dateStr)}
              className={`h-8 rounded text-sm transition border border-transparent
                ${isSelected ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'hover:bg-[var(--secondary)]'}
                ${isToday && !isSelected ? 'border-[var(--primary)]' : ''}
              `}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

