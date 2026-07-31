"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  // Fixed-position coordinates for the portaled popover — computed from the
  // trigger's own position, since the popover renders into document.body
  // (see the portal below) rather than as a normal descendant.
  const [popoverStyle, setPopoverStyle] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  // Rough height of the popover (year row + 3-row grid + footer + margins) —
  // used only to decide flip direction before the popover has actually
  // rendered/measured itself, so an estimate is fine here.
  const ESTIMATED_POPOVER_HEIGHT = 300;

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
      const target = event.target as Node;
      // The popover is portaled to document.body, so it's no longer a DOM
      // descendant of containerRef — it needs its own containment check or
      // every click inside it would register as "outside" and close it.
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !(popoverRef.current && popoverRef.current.contains(target))
      ) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    // Scrolling (the page, or the sidebar's own internal scroll) would leave
    // a fixed-position popover stranded at stale coordinates — closing on
    // scroll is simpler and safer than continuously repositioning it.
    function handleScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("resize", handleScroll);
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

  function handleToggle() {
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < ESTIMATED_POPOVER_HEIGHT && rect.top > spaceBelow;
      setPopoverStyle(
        openUpward
          ? { bottom: window.innerHeight - rect.top + 6, left: rect.left }
          : { top: rect.bottom + 6, left: rect.left }
      );
    }
    setOpen((prev) => !prev);
  }

  return (
    <div className="month-picker" ref={containerRef}>
      <button
        type="button"
        id={id}
        className="month-picker-trigger"
        onClick={handleToggle}
      >
        {value ? formatDisplay(value) : <span className="month-picker-placeholder">{placeholder}</span>}
      </button>

      {open &&
        popoverStyle &&
        createPortal(
          <div ref={popoverRef} className="month-picker-popover" style={{ position: "fixed", ...popoverStyle }}>
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
          </div>,
          document.body
        )}
    </div>
  );
}
