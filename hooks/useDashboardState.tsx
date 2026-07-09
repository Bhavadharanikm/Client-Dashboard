"use client";

import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import type { Client } from "@/lib/roi-model";

export type DashboardView = "roi" | "meta" | "pricing";

type DashboardState = {
  availableClients: Client[];
  isAdmin: boolean;
  /** Committed selection — this is what every view actually renders. */
  selectedClientSlug: string;
  selectedMonth: string;
  /** Uncommitted sidebar control values, copied into the selection above on "Load Dashboard". */
  pendingClientSlug: string;
  pendingMonth: string;
  activeView: DashboardView;
  metaExpandedCampaigns: Record<string, boolean>;
};

type DashboardAction =
  | { type: "SET_PENDING_CLIENT"; slug: string }
  | { type: "SET_PENDING_MONTH"; month: string }
  | { type: "APPLY_FILTER" }
  | { type: "SET_VIEW"; view: DashboardView }
  | { type: "TOGGLE_META_CAMPAIGN"; key: string };

function reducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case "SET_PENDING_CLIENT":
      return { ...state, pendingClientSlug: action.slug };
    case "SET_PENDING_MONTH":
      return { ...state, pendingMonth: action.month };
    case "APPLY_FILTER":
      // Pure client-side commit against already-fetched data — no network
      // request, matching the original app's loadDashboard() behavior.
      return { ...state, selectedClientSlug: state.pendingClientSlug, selectedMonth: state.pendingMonth };
    case "SET_VIEW":
      return { ...state, activeView: action.view };
    case "TOGGLE_META_CAMPAIGN": {
      // Only one campaign card open at a time — toggling closes the others,
      // ported from handleMetaCampaignToggle().
      const shouldOpen = !state.metaExpandedCampaigns[action.key];
      const next: Record<string, boolean> = {};
      Object.keys(state.metaExpandedCampaigns).forEach((k) => {
        next[k] = false;
      });
      next[action.key] = shouldOpen;
      return { ...state, metaExpandedCampaigns: next };
    }
    default:
      return state;
  }
}

const DashboardStateContext = createContext<DashboardState | null>(null);
const DashboardDispatchContext = createContext<React.Dispatch<DashboardAction> | null>(null);

export function DashboardProvider({
  children,
  availableClients,
  isAdmin,
  initialClientSlug,
  initialMonth,
}: {
  children: ReactNode;
  availableClients: Client[];
  isAdmin: boolean;
  initialClientSlug: string;
  initialMonth: string;
}) {
  const [state, dispatch] = useReducer(reducer, {
    availableClients,
    isAdmin,
    selectedClientSlug: initialClientSlug,
    selectedMonth: initialMonth,
    pendingClientSlug: initialClientSlug,
    pendingMonth: initialMonth,
    activeView: "roi",
    metaExpandedCampaigns: {},
  });

  return (
    <DashboardStateContext.Provider value={state}>
      <DashboardDispatchContext.Provider value={dispatch}>{children}</DashboardDispatchContext.Provider>
    </DashboardStateContext.Provider>
  );
}

export function useDashboardState() {
  const context = useContext(DashboardStateContext);
  if (!context) throw new Error("useDashboardState must be used within a DashboardProvider");
  return context;
}

export function useDashboardDispatch() {
  const context = useContext(DashboardDispatchContext);
  if (!context) throw new Error("useDashboardDispatch must be used within a DashboardProvider");
  return context;
}

export function useIsMetaCampaignExpanded(key: string) {
  const state = useDashboardState();
  return useMemo(() => !!state.metaExpandedCampaigns[key], [state.metaExpandedCampaigns, key]);
}
