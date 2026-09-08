"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RoiViewModel } from "@/lib/roi-metrics";
import { useDashboardState } from "@/hooks/useDashboardState";

// Header disclaimer's tooltip: the general explanation of why booking date
// is used at all.
const BOOKING_DATE_TOOLTIP = (
  <>
    We use &quot;Booked On&quot; date because it captures the moment a guest commits, allowing us to tie campaigns, spend, and seasonality
    directly to demand. Stay-date reporting is better suited for financial metrics like revenue recognition and occupancy, but for
    marketing performance, booking date gives a more accurate, real-time signal, especially in markets with longer booking windows.
  </>
);

// Total Revenue and Direct Revenue each need their own explanation, not the
// same paragraph twice, since the interesting part differs per metric (all
// channels vs. owned channel only).
const TOTAL_REVENUE_TOOLTIP = (
  <>
    Total Revenue includes bookings from every channel, direct and third-party (OTAs), counted by the date the guest booked, not the date
    of their stay. That captures the full demand generated in this window, regardless of which channel it came through.
  </>
);

const DIRECT_REVENUE_TOOLTIP = (
  <>Bookings made directly through your own channel (not OTAs) counted by the date they were booked. (See the note above for why we use booking date.)</>
);

/**
 * Small "?" icon + hover/focus tooltip for sitting right next to a stat-card
 * label. The tooltip itself renders through a portal into document.body,
 * since the summary strip card has `overflow: hidden` for its rounded corners,
 * which would otherwise clip a plain absolutely-positioned tooltip popping
 * out of these small cells.
 */
function StatInfoTooltip({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const iconRef = useRef<HTMLSpanElement>(null);

  function open() {
    const rect = iconRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX + rect.width / 2 });
    setShow(true);
  }

  function close() {
    setShow(false);
  }

  return (
    <span
      className="pp-stat-info"
      ref={iconRef}
      tabIndex={0}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
    >
      <span className="pp-stat-info-icon" aria-hidden="true">
        ?
      </span>
      {show &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <span className="pp-stat-tooltip" role="tooltip" style={{ top: pos.top, left: pos.left }}>
            {children}
          </span>,
          document.body
        )}
    </span>
  );
}

export function ExecutiveSummary({ model }: { model: RoiViewModel }) {
  const { executiveSummary: s, clientName, dateRangeLabel } = model;
  const { isAdmin, availableClients, selectedClientSlug } = useDashboardState();
  // Admin-only, matching where else access codes are shown (Sidebar's client
  // dropdown, Super Admin directory): clients don't need to see their own
  // code back at themselves. Small/bracketed so it reads as a quick
  // reference, easy to copy, not a headline element.
  const clientCode = isAdmin ? availableClients.find((c) => c.slug === selectedClientSlug)?.code : undefined;

  return (
    <section id="executive-summary" className="section">
      <header className="pp-header">
        <h1 id="clientNameHeading">
          {clientName}
          {clientCode && (
            <span style={{ fontSize: "0.4em", fontWeight: 500, opacity: 0.5, marginLeft: 10, verticalAlign: "middle" }}>
              ({clientCode})
            </span>
          )}
        </h1>
        <div className="pp-eyebrow" id="dateRangeLabel">
          {dateRangeLabel}
        </div>
        <div className="pp-subtitle">Performance Overview</div>
        <div className="pp-disclaimer">
          <span className="pp-disclaimer-text">
            Booking revenue is measured by booking date rather than stay date, as this provides the most accurate reflection of marketing
            performance.
          </span>
          <span className="pp-disclaimer-info" tabIndex={0}>
            <span className="pp-disclaimer-info-icon" aria-hidden="true">
              ?
            </span>
            <span className="pp-disclaimer-tooltip" role="tooltip">
              {BOOKING_DATE_TOOLTIP}
            </span>
          </span>
        </div>
        <div className="pp-summary-strip">
          <div className="pp-summary-stat">
            <div className="pp-summary-label" id="summaryLabel1">
              Total Revenue
              <StatInfoTooltip>{TOTAL_REVENUE_TOOLTIP}</StatInfoTooltip>
            </div>
            <div className="pp-summary-value" id="summaryNewFollowers">
              {s.summaryNewFollowers}
            </div>
            <div className="pp-summary-note" id="summaryNote1">
              {s.summaryNote1}
            </div>
          </div>
          <div className="pp-summary-stat">
            <div className="pp-summary-label" id="summaryLabel2">
              Direct Revenue
              <StatInfoTooltip>{DIRECT_REVENUE_TOOLTIP}</StatInfoTooltip>
            </div>
            <div className="pp-summary-value" id="summaryTotalImpressions">
              {s.summaryTotalImpressions}
            </div>
            <div className="pp-summary-note" id="summaryNote2">
              {s.summaryNote2}
            </div>
          </div>
          <div className="pp-summary-stat">
            <div className="pp-summary-label" id="summaryLabel3">
              Direct Split
            </div>
            <div className="pp-summary-value" id="summaryTotalRevenue">
              {s.summaryTotalRevenue}
            </div>
            <div className="pp-summary-note" id="summaryNote3">
              {s.summaryNote3}
            </div>
          </div>
          <div className="pp-summary-stat">
            <div className="pp-summary-label" id="summaryLabel4">
              New Leads
            </div>
            <div className="pp-summary-value" id="summaryAvgCostPerLead">
              {s.summaryAvgCostPerLead}
            </div>
            <div className="pp-summary-note" id="summaryAvgCostPerLeadNote">
              {s.summaryAvgCostPerLeadNote}
            </div>
          </div>
          <div className="pp-summary-stat">
            <div className="pp-summary-label" id="summaryLabel5">
              New Followers
            </div>
            <div className="pp-summary-value" id="summaryNewLeads">
              {s.summaryNewLeads}
            </div>
            <div className="pp-summary-note" id="summaryNote5">
              {s.summaryNote5}
            </div>
          </div>
          <div className="pp-summary-stat">
            <div className="pp-summary-label" id="summaryLabel6">
              Views
            </div>
            <div className="pp-summary-value" id="summaryDirectSplitAvg">
              {s.summaryDirectSplitAvg}
            </div>
            <div className="pp-summary-note" id="summaryNote6">
              {s.summaryNote6}
            </div>
          </div>
        </div>
        <div id="statusMessage" className="status-message" />
      </header>
    </section>
  );
}
