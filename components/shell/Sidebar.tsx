"use client";

import { useMemo, useState } from "react";
import { logout } from "@/app/dashboard/actions";
import { useDashboardDispatch, useDashboardState } from "@/hooks/useDashboardState";
import { useDashboardData } from "@/hooks/useDashboardData";
import { isPricingToolClient } from "@/lib/client-slug";
import { formatMonthKey } from "@/lib/format";
import { getAllMonthKeys } from "@/lib/roi-model";
import { MonthPicker } from "@/components/shared/MonthPicker";

export function Sidebar({ mobileOpen, onNavigate }: { mobileOpen: boolean; onNavigate: () => void }) {
  const state = useDashboardState();
  const dispatch = useDashboardDispatch();
  const { workbook } = useDashboardData();

  const availableMonths = useMemo(
    () => getAllMonthKeys(workbook, state.pendingClientSlug),
    [workbook, state.pendingClientSlug]
  );

  // Ported from handleNavClick() in dashboard.js: nav-link "active" state is
  // set on click (which link the user chose), not derived from scroll
  // position — there is no scroll-spy in the original.
  const [activeRoiHash, setActiveRoiHash] = useState("#executive-summary");
  const [activeMetaHash, setActiveMetaHash] = useState("#meta-portfolio");

  const showPricingTab = isPricingToolClient(state.selectedClientSlug);
  const dashboardTitle =
    state.activeView === "meta" ? "Meta Ads Dashboard" : state.activeView === "pricing" ? "Pricing Tool" : "Performance Dashboard";

  function handleNavClick(event: React.MouseEvent<HTMLAnchorElement>, hash: string, setActiveHash: (hash: string) => void) {
    const target = document.querySelector(hash);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveHash(hash);
    onNavigate();
  }

  function handleSegmentClick(view: "roi" | "meta" | "pricing") {
    dispatch({ type: "SET_VIEW", view });
    onNavigate();
  }

  return (
    <aside className={`sidebar${mobileOpen ? " is-open" : ""}`} id="sidebarPanel">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sidebar-brand-image" src="/assets/logo.png" alt="HiddenGem Media logo" />
        </div>
        <div className="sidebar-kicker" id="sidebarDashboardTitle">
          {dashboardTitle}
        </div>
        <div className="sidebar-current-month" id="sidebarCurrentMonth">
          {formatMonthKey(state.selectedMonth)}
        </div>
        <div className="sidebar-controls">
          <div
            className="sidebar-field sidebar-field-client"
            aria-hidden={!state.isAdmin}
            style={{ display: state.isAdmin ? "block" : "none" }}
          >
            <label htmlFor="clientSelect">Client</label>
            <div className="sidebar-control-shell">
              <select
                className="sidebar-select"
                id="clientSelect"
                value={state.pendingClientSlug}
                onChange={(event) => dispatch({ type: "SET_PENDING_CLIENT", slug: event.target.value })}
              >
                {state.availableClients.map((client) => (
                  <option key={client.slug} value={client.slug}>
                    {client.code ? `${client.name} (${client.code})` : client.name}
                  </option>
                ))}
              </select>
              <span className="sidebar-control-icon chevron" aria-hidden="true" />
            </div>
          </div>
          <div className="sidebar-field">
            <label htmlFor="monthInput">Month</label>
            <div className="sidebar-control-shell">
              <MonthPicker
                id="monthInput"
                value={state.pendingMonth}
                onChange={(month) => dispatch({ type: "SET_PENDING_MONTH", month })}
                availableMonths={availableMonths}
              />
              <span className="sidebar-control-icon calendar" aria-hidden="true" />
            </div>
          </div>
          <div className="sidebar-actions">
            <button
              className="sidebar-button primary"
              id="applyFilterBtn"
              type="button"
              onClick={() => dispatch({ type: "APPLY_FILTER" })}
            >
              Load Dashboard
            </button>
          </div>
        </div>
      </div>
      <div className="sidebar-modules-label">Modules</div>
      <div className="sidebar-segment-switcher">
        <button
          className={`segment-link${state.activeView === "roi" ? " active" : ""}`}
          id="roiSegmentBtn"
          type="button"
          onClick={() => handleSegmentClick("roi")}
        >
          <span className="module-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </span>
          <span className="segment-label">Performance Dashboard</span>
        </button>
        <button
          className={`segment-link${state.activeView === "meta" ? " active" : ""}`}
          id="metaSegmentBtn"
          type="button"
          onClick={() => handleSegmentClick("meta")}
        >
          <span className="module-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M3 14h4l2.5-8 4 16 2.5-8H21" />
            </svg>
          </span>
          <span className="segment-label">Meta Ads Data</span>
        </button>
        <button
          className={`segment-link${showPricingTab ? "" : " hidden"}${state.activeView === "pricing" ? " active" : ""}`}
          id="pricingSegmentBtn"
          type="button"
          onClick={() => handleSegmentClick("pricing")}
        >
          <span className="module-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8v4l3 2" />
            </svg>
          </span>
          <span className="segment-label">Pricing Tool</span>
        </button>
      </div>
      <div className="sidebar-view-label">Views</div>
      <nav className={`sidebar-nav${state.activeView !== "roi" ? " hidden" : ""}`} id="roiNav">
        {[
          { hash: "#executive-summary", label: "Executive Summary" },
          { hash: "#full-funnel-summary", label: "Full Funnel Summary" },
          { hash: "#content-views", label: "Awarness" },
          { hash: "#social-followers", label: "Audience" },
          { hash: "#lead-generation", label: "Lead Generation" },
          { hash: "#website-traffic", label: "Website Traffic" },
          { hash: "#revenue-bookings", label: "Revenue & Bookings" },
        ].map(({ hash, label }) => (
          <a
            key={hash}
            href={hash}
            className={`nav-link${activeRoiHash === hash ? " active" : ""}`}
            onClick={(event) => handleNavClick(event, hash, setActiveRoiHash)}
          >
            {label}
          </a>
        ))}
      </nav>
      <nav className={`sidebar-nav${state.activeView !== "meta" ? " hidden" : ""}`} id="metaNav">
        {[
          { hash: "#meta-portfolio", label: "Portfolio Snapshot" },
          { hash: "#meta-campaigns", label: "Campaign Breakdown" },
          { hash: "#meta-insights", label: "Performance Insights" },
        ].map(({ hash, label }) => (
          <a
            key={hash}
            href={hash}
            className={`nav-link${activeMetaHash === hash ? " active" : ""}`}
            onClick={(event) => handleNavClick(event, hash, setActiveMetaHash)}
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="sidebar-footer">
        Generated by
        <br />
        HiddenGem Media
        {state.isAdmin && !state.isSuperAdmin && (
          <a
            className="sidebar-logout"
            id="clientLoginLink"
            href="/login"
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginTop: 16, display: "block", textAlign: "center" }}
          >
            Client Login
          </a>
        )}
        {state.isSuperAdmin && (
          <a className="sidebar-logout" id="superAdminLink" href="/admin/super" style={{ marginTop: 16, display: "block", textAlign: "center" }}>
            Super Admin
          </a>
        )}
        <form action={logout}>
          <button className="sidebar-logout" id="logoutBtn" type="submit">
            Log Out
          </button>
        </form>
      </div>
    </aside>
  );
}
