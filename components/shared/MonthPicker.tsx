"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDisplay(value: string): string {
  if (!value) return "";
  const [year, month] = value.split("-").map(Number);
  return `${MONTH_LABELS[month - 1]} ${year}`;
}

/**
 * A custom month picker matching the native browser month-grid look (year
 * header, 4x3 month grid, Clear/This month footer), but only allowing
 * selection of months present in `availableMonths` — native <input
 * type="month"> only supports a single contiguous min/max range and can't
 * gray out specific months in the middle, which is what's needed here.
 */
export function MonthPicker({
  id,
  value,
  onChange,
  availableMonths,
  placeholder = "Select month",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  availableMonths: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const availableSet = useMemo(() => new Set(availableMonths), [availableMonths]);
  const availableYears = useMemo(() => {
    const years = new Set(availableMonths.map((m) => Number(m.split("-")[0])));
    return Array.from(years).sort((a, b) => a - b);
  }, [availableMonths]);

  const currentYear = new Date().getFullYear();
  const initialYear = value ? Number(value.split("-")[0]) : availableYears[availableYears.length - 1] || currentYear;
  const [displayYear, setDisplayYear] = useState(initialYear);

  useEffect(() => {
    if (value) setDisplayYear(Number(value.split("-")[0]));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function selectMonth(month: number) {
    const key = `${displayYear}-${pad(month)}`;
    if (!availableSet.has(key)) return;
    onChange(key);
    setOpen(false);
  }

  function handleClear() {
    onChange("");
    setOpen(false);
  }

  function handleThisMonth() {
    const now = new Date();
    setDisplayYear(now.getFullYear());
    const key = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    if (availableSet.has(key)) {
      onChange(key);
      setOpen(false);
    }
  }

  return (
    <div className="month-picker" ref={containerRef}>
      <button
        type="button"
        id={id}
        className="month-picker-trigger"
        onClick={() => setOpen((prev) => !prev)}
      >
        {value ? formatDisplay(value) : <span className="month-picker-placeholder">{placeholder}</span>}
      </button>

      {open && (
        <div className="month-picker-popover">
          <div className="month-picker-year-row">
            <button type="button" className="month-picker-nav" onClick={() => setDisplayYear((y) => y - 1)} aria-label="Previous year">
              ‹
            </button>
            <span className="month-picker-year">{displayYear}</span>
            <button type="button" className="month-picker-nav" onClick={() => setDisplayYear((y) => y + 1)} aria-label="Next year">
              ›
            </button>
          </div>
          <div className="month-picker-grid">
            {MONTH_LABELS.map((label, index) => {
              const month = index + 1;
              const key = `${displayYear}-${pad(month)}`;
              const isAvailable = availableSet.has(key);
              const isSelected = value === key;
              return (
                <button
                  key={label}
                  type="button"
                  className={`month-picker-cell${isSelected ? " selected" : ""}${!isAvailable ? " disabled" : ""}`}
                  disabled={!isAvailable}
                  onClick={() => selectMonth(month)}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="month-picker-footer">
            <button type="button" className="month-picker-link" onClick={handleClear}>
              Clear
            </button>
            <button type="button" className="month-picker-link" onClick={handleThisMonth}>
              This month
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
