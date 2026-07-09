"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { MobileDrawerBackdrop, MobileDrawerToggle } from "@/components/shell/MobileDrawer";
import { ExportButtons } from "@/components/shell/ExportButtons";
import { RoiView } from "@/components/roi/RoiView";
import { MetaView } from "@/components/meta/MetaView";
import { PricingTool } from "@/components/pricing/PricingTool";
import { useDashboardState } from "@/hooks/useDashboardState";

export function DashboardShell() {
  const state = useDashboardState();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }
    function onResize() {
      if (window.innerWidth > 900) setSidebarOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      <MobileDrawerToggle open={sidebarOpen} onToggle={() => setSidebarOpen((open) => !open)} />
      <MobileDrawerBackdrop open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="container">
        <Sidebar mobileOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
        <main className="main-content">
          {/* Conditional rendering (not just a "hidden" class) so charts mount/unmount
              with the view switch — see the chart lifecycle strategy in the plan. */}
          {state.activeView === "roi" && <RoiView />}
          {state.activeView === "meta" && (
            <div id="metaView">
              <MetaView />
            </div>
          )}
          {state.activeView === "pricing" && (
            <div id="pricingView" className="pricing-view">
              <PricingTool />
            </div>
          )}
        </main>
      </div>
      <ExportButtons />
    </>
  );
}
