(function () {
  const config = window.DASHBOARD_CONFIG || {};
  const DEFAULT_CLIENT_SLUG = (config.defaults && config.defaults.client) || "inspired-retreats";
  const DEFAULT_MONTH = (config.defaults && (config.defaults.month || config.defaults.to)) || "2026-03";
  const META_COLORS = ["#2663EB", "#F7AD43", "#12B981"];
  // Admin code stored as SHA-256 hash — never as plaintext in source
  const ADMIN_CODE_HASH = "04994b4743c4c2db6bdf5b6e0ddc87af7f0fe6c6b73db4fcbcc0d3bd9b3cbf02";
  async function hashCode(code) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(code).trim()));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
  }
  const ADMIN_ACCESS_CODE = ""; // no longer stored plaintext
  const CLIENT_ALIASES = {
    "apple-mountain": ["apple-mountain", "apple-mountain-resort"],
    "casa-oso": ["casa-oso", "casa-oso-ad-account"],
    "bison-ridge-retreat": ["bison-ridge", "bison-ridge-retreat"],
    "three-suns-cabins": ["three-suns", "three-suns-cabins"]
  };
  const EXCLUDED_CLIENT_SLUGS = ["new", "north-star-nature-suites"];
  const ACCESS_SESSION_KEY = "hgmDashboardAccess";

  const SUPABASE_URL = 'https://vdonazmwxzucdxduzfhh.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkb25hem13eHp1Y2R4ZHV6ZmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNjM2NjIsImV4cCI6MjA4NTczOTY2Mn0.D0RfgvzXR6uoraYT01tKTLX7152cuZ74LZUd4Tlt42o';
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const state = {
    performanceWorkbook: null,
    accessClients: [],
    roiAnalysis: {},
    metaAnalysis: {},
    pricingToolData: null,
    revenueIntelligenceData: null,
    client: null,
    availableClients: [],
    activeView: "roi",
    selectedMonth: DEFAULT_MONTH,
    roiMonths: [],
    allRoiMonths: [],
    metaRows: [],
    metaModel: null,
    pricingToolAvailable: false,
    metaExpandedCampaigns: {},
    metaComparisonExpanded: false,
    pendingMetaScrollKey: "",
    allCharts: [],
    sidebarOpen: false,
    chartLabelBreakpoint: "",
    authorizedClientSlug: "",
    isAdminAccess: false
  };

  const els = {
    sidebarDashboardTitle: document.getElementById("sidebarDashboardTitle"),
    sidebarCurrentMonth: document.getElementById("sidebarCurrentMonth"),
    clientNameHeading: document.getElementById("clientNameHeading"),
    exportCsvBtn: document.getElementById("exportCsvBtn"),
    exportMetaCsvBtn: document.getElementById("exportMetaCsvBtn"),
    dateRangeLabel: document.getElementById("dateRangeLabel"),
    clientSelect: document.getElementById("clientSelect"),
    monthInput: document.getElementById("monthInput"),
    applyFilterBtn: document.getElementById("applyFilterBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    statusMessage: document.getElementById("statusMessage"),
    downloadPdfBtn: document.getElementById("downloadPdfBtn"),
    sidebarToggle: document.getElementById("sidebarToggle"),
    sidebarBackdrop: document.getElementById("sidebarBackdrop"),
    sidebarPanel: document.getElementById("sidebarPanel"),
    clientField: document.querySelector(".sidebar-field-client"),
    roiSegmentBtn: document.getElementById("roiSegmentBtn"),
    metaSegmentBtn: document.getElementById("metaSegmentBtn"),
    pricingSegmentBtn: document.getElementById("pricingSegmentBtn"),
    roiNav: document.getElementById("roiNav"),
    metaNav: document.getElementById("metaNav"),
    roiView: document.getElementById("roiView"),
    metaView: document.getElementById("metaView"),
    pricingView: document.getElementById("pricingView"),
    summaryTotalImpressions: document.getElementById("summaryTotalImpressions"),
    summaryNewFollowers: document.getElementById("summaryNewFollowers"),
    summaryNewLeads: document.getElementById("summaryNewLeads"),
    summaryTotalRevenue: document.getElementById("summaryTotalRevenue"),
    summaryDirectSplitAvg: document.getElementById("summaryDirectSplitAvg"),
    summaryLabel1: document.getElementById("summaryLabel1"),
    summaryLabel2: document.getElementById("summaryLabel2"),
    summaryLabel3: document.getElementById("summaryLabel3"),
    summaryLabel4: document.getElementById("summaryLabel4"),
    summaryLabel5: document.getElementById("summaryLabel5"),
    summaryLabel6: document.getElementById("summaryLabel6"),
    summaryNote1: document.getElementById("summaryNote1"),
    summaryNote2: document.getElementById("summaryNote2"),
    summaryNote3: document.getElementById("summaryNote3"),
    summaryAvgCostPerLead: document.getElementById("summaryAvgCostPerLead"),
    summaryAvgCostPerLeadNote: document.getElementById("summaryAvgCostPerLeadNote"),
    summaryNote5: document.getElementById("summaryNote5"),
    summaryNote6: document.getElementById("summaryNote6"),
    summaryOverviewList: document.getElementById("summaryOverviewList"),
    takeawayPeriodLabel: document.getElementById("takeawayPeriodLabel"),
    contentInstagramViews: document.getElementById("contentInstagramViews"),
    contentMetaViews: document.getElementById("contentMetaViews"),
    contentTiktokViews: document.getElementById("contentTiktokViews"),
    contentTiktokPeakText: document.getElementById("contentTiktokPeakText"),
    contentTotalViewsDisplay: document.getElementById("contentTotalViewsDisplay"),
    contentTotalViewsSubcopy: document.getElementById("contentTotalViewsSubcopy"),
    contentMetaShareBar: document.getElementById("contentMetaShareBar"),
    contentInstagramShareBar: document.getElementById("contentInstagramShareBar"),
    contentTiktokShareBar: document.getElementById("contentTiktokShareBar"),
    contentMetaShareText: document.getElementById("contentMetaShareText"),
    contentInstagramShareText: document.getElementById("contentInstagramShareText"),
    contentTiktokShareText: document.getElementById("contentTiktokShareText"),
    contentMetaNote: document.getElementById("contentMetaNote"),
    contentInstagramNote: document.getElementById("contentInstagramNote"),
    contentPeakPill: document.getElementById("contentPeakPill"),
    contentViewsChartSub: document.getElementById("contentViewsChartSub"),
    audienceTotalFollowers: document.getElementById("audienceTotalFollowers"),
    audienceTotalMonthLabel: document.getElementById("audienceTotalMonthLabel"),
    audienceGrowthBadge: document.getElementById("audienceGrowthBadge"),
    audienceStartedFollowersLabel: document.getElementById("audienceStartedFollowersLabel"),
    audienceStartedFollowers: document.getElementById("audienceStartedFollowers"),
    audienceNetNewFollowersLabel: document.getElementById("audienceNetNewFollowersLabel"),
    audienceNetNewFollowers: document.getElementById("audienceNetNewFollowers"),
    audienceInstagramFollowers: document.getElementById("audienceInstagramFollowers"),
    audienceInstagramMonthLabel: document.getElementById("audienceInstagramMonthLabel"),
    audienceInstagramNote: document.getElementById("audienceInstagramNote"),
    audienceInstagramStartLabel: document.getElementById("audienceInstagramStartLabel"),
    audienceInstagramStart: document.getElementById("audienceInstagramStart"),
    audienceInstagramNetNewLabel: document.getElementById("audienceInstagramNetNewLabel"),
    audienceInstagramShare: document.getElementById("audienceInstagramShare"),
    audienceFacebookFollowers: document.getElementById("audienceFacebookFollowers"),
    audienceFacebookMonthLabel: document.getElementById("audienceFacebookMonthLabel"),
    audienceFacebookNote: document.getElementById("audienceFacebookNote"),
    audienceFacebookStartLabel: document.getElementById("audienceFacebookStartLabel"),
    audienceFacebookStart: document.getElementById("audienceFacebookStart"),
    audienceFacebookNetNewLabel: document.getElementById("audienceFacebookNetNewLabel"),
    audienceFacebookShare: document.getElementById("audienceFacebookShare"),
    audienceCostPerFollower: document.getElementById("audienceCostPerFollower"),
    audienceTiktokMonthLabel: document.getElementById("audienceTiktokMonthLabel"),
    audienceCostPerFollowerNote: document.getElementById("audienceCostPerFollowerNote"),
    audienceTiktokStartLabel: document.getElementById("audienceTiktokStartLabel"),
    audienceTiktokFollowers: document.getElementById("audienceTiktokFollowers"),
    audienceTiktokNetNewLabel: document.getElementById("audienceTiktokNetNewLabel"),
    audienceTiktokGrowth: document.getElementById("audienceTiktokGrowth"),
    audienceDistributionSub: document.getElementById("audienceDistributionSub"),
    websiteTotalSessions: document.getElementById("websiteTotalSessions"),
    websiteSessionsMonthLabel: document.getElementById("websiteSessionsMonthLabel"),
    websiteTotalSessionsNote: document.getElementById("websiteTotalSessionsNote"),
    websitePeakLabel: document.getElementById("websitePeakLabel"),
    websitePeakValue: document.getElementById("websitePeakValue"),
    websiteTotalAdSpend: document.getElementById("websiteTotalAdSpend"),
    websiteTotalAdSpendNote: document.getElementById("websiteTotalAdSpendNote"),
    websiteTrafficChartSub: document.getElementById("websiteTrafficChartSub"),
    leadNewLeadsValue: document.getElementById("leadNewLeadsValue"),
    leadNewLeadsMonthLabel: document.getElementById("leadNewLeadsMonthLabel"),
    leadNewLeadsNote: document.getElementById("leadNewLeadsNote"),
    leadPipelineGrowth: document.getElementById("leadPipelineGrowth"),
    leadTotalPipeline: document.getElementById("leadTotalPipeline"),
    leadPipelineMonthLabel: document.getElementById("leadPipelineMonthLabel"),
    leadPipelineNote: document.getElementById("leadPipelineNote"),
    leadAvgCostPerLead: document.getElementById("leadAvgCostPerLead"),
    leadGrowthMonthLabel: document.getElementById("leadGrowthMonthLabel"),
    leadGrowthNote: document.getElementById("leadGrowthNote"),
    leadCostBadge: document.getElementById("leadCostBadge"),
    newLeadsChartSub: document.getElementById("newLeadsChartSub"),
    totalLeadsChartSub: document.getElementById("totalLeadsChartSub"),
    revenueTotalValue: document.getElementById("revenueTotalValue"),
    revenueTotalMonthLabel: document.getElementById("revenueTotalMonthLabel"),
    revenueYoYBadge: document.getElementById("revenueYoYBadge"),
    revenueDirectValue: document.getElementById("revenueDirectValue"),
    revenueDirectMonthLabel: document.getElementById("revenueDirectMonthLabel"),
    revenueDirectNote: document.getElementById("revenueDirectNote"),
    revenueDirectShareValue: document.getElementById("revenueDirectShareValue"),
    revenueDirectPeakMonth: document.getElementById("revenueDirectPeakMonth"),
    revenueDirectSplitAvg: document.getElementById("revenueDirectSplitAvg"),
    revenueSplitMonthLabel: document.getElementById("revenueSplitMonthLabel"),
    revenueVsLastYear: document.getElementById("revenueVsLastYear"),
    revenuePastMonthLabel: document.getElementById("revenuePastMonthLabel"),
    revenuePeakMonth: document.getElementById("revenuePeakMonth"),
    revenueDirectPastMonthLabel: document.getElementById("revenueDirectPastMonthLabel"),
    revenueSplitNote: document.getElementById("revenueSplitNote"),
    revenueSplitDirectValue: document.getElementById("revenueSplitDirectValue"),
    revenueSplitPastMonthLabel: document.getElementById("revenueSplitPastMonthLabel"),
    revenueSplitPeakMonth: document.getElementById("revenueSplitPeakMonth"),
    revenueChartSub: document.getElementById("revenueChartSub"),
    bookingSplitChartSub: document.getElementById("bookingSplitChartSub"),
    funnelViewsFill: document.getElementById("funnelViewsFill"),
    funnelViewsValue: document.getElementById("funnelViewsValue"),
    funnelFollowersConv: document.getElementById("funnelFollowersConv"),
    funnelFollowersFill: document.getElementById("funnelFollowersFill"),
    funnelFollowersValue: document.getElementById("funnelFollowersValue"),
    funnelTrafficConv: document.getElementById("funnelTrafficConv"),
    funnelSessionsFill: document.getElementById("funnelSessionsFill"),
    funnelSessionsValue: document.getElementById("funnelSessionsValue"),
    funnelLeadsConv: document.getElementById("funnelLeadsConv"),
    funnelLeadsFill: document.getElementById("funnelLeadsFill"),
    funnelLeadsValue: document.getElementById("funnelLeadsValue"),
    funnelRevenueConv: document.getElementById("funnelRevenueConv"),
    funnelRevenueFill: document.getElementById("funnelRevenueFill"),
    funnelRevenueValue: document.getElementById("funnelRevenueValue"),
    funnelCostFollower: document.getElementById("funnelCostFollower"),
    funnelCostLead: document.getElementById("funnelCostLead"),
    funnelRevenuePerSpend: document.getElementById("funnelRevenuePerSpend"),
    funnelRevenuePerSpendNote: document.getElementById("funnelRevenuePerSpendNote"),
    authGate: document.getElementById("authGate"),
    authForm: document.getElementById("authForm"),
    authCodeInput: document.getElementById("code"),
    authError: document.getElementById("st"),
    authSubmit: document.getElementById("btn")
  };

  const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
  const shortMonthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

  function init() {
    bindUi();
    setupSectionObserver();
    bindWindowRecovery();
    hydrateDefaults();
    hydrateView();
    bootstrap();
  }

  function bindUi() {
    els.applyFilterBtn.addEventListener("click", loadDashboard);
    els.clientSelect.addEventListener("change", function () {
      syncMonthInputBounds(els.clientSelect.value);
    });
    bindSidebarDrawer();
    if (els.exportCsvBtn) {
      els.exportCsvBtn.addEventListener("click", exportClientDataCSV);
    }
    if (els.exportMetaCsvBtn) {
      els.exportMetaCsvBtn.addEventListener("click", exportMetaDataCSV);
    }
    if (els.downloadPdfBtn) {
      els.downloadPdfBtn.addEventListener("click", function () {
        window.print();
      });
    }
    if (els.logoutBtn) {
      els.logoutBtn.addEventListener("click", handleLogout);
    }
    els.roiSegmentBtn.addEventListener("click", function () {
      switchView("roi");
    });
    els.metaSegmentBtn.addEventListener("click", function () {
      switchView("meta");
    });
    if (els.pricingSegmentBtn) {
      els.pricingSegmentBtn.addEventListener("click", function () {
        switchView("pricing");
      });
    }
    if (els.authForm) {
      els.authForm.addEventListener("submit", handleAccessSubmit);
    }
    if (els.authCodeInput) {
      els.authCodeInput.addEventListener("input", function () {
        els.authCodeInput.value = normalizeAccessCode(els.authCodeInput.value);
        updateAccessDots();
        if (els.authSubmit) {
          els.authSubmit.disabled = els.authCodeInput.value.length < 4;
          els.authSubmit.className = "btn";
        }
        clearAccessError();
      });
    }
    document.addEventListener("click", handleNavClick);
  }

  function bindWindowRecovery() {
    window.addEventListener("load", function () {
      if (state.activeView === "roi" && state.roiMonths.length) {
        renderRoiCharts();
      }
    });

    let resizeTimer = null;
    state.chartLabelBreakpoint = getChartLabelBreakpoint();
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        const nextBreakpoint = getChartLabelBreakpoint();
        if (nextBreakpoint === state.chartLabelBreakpoint) {
          return;
        }
        state.chartLabelBreakpoint = nextBreakpoint;
        if (state.activeView === "roi" && state.roiMonths.length) {
          renderRoiCharts();
          return;
        }
        if (state.activeView === "meta" && state.metaModel && state.metaModel.months.length) {
          renderMetaCharts(state.metaModel);
        }
      }, 120);
    });
  }

  function bindSidebarDrawer() {
    if (els.sidebarToggle) {
      els.sidebarToggle.addEventListener("click", function () {
        setSidebarOpen(!state.sidebarOpen);
      });
    }

    if (els.sidebarBackdrop) {
      els.sidebarBackdrop.addEventListener("click", function () {
        setSidebarOpen(false);
      });
    }

    window.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) {
        setSidebarOpen(false, true);
      }
    });
  }

  function setSidebarOpen(open, silent) {
    state.sidebarOpen = !!open;
    if (els.sidebarPanel) {
      els.sidebarPanel.classList.toggle("is-open", state.sidebarOpen);
    }
    if (els.sidebarBackdrop) {
      els.sidebarBackdrop.classList.toggle("is-visible", state.sidebarOpen);
    }
    if (els.sidebarToggle) {
      els.sidebarToggle.setAttribute("aria-expanded", state.sidebarOpen ? "true" : "false");
      els.sidebarToggle.setAttribute("aria-label", state.sidebarOpen ? "Close navigation menu" : "Open navigation menu");
    }
    if (!silent && state.sidebarOpen && els.sidebarPanel) {
      const firstControl = els.sidebarPanel.querySelector(".nav-link, .segment-link, button, select, input");
      if (firstControl && typeof firstControl.focus === "function") {
        firstControl.focus();
      }
    }
  }

  function hydrateDefaults() {
    const params = getRouteParams();
    state.selectedMonth = params.get("month") || DEFAULT_MONTH;
    els.monthInput.value = state.selectedMonth;
  }

  function hydrateView() {
    const params = getRouteParams();
    state.activeView = params.get("view") === "meta" ? "meta" : (params.get("view") === "pricing" ? "pricing" : "roi");
    els.sidebarDashboardTitle.textContent = state.activeView === "meta"
      ? "Meta Ads Dashboard"
      : state.activeView === "pricing"
        ? "Pricing Tool"
        : "Performance Dashboard";
    applyViewState();
  }

  async function bootstrap() {
    try {
      // Always call getSession() to ensure the Supabase JWT is fresh (it expires after 1 hour).
      // This also restores login state on page reload when sessionStorage is empty.
      var sbSessionResult = await supabaseClient.auth.getSession();
      var sbSession = sbSessionResult.data && sbSessionResult.data.session;
      var existingSession = getStoredAccessSession();
      if (sbSession && sbSession.user && (!existingSession || !existingSession.code)) {
        var sbEmail = sbSession.user.email || "";
        if (sbEmail === 'admin@hiddengem.media') {
          setStoredAccessSession({ accessCode: "", clientSlug: "", clientName: "Admin" }, true);
        } else {
          var sbCode = normalizeAccessCode(sbEmail.replace(/@hiddengem\.media$/, ""));
          if (sbCode) {
            var profileRes = await supabaseClient.from('user_profiles').select('client_slug').single();
            var sbSlug = profileRes.data && profileRes.data.client_slug ? profileRes.data.client_slug : sbCode;
            setStoredAccessSession({ accessCode: sbCode, clientSlug: sbSlug, clientName: sbSlug }, false);
          }
        }
      }

      const loaded = await Promise.all([
        fetchPerformanceWorkbook(),
        fetchAccessClients(),
        fetchRoiAnalysis(),
        fetchMetaAnalysis(),
        fetchPricingToolData()
      ]);
      state.performanceWorkbook = loaded[0];
      state.accessClients = loaded[1];
      state.roiAnalysis = loaded[2];
      state.metaAnalysis = loaded[3];
      state.pricingToolData = loaded[4];

      // Fetch and merge Meta Ads rows from Supabase into the workbook
      var metaRowsByClientSlug = await fetchMetaRowsFromSupabase();
      if (state.performanceWorkbook && Object.keys(metaRowsByClientSlug).length) {
        state.performanceWorkbook = Object.assign({}, state.performanceWorkbook, {
          metaRowsByClientSlug: metaRowsByClientSlug
        });
      }

      state.availableClients = (state.performanceWorkbook && state.performanceWorkbook.clients) || [];
      if (!(await ensureAuthorizedAccess())) {
        return;
      }
      if (state.authorizedClientSlug && !state.isAdminAccess) {
        state.availableClients = state.availableClients.filter(function (client) {
          return client.slug === state.authorizedClientSlug;
        });
      }
      renderClientOptions();
      const params = getRouteParams();
      const routeClient = params.get("client");
      const selectedSlug = resolveRouteClientSlug(routeClient || DEFAULT_CLIENT_SLUG || (state.availableClients[0] && state.availableClients[0].slug) || "");
      els.clientSelect.value = state.availableClients.some(function (client) {
        return client.slug === selectedSlug;
      }) ? selectedSlug : ((state.availableClients[0] && state.availableClients[0].slug) || "");
      if (!updatePricingToolAvailability(els.clientSelect.value) && state.activeView === "pricing") {
        state.activeView = "roi";
        applyViewState();
      }
      syncMonthInputBounds(els.clientSelect.value);
      await loadDashboard();
    } catch (error) {
      console.error(error);
      showMessage(error.message || "Could not load the client list.", "error");
    }
  }

  function exportClientDataCSV() {
    if (!state.client) return;
    var slug = canonicalizeClientSlug(state.client.slug);
    var rows = (state.performanceWorkbook && state.performanceWorkbook.rowsByClientSlug && state.performanceWorkbook.rowsByClientSlug[slug]) || [];
    if (!rows.length) {
      showMessage("No data available to export.", "error");
      return;
    }
    var MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var headers = [
      "Period","Total Booking Revenue","Direct Booking Revenue","Direct Booking Split %",
      "LY Total Booking Revenue","LY Direct Booking Revenue","LY Direct Booking Split %",
      "Total Views","IG Views","FB Views","TikTok Views",
      "Total Followers","IG Followers","FB Followers","TikTok Followers",
      "Website Traffic","New Leads","Total Leads","Lead Growth %"
    ];
    var sorted = rows.slice().sort(function(a,b){ return (a.year*100+a.month) - (b.year*100+b.month); });
    var lines = [headers.join(",")];
    sorted.forEach(function(r) {
      var period = (MONTH_NAMES[(r.month||1)-1] || "") + " " + (r.year || "");
      var pct = function(v){ return v != null ? (parseFloat(v)*100).toFixed(1) + "%" : ""; };
      var num = function(v){ return v != null ? parseFloat(v) : ""; };
      lines.push([
        period,
        num(r.total_booking_revenue), num(r.direct_booking_revenue), pct(r.direct_booking_split_pct),
        num(r.ly_total_booking_revenue), num(r.ly_direct_booking_revenue), pct(r.ly_direct_booking_split_pct),
        num(r.total_views), num(r.ig_views), num(r.fb_views), num(r.tiktok_views),
        num(r.ttl_followers), num(r.ig_followers), num(r.fb_followers), num(r.tiktok_followers),
        num(r.website_traffic), num(r.new_leads), num(r.ttl_leads), pct(r.lead_growth_pct)
      ].join(","));
    });
    var csv = lines.join("\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = state.client.name.replace(/[^a-zA-Z0-9]/g, "_") + "_Performance_Data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportMetaDataCSV() {
    if (!state.client) return;
    var slug = canonicalizeClientSlug(state.client.slug);
    var workbook = state.performanceWorkbook;
    var rows = (workbook && workbook.metaRowsByClientSlug && workbook.metaRowsByClientSlug[slug]) || [];
    if (!rows.length) {
      showMessage("No Meta Ads data available to export.", "error");
      return;
    }
    // Build a lookup of direct_booking_revenue by month key from performance data
    var perfRows = (workbook && workbook.rowsByClientSlug && workbook.rowsByClientSlug[slug]) || [];
    var directRevenueByMonth = {};
    perfRows.forEach(function(r) {
      var key = r.year + "-" + String(r.month).padStart(2, "0");
      directRevenueByMonth[key] = r.direct_booking_revenue;
    });
    var MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var headers = [
      "Month","Campaign","Spend","Revenue","ROAS",
      "Impressions","Visits","Leads/Followers","IG Bio Leads",
      "Bookings (Email)","Bookings (FB)","Cost Per Booking",
      "Direct Booking Revenue"
    ];
    var sorted = rows.slice().sort(function(a,b){
      return (a.year*100+a.month) - (b.year*100+b.month) || (a.campaign_type||"").localeCompare(b.campaign_type||"");
    });
    var lines = [headers.join(",")];
    sorted.forEach(function(r) {
      var period = (MONTH_NAMES[(r.month||1)-1] || "") + " " + (r.year || "");
      var monthKey = r.year + "-" + String(r.month).padStart(2, "0");
      var num = function(v){ return v != null && v !== "" ? parseFloat(parseFloat(v).toFixed(2)) : ""; };
      lines.push([
        period, r.campaign_type || "",
        num(r.spend), num(r.revenue), num(r.roas),
        num(r.impressions), num(r.profile_visits), num(r.leads_followers), num(r.ig_bio_leads),
        num(r.bookings_email_matched), num(r.bookings_fb_events), num(r.cost_per_booking),
        num(directRevenueByMonth[monthKey])
      ].join(","));
    });
    var csv = lines.join("\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = state.client.name.replace(/[^a-zA-Z0-9]/g, "_") + "_Meta_Ads_Data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function loadDashboard() {
    const selectedClientSlug = els.clientSelect.value;
    syncMonthInputBounds(selectedClientSlug);
    const selectedMonth = els.monthInput.value;

    if (!selectedMonth) {
      showMessage("Please select a month.", "error");
      return;
    }

    if (!selectedClientSlug) {
      showMessage("Please select a client.", "error");
      return;
    }

    setLoading(true);
    showMessage("Loading dashboard data...", "info");

    try {
      state.selectedMonth = selectedMonth;
      const canonicalClientSlug = canonicalizeClientSlug(selectedClientSlug);
      updateRoute(canonicalClientSlug, selectedMonth, state.activeView);
      const performanceClient = getPerformanceClient(canonicalClientSlug);

      if (!performanceClient) {
        throw new Error("The selected client was not found in the workbook data file.");
      }

      state.client = performanceClient;
      syncClientFrame(performanceClient, selectedMonth);
      state.revenueIntelligenceData = null;
      if (canonicalClientSlug === "flohom" || canonicalClientSlug === "reflections-resorts" || canonicalClientSlug === "awayframes" || canonicalClientSlug === "paradise-pointe" || canonicalClientSlug === "stay-on-30a") {
        state.revenueIntelligenceData = await fetchRevenueIntelligenceData(canonicalClientSlug);
      }
      const pricingAvailable = updatePricingToolAvailability(canonicalClientSlug);

      const roiRows = getPerformanceRoiRows(canonicalClientSlug);
      const metaRows = getMetaRows(canonicalClientSlug);

      const roiMonths = buildRoiMetrics(getHistoricalMonthKeys(roiRows, selectedMonth, 3), roiRows);
      const allRoiMonths = buildRoiMetrics(getAllMonthKeys(roiRows), roiRows);
      const filteredMetaRows = filterMetaRows(getHistoricalMonthKeys(metaRows, selectedMonth, 3), metaRows, roiRows);
      state.roiMonths = roiMonths;
      state.allRoiMonths = allRoiMonths;
      state.metaRows = filteredMetaRows;
      state.metaModel = normalizeMetaSpendBoundaryMonths(buildMetaModel(filteredMetaRows), canonicalClientSlug);
      syncMetaExpandedCampaigns(state.metaModel);

      if (state.roiMonths.length) {
        renderRoiDashboard(selectedMonth);
      } else {
        renderRoiEmpty(selectedMonth);
      }

      renderMetaView(selectedMonth);
      if (!pricingAvailable && state.activeView === "pricing") {
        state.activeView = "roi";
        updateRoute(canonicalClientSlug, selectedMonth, state.activeView);
      }
      switchView(state.activeView);

      if (state.activeView === "roi" && !state.roiMonths.length) {
        showMessage("No workbook rows were found for this client in the selected 3-month window.", "info");
      } else if (state.activeView === "meta" && !state.metaModel.months.length) {
        showMessage("No workbook Meta Ads rows were found for this client in the selected 3-month window.", "info");
      } else if (state.activeView === "pricing" && !pricingAvailable) {
        showMessage("Pricing data is not available for this client.", "info");
      } else {
        showMessage("", "");
      }
    } catch (error) {
      console.error(error);
      showMessage(error.message || "Could not load the dashboard data.", "error");
    } finally {
      setLoading(false);
    }
  }

  function renderClientOptions() {
    els.clientSelect.innerHTML = state.availableClients.map(function (client) {
      return '<option value="' + escapeHtml(client.slug) + '">' + escapeHtml(client.name) + "</option>";
    }).join("");
  }

  async function fetchPerformanceWorkbook() {
    const { data, error } = await supabaseClient
      .from('dashboard_performance')
      .select('*')
      .order('year', { ascending: true })
      .order('month', { ascending: true });
    if (error || !data) return normalizePerformanceWorkbook({ clients: [], rowsByClientSlug: {}, metaRowsByClientSlug: {} });

    const rowsByClientSlug = {};
    (data || []).forEach(function(row) {
      const slug = canonicalizeClientSlug(row.client_slug);
      if (!rowsByClientSlug[slug]) rowsByClientSlug[slug] = [];
      rowsByClientSlug[slug].push(row);
    });
    const CLIENT_DISPLAY_NAMES = {
      'american-river': 'American River Resort',
      'apple-mountain': 'Apple Mountain',
      'asheville-river-cabins': 'Asheville River Cabins',
      'away2pa': 'Away2PA',
      'awayframes': 'Awayframes',
      'big-moon-ranch': 'Big Moon Ranch',
      'bison-ridge-retreat': 'Bison Ridge Retreat',
      'dwell-luxury-rentals': 'Dwell Luxury Rentals',
      'endless-stays': 'Endless Stays',
      'evergreen-cabins': 'Evergreen Cabins',
      'flohom': 'Flohom',
      'green-springs-inn': 'Green Springs Inn',
      'hgm-client': 'HGM Client',
      'hiawassee-glamping': 'Hiawassee Glamping',
      'hillside-amble': 'Hillside Amble',
      'home-base': 'Home Base',
      'inspired-retreats': 'Inspired Retreats',
      'myrinn': 'Myrinn',
      'nature-nooks': 'Nature Nooks',
      'paradise-pointe': 'Paradise Pointe',
      'parker-reserve': 'Parker Reserve',
      'pine-valley-cabins': 'Pine Valley Cabins',
      'raven-rock-mountain': 'Raven Rock Mountain',
      'red-white-blue-views': 'Red White Blue Views',
      'reflections-resorts': 'Reflections Resorts',
      'roundhouse-resort-spa': 'Roundhouse Resort & Spa',
      'southern-illinois-cabins': 'Southern Illinois Cabins',
      'starlight-haven-hot-springs': 'Starlight Haven – Hot Springs',
      'starlight-haven-weiss-lake': 'Starlight Haven – Weiss Lake',
      'stay-different': 'Stay Different',
      'stay-on-30a': 'Stay on 30A',
      'stay-saluda': 'Stay Saluda',
      'stay-with-branch': 'Stay with Branch',
      'stayluxe': 'StayLuxe',
      'the-cohost-company': 'The Cohost Company',
      'three-suns-cabins': 'Three Suns Cabins',
      'treetop-escapes': 'Treetop Escapes',
      'wanderin-star-farms': 'Wanderin Star Farms'
    };
    const clients = Object.keys(rowsByClientSlug).map(function(slug) {
      const displayName = CLIENT_DISPLAY_NAMES[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
      return { slug: slug, name: displayName };
    }).filter(function(client, index, arr) {
      return arr.findIndex(function(c) { return c.slug === client.slug; }) === index;
    });
    return normalizePerformanceWorkbook({ clients: clients, rowsByClientSlug: rowsByClientSlug, metaRowsByClientSlug: {} });
  }

  async function fetchAccessClients() {
    return [];
  }

  async function fetchMetaRowsFromSupabase() {
    const { data, error } = await supabaseClient
      .from('dashboard_meta_ads')
      .select('*')
      .order('year', { ascending: true })
      .order('month', { ascending: true });
    if (error) return {};
    const metaRowsByClientSlug = {};
    (data || []).forEach(function(row) {
      if (!metaRowsByClientSlug[row.client_slug]) metaRowsByClientSlug[row.client_slug] = [];
      metaRowsByClientSlug[row.client_slug].push(row);
    });
    return metaRowsByClientSlug;
  }

  async function fetchRoiAnalysis() {
    try {
      const { data, error } = await supabaseClient
        .from('roi_analysis')
        .select('client_slug,period_key,range_label,key_takeaways');
      if (error || !data) return {};
      // Build structure: { [clientSlug]: { roi: { [periodKey]: { ... } } } }
      const result = {};
      data.forEach(function(row) {
        if (!result[row.client_slug]) result[row.client_slug] = { roi: {} };
        result[row.client_slug].roi[row.period_key] = {
          range_label: row.range_label || "",
          key_takeaways: row.key_takeaways || []
        };
      });
      return result;
    } catch (_error) {
      return {};
    }
  }

  async function fetchMetaAnalysis() {
    try {
      const { data, error } = await supabaseClient
        .from('meta_analysis')
        .select('client_slug,period_key,range_label,discovery_key_takeaways,retargeting_key_takeaways,performance_insights,performance_overview');
      if (error || !data) return {};

      // Build structure: { [clientSlug]: { meta: { [periodKey]: { ... } } } }
      const result = {};
      data.forEach(function(row) {
        if (!result[row.client_slug]) result[row.client_slug] = { meta: {} };
        result[row.client_slug].meta[row.period_key] = {
          range_label: row.range_label,
          discovery_key_takeaways: row.discovery_key_takeaways || [],
          retargeting_key_takeaways: row.retargeting_key_takeaways || [],
          performance_insights: row.performance_insights || [],
          performance_overview: row.performance_overview || []
        };
      });
      return result;
    } catch (_error) {
      return {};
    }
  }

  async function fetchPricingToolData() {
    const pricingToolConfig = config.pricingTool || {};
    const dataPath = pricingToolConfig.dataPath || "Pricing Tool Files/Data/pricing-tool-data.json";
    try {
      const response = await fetch(new URL(dataPath, window.location.href).toString() + "?ts=" + Date.now(), {
        cache: "no-store"
      });
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (_error) {
      return null;
    }
  }

  const PRICING_ENABLED_SLUGS = ["flohom", "reflections-resorts", "awayframes", "paradise-pointe", "stay-on-30a"];
  const REVENUE_INTELLIGENCE_API_URL = "https://hiddengem-ai.netlify.app/api/v1/public/revenue-intelligence";

  async function fetchRevenueIntelligenceData(clientSlug) {
    const canonicalSlug = canonicalizeClientSlug(clientSlug);
    if (PRICING_ENABLED_SLUGS.indexOf(canonicalSlug) === -1) return null;
    try {
      // Fetch client's pricing API key securely from Supabase (RLS ensures own key only)
      const { data: profile, error } = await supabaseClient
        .from('user_profiles')
        .select('pricing_api_key')
        .single();
      if (error || !profile || !profile.pricing_api_key) return null;

      const response = await fetch(REVENUE_INTELLIGENCE_API_URL, {
        headers: { "Authorization": "Bearer " + profile.pricing_api_key, "Accept": "application/json" },
        cache: "no-store"
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (_error) {
      return null;
    }
  }

  function canonicalizeClientSlug(slug) {
    var normalized = String(slug || "").trim();
    var canonical = Object.keys(CLIENT_ALIASES).find(function (candidate) {
      return CLIENT_ALIASES[candidate].indexOf(normalized) !== -1;
    });
    return canonical || normalized;
  }

  function isPricingToolClient(clientSlug) {
    const pricingToolConfig = config.pricingTool || {};
    const canonical = canonicalizeClientSlug(clientSlug);
    if (
      canonical === "flohom"
      || canonical === "paradise-pointe"
      || canonical === "awayframes"
      || canonical === "reflections-resorts"
      || canonical === "stay-on-30a"
    ) {
      return true;
    }
    if (pricingToolConfig.enabled === false) {
      return false;
    }
    const allowedSlugs = Array.isArray(pricingToolConfig.clientSlugs) ? pricingToolConfig.clientSlugs : [];
    if (!allowedSlugs.length) {
      return true;
    }
    return allowedSlugs.map(canonicalizeClientSlug).indexOf(canonical) !== -1;
  }

  function updatePricingToolAvailability(clientSlug) {
    const available = isPricingToolClient(clientSlug);
    state.pricingToolAvailable = available;
    if (els.pricingSegmentBtn) {
      els.pricingSegmentBtn.classList.toggle("hidden", !available);
    }
    return available;
  }

  function normalizeAccessCode(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 5);
  }

  function extractRouteAccessCode(routeClient) {
    var match = String(routeClient || "").trim().match(/(\d{5})$/);
    return match ? normalizeAccessCode(match[1]) : "";
  }

  function clearStoredAccessSession() {
    try {
      window.sessionStorage.removeItem(ACCESS_SESSION_KEY);
    } catch (_error) {
      // ignore storage failures
    }
  }

  function getStoredAccessSession() {
    try {
      var raw = window.sessionStorage.getItem(ACCESS_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function setStoredAccessSession(accessClient, isAdmin) {
    try {
      window.sessionStorage.setItem(ACCESS_SESSION_KEY, JSON.stringify({
        code: normalizeAccessCode(accessClient.accessCode),
        clientSlug: canonicalizeClientSlug(accessClient.clientSlug),
        clientName: accessClient.clientName || "",
        isAdmin: !!isAdmin,
        savedAt: Date.now()
      }));
    } catch (_error) {
      // ignore storage failures
    }
  }

  async function isAdminAccessCode(code) {
    const h = await hashCode(normalizeAccessCode(code));
    return h === ADMIN_CODE_HASH;
  }

  function findAccessClientByCode(code) {
    var normalizedCode = normalizeAccessCode(code);
    return state.accessClients.find(function (client) {
      return normalizeAccessCode(client.accessCode) === normalizedCode
        && EXCLUDED_CLIENT_SLUGS.indexOf(canonicalizeClientSlug(client.clientSlug)) === -1;
    }) || null;
  }

  function showAccessGate(message) {
    document.body.classList.add("auth-locked");
    if (els.authError) {
      els.authError.textContent = message || "";
      els.authError.className = message ? "status e" : "status";
    }
    updateClientFieldVisibility();
    if (els.authCodeInput && !message) {
      els.authCodeInput.focus();
    }
  }

  function hideAccessGate() {
    document.body.classList.remove("auth-locked");
    clearAccessError();
    updateClientFieldVisibility();
  }

  function updateClientFieldVisibility() {
    if (!els.clientField) {
      return;
    }
    els.clientField.style.display = state.isAdminAccess ? "block" : "none";
    els.clientField.setAttribute("aria-hidden", state.isAdminAccess ? "false" : "true");
  }

  function clearAccessError() {
    if (els.authError) {
      els.authError.textContent = "";
      els.authError.className = "status";
    }
  }

  function updateAccessDots() {
    if (!els.authGate) {
      return;
    }
    Array.prototype.forEach.call(els.authGate.querySelectorAll(".dot"), function (dot, index) {
      dot.classList.toggle("on", !!(els.authCodeInput && index < els.authCodeInput.value.length));
      dot.style.background = "";
    });
  }

  // --- URL token helpers (obfuscate client URLs) ---
  function encodeRouteToken(clientParam, month, view) {
    try {
      var raw = [clientParam, month, view || "roi"].join("|");
      return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    } catch (_e) { return ""; }
  }

  function decodeRouteToken(token) {
    try {
      var padded = String(token || "").replace(/-/g, "+").replace(/_/g, "/");
      var rem = padded.length % 4;
      if (rem) padded += "===".slice(0, 4 - rem);
      var parts = atob(padded).split("|");
      return parts.length >= 2 ? { clientParam: parts[0] || "", month: parts[1] || "", view: parts[2] || "roi" } : null;
    } catch (_e) { return null; }
  }

  // Returns URLSearchParams with decoded token values (if ?t= is present), else raw params.
  // Use this everywhere we READ client/month/view from the URL.
  function getRouteParams() {
    var raw = new URLSearchParams(window.location.search);
    var t = raw.get("t");
    if (t) {
      var decoded = decodeRouteToken(t);
      if (decoded) {
        var p = new URLSearchParams();
        p.set("client", decoded.clientParam);
        p.set("month", decoded.month);
        p.set("view", decoded.view);
        return p;
      }
    }
    return raw;
  }
  // --------------------------------------------------

  function buildAuthorizedRoute(clientSlug, code, month, view) {
    var canonicalSlug = canonicalizeClientSlug(clientSlug);
    var isAdmin = state.isAdminAccess;
    var bounds = getClientMonthBounds(canonicalSlug);
    var nextMonth = isAdmin ? (month || DEFAULT_MONTH) : bounds.max;
    var nextView = view === "meta" ? "meta" : view === "pricing" ? "pricing" : "roi";

    if (!isAdmin) {
      // Encode client routes into an opaque token so slug/code/month aren't guessable
      var clientParam = canonicalSlug + normalizeAccessCode(code);
      var token = encodeRouteToken(clientParam, nextMonth, nextView);
      return window.location.pathname + "?t=" + token;
    }

    // Admin: keep a readable URL
    var params = new URLSearchParams();
    params.set("client", canonicalSlug);
    params.set("month", nextMonth);
    params.set("view", nextView);
    return window.location.pathname + "?" + params.toString();
  }

  async function ensureAuthorizedAccess() {
    var session = getStoredAccessSession();

    // If a ?t= token is present, check that its code matches the stored session.
    // If it doesn't (user is visiting a different client's link), clear the stale
    // session so the token's client gets a fresh login.
    var rawSearch = new URLSearchParams(window.location.search);
    if (rawSearch.get("t") && session && session.code && !session.isAdmin) {
      var tokenParams = getRouteParams();
      var tokenClientParam = String(tokenParams.get("client") || "").trim();
      var tokenCode = extractRouteAccessCode(tokenClientParam);
      if (tokenCode && normalizeAccessCode(tokenCode) !== normalizeAccessCode(session.code)) {
        clearStoredAccessSession();
        session = null;
      }
    }

    if ((!session || !session.code) && !state.isAdminAccess) {
      var directParams = getRouteParams();
      var directRouteClient = String(directParams.get("client") || "").trim();
      var directRouteCode = extractRouteAccessCode(directRouteClient);
      var directAccessClient = directRouteCode ? findAccessClientByCode(directRouteCode) : null;
      if (directAccessClient) {
        setStoredAccessSession(directAccessClient, false);
        session = getStoredAccessSession();
      }
    }

    if (!session || !session.code) {
      state.isAdminAccess = false;
      showAccessGate();
      return false;
    }

    if ((await isAdminAccessCode(session.code)) || session.isAdmin) {
      state.isAdminAccess = true;
      state.authorizedClientSlug = "";
      hideAccessGate();

      var adminParams = getRouteParams();
      var routeClient = String(adminParams.get("client") || "").trim();
      var routeSlug = resolveRouteClientSlug(routeClient || DEFAULT_CLIENT_SLUG || (state.availableClients[0] && state.availableClients[0].slug) || "");
      var requestedView = adminParams.get("view") || "roi";
      var requestedMonth = adminParams.get("month") || DEFAULT_MONTH;
      var expectedClient = buildRouteClientParam(routeSlug);

      if (adminParams.get("client") !== expectedClient || adminParams.get("month") !== requestedMonth || (adminParams.get("view") || "roi") !== requestedView) {
        window.location.replace(buildAuthorizedRoute(routeSlug, ADMIN_ACCESS_CODE, requestedMonth, requestedView));
        return false;
      }

      return true;
    }

    // For Supabase-authenticated clients, the session already contains clientSlug.
    // If it's present, use it directly instead of looking up via local accessClients list.
    var sessionClientSlug = session.clientSlug ? canonicalizeClientSlug(session.clientSlug) : null;
    var accessClient = findAccessClientByCode(session.code);
    if (!accessClient && !sessionClientSlug) {
      state.isAdminAccess = false;
      clearStoredAccessSession();
      showAccessGate("Enter a valid access code.");
      return false;
    }

    state.isAdminAccess = false;
    var authorizedSlug = sessionClientSlug || canonicalizeClientSlug(accessClient.clientSlug);
    var sessionCode = session.code || (accessClient && normalizeAccessCode(accessClient.accessCode)) || "";
    var bounds = getClientMonthBounds(authorizedSlug);
    var params = getRouteParams();
    var routeClient = String(params.get("client") || "").trim();
    var routeCode = extractRouteAccessCode(routeClient);
    // Strip the 5-digit code suffix directly — don't use resolveRouteClientSlug here
    // because that depends on state.availableClients being populated.
    var routeSlug = routeClient
      ? canonicalizeClientSlug(routeClient.replace(/\d{5}$/, "")) || authorizedSlug
      : authorizedSlug;
    var requestedView = params.get("view") || "roi";
    var requestedMonth = bounds.max;

    if (routeSlug !== authorizedSlug || routeCode !== normalizeAccessCode(sessionCode) || params.get("month") !== requestedMonth) {
      window.location.replace(buildAuthorizedRoute(authorizedSlug, sessionCode, requestedMonth, requestedView));
      return false;
    }

    state.authorizedClientSlug = authorizedSlug;
    hideAccessGate();
    return true;
  }

  async function handleAccessSubmit(event) {
    event.preventDefault();
    clearAccessError();

    var accessCode = normalizeAccessCode(els.authCodeInput && els.authCodeInput.value);
    var params = getRouteParams();
    var requestedView = params.get("view") || "roi";
    var requestedMonth = params.get("month") || DEFAULT_MONTH;

    if (await isAdminAccessCode(accessCode)) {
      // Sign into Supabase as admin so RLS policies allow reading all client data
      await supabaseClient.auth.signInWithPassword({
        email: 'admin@hiddengem.media',
        password: accessCode
      });
      setStoredAccessSession({
        accessCode: accessCode,
        clientSlug: "",
        clientName: "Admin"
      }, true);
      state.isAdminAccess = true;
      state.authorizedClientSlug = "";
      if (els.authSubmit) {
        els.authSubmit.disabled = true;
        els.authSubmit.className = "btn";
      }
      var adminRouteClient = resolveRouteClientSlug(params.get("client") || DEFAULT_CLIENT_SLUG || (state.availableClients[0] && state.availableClients[0].slug) || "");
      window.location.replace(buildAuthorizedRoute(adminRouteClient, ADMIN_ACCESS_CODE, requestedMonth, requestedView));
      return;
    }

    // Sign in via Supabase
    if (els.authSubmit) {
      els.authSubmit.disabled = true;
      els.authSubmit.className = "btn";
    }
    var authResult = await supabaseClient.auth.signInWithPassword({
      email: accessCode + '@hiddengem.media',
      password: accessCode
    });
    if (authResult.error) {
      showAccessGate("That access code was not recognized.");
      if (els.authSubmit) {
        els.authSubmit.className = "btn bad";
        els.authSubmit.disabled = false;
      }
      return;
    }

    // Get client_slug from user_profiles
    var profileResult = await supabaseClient
      .from('user_profiles')
      .select('client_slug')
      .single();
    var clientSlug = profileResult.data && profileResult.data.client_slug ? profileResult.data.client_slug : accessCode;

    // Store session and redirect
    setStoredAccessSession({ accessCode: accessCode, clientSlug: clientSlug, clientName: clientSlug }, false);
    state.isAdminAccess = false;
    state.authorizedClientSlug = canonicalizeClientSlug(clientSlug);
    if (els.authSubmit) {
      els.authSubmit.disabled = true;
      els.authSubmit.className = "btn";
    }
    window.location.replace(buildAuthorizedRoute(clientSlug, accessCode, requestedMonth, requestedView));
  }

  async function handleLogout() {
    await supabaseClient.auth.signOut();
    clearStoredAccessSession();
    state.isAdminAccess = false;
    state.authorizedClientSlug = "";
    showAccessGate();
    if (els.authCodeInput) {
      els.authCodeInput.value = "";
      updateAccessDots();
      els.authCodeInput.focus();
    }
    if (els.authSubmit) {
      els.authSubmit.disabled = true;
      els.authSubmit.className = "btn";
    }
    var params = new URLSearchParams(window.location.search);
    params.delete("client");
    params.delete("code");
    params.delete("clientName");
    params.delete("month");
    params.delete("view");
    params.delete("t");
    window.location.replace(window.location.pathname + (params.toString() ? "?" + params.toString() : ""));
  }

  function resolveRouteClientSlug(routeClient) {
    var normalized = String(routeClient || "").trim();
    var directCanonical = canonicalizeClientSlug(normalized);

    if (state.availableClients.some(function (client) {
      return client.slug === directCanonical;
    })) {
      return directCanonical;
    }

    var tokenCanonical = canonicalizeClientSlug(normalized.replace(/\d{5}$/, ""));
    if (state.availableClients.some(function (client) {
      return client.slug === tokenCanonical;
    })) {
      return tokenCanonical;
    }

    return directCanonical;
  }

  function buildRouteClientParam(clientSlug) {
    var canonicalClientSlug = canonicalizeClientSlug(clientSlug);
    if (state.isAdminAccess) {
      return canonicalClientSlug;
    }
    var params = getRouteParams();
    var existing = String(params.get("client") || "").trim();
    var code = normalizeAccessCode(params.get("code"));
    var matchedAccessClient = state.accessClients.find(function (client) {
      return canonicalizeClientSlug(client.clientSlug) === canonicalClientSlug;
    });

    if (existing) {
      var existingBase = canonicalizeClientSlug(existing.replace(/\d{5}$/, ""));
      if (existingBase === canonicalClientSlug && /\d{5}$/.test(existing)) {
        return existing;
      }
    }

    if (!code && matchedAccessClient) {
      code = normalizeAccessCode(matchedAccessClient.accessCode);
    }

    return code ? canonicalClientSlug + code : canonicalClientSlug;
  }

  function normalizePerformanceWorkbook(workbook) {
    var nextWorkbook = Object.assign({}, workbook);
    var nextClients = ((workbook && workbook.clients) || []).slice();
    var nextRowsByClientSlug = Object.assign({}, (workbook && workbook.rowsByClientSlug) || {});
    var nextMetaRowsByClientSlug = Object.assign({}, (workbook && workbook.metaRowsByClientSlug) || {});

    Object.keys(CLIENT_ALIASES).forEach(function (canonicalSlug) {
      var aliases = CLIENT_ALIASES[canonicalSlug];
      var matchingClients = nextClients.filter(function (client) {
        return aliases.indexOf(client.slug) !== -1;
      });

      if (!matchingClients.length) {
        return;
      }

      var canonicalClient = matchingClients.find(function (client) {
        return client.slug === canonicalSlug;
      }) || matchingClients[0];

      canonicalClient = Object.assign({}, canonicalClient, { slug: canonicalSlug });

      nextClients = nextClients.filter(function (client) {
        return aliases.indexOf(client.slug) === -1;
      });
      nextClients.push(canonicalClient);

      nextRowsByClientSlug[canonicalSlug] = aliases.reduce(function (rows, alias) {
        return rows.concat(nextRowsByClientSlug[alias] || []);
      }, []).sort(compareWorkbookRows);

      nextMetaRowsByClientSlug[canonicalSlug] = aliases.reduce(function (rows, alias) {
        return rows.concat(nextMetaRowsByClientSlug[alias] || []);
      }, []).sort(compareWorkbookRows);
    });

    nextClients = nextClients.filter(function (client) {
      return EXCLUDED_CLIENT_SLUGS.indexOf(client.slug) === -1;
    });

    nextWorkbook.clients = nextClients.sort(function (left, right) {
      return String(left.name || "").localeCompare(String(right.name || ""));
    });
    nextWorkbook.rowsByClientSlug = nextRowsByClientSlug;
    nextWorkbook.metaRowsByClientSlug = nextMetaRowsByClientSlug;
    return nextWorkbook;
  }

  function compareWorkbookRows(left, right) {
    return toMonthKey(left.year, left.month).localeCompare(toMonthKey(right.year, right.month));
  }

  function getPerformanceClient(slug) {
    return state.availableClients.find(function (client) {
      return client.slug === slug;
    }) || null;
  }

  function getPerformanceRoiRows(slug) {
    const workbook = state.performanceWorkbook || {};
    const rowsByClientSlug = workbook.rowsByClientSlug || {};
    return rowsByClientSlug[slug] || [];
  }

  function getMetaRows(slug) {
    const workbook = state.performanceWorkbook || {};
    const metaRowsByClientSlug = workbook.metaRowsByClientSlug || {};
    return metaRowsByClientSlug[slug] || [];
  }

  function buildRoiMetrics(monthKeys, roiRows) {
    const roiMap = roiRows.reduce(function (accumulator, row) {
      accumulator[toMonthKey(row.year, row.month)] = row;
      return accumulator;
    }, {});

    return monthKeys.map(function (key, index) {
      const roi = roiMap[key];
      if (!roi) {
        return null;
      }

      const previous = index > 0 ? roiMap[monthKeys[index - 1]] || null : null;
      const igFollowers = numeric(roi.ig_followers);
      const fbFollowers = numeric(roi.fb_followers);
      const tiktokFollowers = numeric(roi.tiktok_followers);
      const totalFollowers = igFollowers + fbFollowers + tiktokFollowers;
      const previousFollowers = previous
        ? numeric(previous.ig_followers) + numeric(previous.fb_followers) + numeric(previous.tiktok_followers)
        : estimatePreviousTotal(totalFollowers, roi.follower_growth_pct);
      const igViews = numeric(roi.ig_views);
      const fbViews = numeric(roi.fb_views);
      const tiktokViews = numeric(roi.tiktok_views);
      const totalViews = igViews + fbViews + tiktokViews;

      return {
        key: key,
        label: formatMonthKey(key),
        shortLabel: formatShortMonthKey(key),
        totalViews: totalViews,
        totalViewGrowthText: roi.total_view_growth || "",
        totalViewGrowthValue: parsePercentText(roi.total_view_growth),
        igViews: igViews,
        fbViews: fbViews,
        tiktokViews: tiktokViews,
        igFollowers: igFollowers,
        fbFollowers: fbFollowers,
        tiktokFollowers: tiktokFollowers,
        totalFollowers: totalFollowers,
        netNewFollowers: Math.max(0, totalFollowers - previousFollowers),
        followerGrowth: numeric(roi.follower_growth_pct),
        followerCost: numeric(roi.cost_per_follower),
        newLeads: numeric(roi.new_leads),
        totalLeads: numeric(roi.ttl_leads),
        leadGrowth: numeric(roi.lead_growth_pct),
        leadCost: numeric(roi.cost_per_lead),
        websiteTraffic: numeric(roi.website_traffic),
        adSpend: numeric(roi.ad_spend),
        totalRevenue: numeric(roi.total_booking_revenue),
        totalRevenueLy: numeric(roi.ly_total_booking_revenue),
        directRevenue: numeric(roi.direct_booking_revenue),
        directRevenueLy: numeric(roi.ly_direct_booking_revenue),
        directSplit: numeric(roi.direct_booking_split_pct),
        // Raw values preserved for N/A / missing display logic
        igViewsRaw: roi.ig_views,
        fbViewsRaw: roi.fb_views,
        tiktokViewsRaw: roi.tiktok_views,
        igFollowersRaw: roi.ig_followers,
        fbFollowersRaw: roi.fb_followers,
        tiktokFollowersRaw: roi.tiktok_followers,
        newLeadsRaw: roi.new_leads,
        totalLeadsRaw: roi.ttl_leads,
        websiteTrafficRaw: roi.website_traffic,
        adSpendRaw: roi.ad_spend,
        totalRevenueRaw: roi.total_booking_revenue,
        directRevenueRaw: roi.direct_booking_revenue,
        directSplitRaw: roi.direct_booking_split_pct,
        followerGrowthRaw: roi.follower_growth_pct,
        leadGrowthRaw: roi.lead_growth_pct
      };
    }).filter(Boolean);
  }

  function filterMetaRows(monthKeys, rows, roiRows) {
    const allowed = new Set(monthKeys);
    const filteredRows = rows
      .filter(function (row) {
        return allowed.has(toMonthKey(row.year, row.month)) && isIncludedMetaCampaign(row.campaign_type);
      })
      .map(function (row) {
        return {
          key: toMonthKey(row.year, row.month),
          label: formatMonthKey(toMonthKey(row.year, row.month)),
          shortLabel: formatShortMonthKey(toMonthKey(row.year, row.month)),
          shortYearLabel: formatShortMonthYearKey(toMonthKey(row.year, row.month)),
          monthIndex: monthKeys.indexOf(toMonthKey(row.year, row.month)),
          campaignType: row.campaign_type || "Campaign",
          spend: numeric(row.spend),
          impressions: numeric(row.impressions),
          profileVisits: numeric(row.profile_visits),
          costPerVisit: row.cost_per_visit,
          leadsFollowers: row.leads_followers,
          costPerLeadFollower: row.cost_per_lead_follower,
          igBioLeads: row.ig_bio_leads,
          bookingsEmail: row.bookings_email_matched,
          bookingsFb: row.bookings_fb_events,
          costPerBooking: row.cost_per_booking,
          avgBookingValue: row.avg_booking_value,
          revenue: row.revenue,
          roas: row.roas,
          blendedRoas: row.blended_roas,
          pctAvgBookingValue: row.pct_avg_booking_value,
          comments: row.comments || ""
        };
      });

    // Merge rows with same month + campaign_type (multiple ad sets in same campaign)
    const mergeMap = {};
    filteredRows.forEach(function (row) {
      const mergeKey = row.key + "||" + row.campaignType.toLowerCase();
      if (!mergeMap[mergeKey]) {
        mergeMap[mergeKey] = Object.assign({}, row);
      } else {
        const base = mergeMap[mergeKey];
        base.spend        += numeric(row.spend);
        base.impressions  += numeric(row.impressions);
        base.profileVisits += numeric(row.profileVisits);
        base.leadsFollowers = (numeric(base.leadsFollowers) + numeric(row.leadsFollowers)) || base.leadsFollowers;
        base.igBioLeads   = (numeric(base.igBioLeads) + numeric(row.igBioLeads)) || base.igBioLeads;
        base.bookingsEmail = (numeric(base.bookingsEmail) + numeric(row.bookingsEmail)) || base.bookingsEmail;
        base.bookingsFb   = (numeric(base.bookingsFb) + numeric(row.bookingsFb)) || base.bookingsFb;
        base.revenue      = (numeric(base.revenue) + numeric(row.revenue));
        // Recalculate derived metrics
        const totalBookings = numeric(base.bookingsEmail) + numeric(base.bookingsFb);
        base.roas = base.spend > 0 ? base.revenue / base.spend : 0;
        base.costPerBooking = totalBookings > 0 ? base.spend / totalBookings : null;
        // Keep avg booking value from whichever row has it
        base.avgBookingValue = base.avgBookingValue || row.avgBookingValue;
        base.blendedRoas = base.blendedRoas || row.blendedRoas;
        base.comments = [base.comments, row.comments].filter(Boolean).join(" ");
      }
    });

    return Object.values(mergeMap);
  }

  function isIncludedMetaCampaign(campaignType) {
    var normalized = String(campaignType || "").trim().toLowerCase();
    return normalized.indexOf("discovery") !== -1 || normalized.indexOf("retarget") !== -1;
  }

  function getHistoricalMonthKeys(rows, selectedMonth, limit) {
    const monthSet = rows.reduce(function (set, row) {
      const key = toMonthKey(row.year, row.month);
      if (key <= selectedMonth) {
        set.add(key);
      }
      return set;
    }, new Set());

    return Array.from(monthSet).sort().slice(-limit);
  }

  function getAllMonthKeys(rows) {
    return Array.from(rows.reduce(function (set, row) {
      set.add(toMonthKey(row.year, row.month));
      return set;
    }, new Set())).sort();
  }

  function getClientMonthBounds(clientSlug) {
    const canonicalClientSlug = canonicalizeClientSlug(clientSlug);
    const roiKeys = getAllMonthKeys(getPerformanceRoiRows(canonicalClientSlug));
    const metaKeys = getAllMonthKeys(getMetaRows(canonicalClientSlug));
    const allKeys = Array.from(new Set(roiKeys.concat(metaKeys))).sort();

    return {
      min: allKeys[0] || DEFAULT_MONTH,
      max: allKeys[allKeys.length - 1] || DEFAULT_MONTH
    };
  }

  function syncMonthInputBounds(clientSlug) {
    const bounds = getClientMonthBounds(clientSlug);
    els.monthInput.min = bounds.min;
    els.monthInput.max = bounds.max;

    if (!els.monthInput.value || els.monthInput.value > bounds.max) {
      els.monthInput.value = bounds.max;
    }

    if (els.monthInput.value < bounds.min) {
      els.monthInput.value = bounds.min;
    }

    return bounds;
  }

  function getFollowerStartValue(months) {
    if (!months.length || months.length === 1) {
      return 0;
    }
    const firstValue = numeric(months[0].totalFollowers);
    if (firstValue > 0) {
      return firstValue;
    }
    return numeric((months[1] && months[1].totalFollowers) || 0);
  }

  function getPlatformStartValue(months, key) {
    if (!months.length || months.length === 1) {
      return 0;
    }
    const firstValue = numeric(months[0][key]);
    if (firstValue > 0) {
      return firstValue;
    }
    return numeric((months[1] && months[1][key]) || 0);
  }

  function getLeadStartValue(months) {
    if (!months.length || months.length === 1) {
      return 0;
    }
    const candidate = months.slice(0, Math.min(months.length, 4)).find(function (month) {
      return numeric(month.newLeads) > 0;
    });
    return candidate ? numeric(candidate.newLeads) : 0;
  }

  function formatPositiveImprovementNote(previousValue, currentValue) {
    const delta = percentDelta(previousValue, currentValue);
    if (!(delta > 0)) {
      return "";
    }
    return "↑ " + formatPercent(delta, 0) + " vs prev";
  }

  function formatCurrencyComparisonNote(previousValue, currentValue) {
    const previous = numeric(previousValue);
    const current = numeric(currentValue);
    const difference = current - previous;

    if (!previous) {
      return "As of selected month";
    }
    if (difference > 0) {
      return formatRoiCompactCurrency(difference) + " above prev";
    }
    if (difference < 0) {
      return formatRoiCompactCurrency(Math.abs(difference)) + " below prev";
    }
    return "Flat vs prev";
  }

  function formatPercentComparisonNote(previousValue, currentValue) {
    const delta = percentDelta(previousValue, currentValue);
    if (!previousValue && !currentValue) {
      return "";
    }
    return (delta > 0 ? "+" : "") + formatPercent(delta, 0) + " vs prev";
  }

  function renderRoiDashboard(selectedMonth) {
    const totals = summarizeRoi(state.roiMonths);
    const metaSpendTotal = sumMetric(state.metaRows || [], "spend");
    const effectiveAdSpend = metaSpendTotal > 0 ? metaSpendTotal : totals.adSpend;
    const peakViewsMonth = highestMonth(state.roiMonths, "totalViews");
    const peakTiktokMonth = highestMonth(state.roiMonths, "tiktokViews");
    const peakTrafficMonth = highestMonth(state.roiMonths, "websiteTraffic");
    const peakLeadsMonth = highestMonth(state.roiMonths, "newLeads");
    const peakRevenueMonth = highestMonth(state.roiMonths, "totalRevenue");
    const peakDirectRevenueMonth = highestMonth(state.roiMonths, "directRevenue");
    const bestSplitMonth = highestMonth(state.roiMonths, "directSplit");
    const latestMonth = state.roiMonths[state.roiMonths.length - 1];
    const firstMonth = state.roiMonths[0];
    const previousMonth = state.roiMonths.length > 1 ? state.roiMonths[state.roiMonths.length - 2] : null;
    const latestFollowers = latestMonth ? numeric(latestMonth.totalFollowers) : 0;
    const startedFollowers = previousMonth ? numeric(previousMonth.totalFollowers) : 0;
    const netNewFollowers = latestFollowers - startedFollowers;
    const startedLeads = previousMonth ? numeric(previousMonth.newLeads) : 0;
    const currentLeads = latestMonth ? numeric(latestMonth.newLeads) : 0;

    syncClientFrame(state.client, selectedMonth);
    setText(els.dateRangeLabel, "Social · " + firstMonth.label + " – " + latestMonth.label);
    setText(els.takeawayPeriodLabel, "(" + firstMonth.label + " – " + latestMonth.label + ")");

    setStatText(els.summaryNewFollowers, latestMonth ? latestMonth.totalRevenueRaw : null, formatRoiCompactCurrency);
    setStatText(els.summaryTotalImpressions, latestMonth ? latestMonth.directRevenueRaw : null, formatRoiCompactCurrency);
    setStatText(els.summaryTotalRevenue, latestMonth ? latestMonth.directSplitRaw : null, function(v) { return formatPercent(v, 0); });
    setStatText(els.summaryAvgCostPerLead, latestMonth ? latestMonth.newLeadsRaw : null, formatRoiCompactNumber);
    setText(els.summaryNewLeads, formatRoiCompactNumber(latestMonth ? numeric(latestMonth.netNewFollowers) : 0));
    setDefaultRoiOverviewLabels();

    const defaultOverviewItems = [
      peakViewsMonth
        ? peakViewsMonth.label + " delivered the strongest visibility with " + formatNumber(peakViewsMonth.totalViews) + " total views."
        : "View data is available from the workbook for the selected months.",
      "Social following grew from " + formatNumber(startedFollowers) + " to " + formatNumber(latestFollowers) + ", adding " + formatNumber(netNewFollowers) + " net new followers.",
      "The selected range generated " + formatNumber(totals.newLeads) + " new leads with an average cost per lead of " + formatCurrency(totals.avgCostPerLead) + ".",
      "Website traffic totaled " + formatNumber(totals.websiteTraffic) + " sessions while ad spend reached " + formatCurrency(effectiveAdSpend, 0) + ".",
      "Direct booking revenue totaled " + formatCurrency(totals.directRevenue, 0) + ", representing a " + formatPercent(totals.directSplitShare, 0) + " direct split.",
      peakRevenueMonth
        ? peakRevenueMonth.label + " was the top revenue month at " + formatCurrency(peakRevenueMonth.totalRevenue, 0) + "."
        : "Revenue data is loaded from the workbook."
    ];
    renderList(els.summaryOverviewList, defaultOverviewItems);
    applyRoiAnalysis(canonicalizeClientSlug(state.client && state.client.slug), selectedMonth);

    const latestMonthLabel = latestMonth ? latestMonth.label : "Selected month";
    setText(els.summaryNote1, latestMonthLabel);
    setText(els.summaryNote2, latestMonthLabel);
    setText(els.summaryNote3, latestMonthLabel);
    setText(els.summaryAvgCostPerLeadNote, latestMonthLabel);
    setText(els.summaryNote5, latestMonthLabel);
    setText(els.summaryNote6, latestMonthLabel);

    const currentViewsTotal = latestMonth ? numeric(latestMonth.totalViews) : 0;
    const currentMetaMonth = state.metaModel && state.metaModel.months && state.metaModel.months.length
      ? state.metaModel.months[state.metaModel.months.length - 1]
      : null;
    setText(els.summaryDirectSplitAvg, formatRoiCompactNumber(currentViewsTotal));
    const currentFbViews = latestMonth ? numeric(latestMonth.fbViews) : 0;
    const currentInstagramViews = latestMonth ? numeric(latestMonth.igViews) : 0;
    const currentTiktokViews = latestMonth ? numeric(latestMonth.tiktokViews) : 0;
    const metaShare = share(currentFbViews, currentViewsTotal);
    const instagramShare = share(currentInstagramViews, currentViewsTotal);
    const tiktokShare = share(currentTiktokViews, currentViewsTotal);
    setStatText(els.contentInstagramViews, latestMonth ? latestMonth.igViewsRaw : null, formatNumber);
    setStatText(els.contentMetaViews, latestMonth ? latestMonth.fbViewsRaw : null, formatNumber);
    setStatText(els.contentTiktokViews, latestMonth ? latestMonth.tiktokViewsRaw : null, formatNumber);
    setText(els.contentTotalViewsDisplay, formatRoiCompactNumber(currentViewsTotal));
    setText(els.contentTotalViewsSubcopy, latestMonth ? "Across all platforms, " + latestMonth.label : "Across all platforms");
    setText(els.contentTiktokPeakText, latestMonth ? latestMonth.label + " current" : "Current month");
    setText(els.contentMetaShareText, formatPercent(metaShare, 0));
    setText(els.contentInstagramShareText, formatPercent(instagramShare, 0));
    setText(els.contentTiktokShareText, tiktokShare > 0 && tiktokShare < 0.01 ? "<1%" : formatPercent(tiktokShare, 0));
    setText(els.contentMetaNote, formatPercent(metaShare, 0) + " of total");
    setText(els.contentInstagramNote, formatPercent(instagramShare, 0) + " of total");
    setBarWidth(els.contentMetaShareBar, metaShare);
    setBarWidth(els.contentInstagramShareBar, instagramShare);
    setBarWidth(els.contentTiktokShareBar, tiktokShare);
    setText(
      els.contentPeakPill,
      latestMonth
        ? latestMonth.shortLabel + " current " + formatRoiCompactNumber(currentViewsTotal)
        : "Current -"
    );
    setText(els.contentViewsChartSub, latestMonth ? "Platform breakdown · " + formatShortMonthYearKey(latestMonth.key) : "Platform breakdown");

    const instagramStart = previousMonth ? numeric(previousMonth.igFollowers) : 0;
    const instagramCurrent = latestMonth ? numeric(latestMonth.igFollowers) : 0;
    const instagramNetNew = instagramCurrent - instagramStart;
    const facebookStart = previousMonth ? numeric(previousMonth.fbFollowers) : 0;
    const facebookCurrent = latestMonth ? numeric(latestMonth.fbFollowers) : 0;
    const facebookNetNew = facebookCurrent - facebookStart;
    const tiktokStart = previousMonth ? numeric(previousMonth.tiktokFollowers) : 0;
    const tiktokCurrent = latestMonth ? numeric(latestMonth.tiktokFollowers) : 0;
    const tiktokNetNew = tiktokCurrent - tiktokStart;
    const totalPlatformNetNew = instagramNetNew + facebookNetNew + tiktokNetNew;
    const audienceMonthLabel = latestMonth ? "(" + latestMonth.label + ")" : "(Selected month)";
    const previousMonthLabel = previousMonth ? previousMonth.label : "Previous month";
    const currentMonthLabel = latestMonth ? latestMonth.label : "Selected month";
    const currentMonthBracketLabel = latestMonth ? "(" + latestMonth.label + ")" : "(Selected month)";

    setText(els.audienceTotalFollowers, formatNumber(latestFollowers));
    setText(els.audienceTotalMonthLabel, audienceMonthLabel);
    setTrendBadge(els.audienceGrowthBadge, percentDelta(startedFollowers, latestFollowers));
    setText(els.audienceStartedFollowersLabel, "(" + previousMonthLabel + ")");
    setText(els.audienceStartedFollowers, formatNumber(startedFollowers));
    setText(els.audienceNetNewFollowersLabel, "Net New (" + currentMonthLabel + ")");
    setText(els.audienceNetNewFollowers, formatSignedNumber(totalPlatformNetNew));

    setStatText(els.audienceInstagramFollowers, latestMonth ? latestMonth.igFollowersRaw : null, formatNumber);
    setText(els.audienceInstagramMonthLabel, audienceMonthLabel);
    setTrendBadge(els.audienceInstagramNote, percentDelta(instagramStart, instagramCurrent));
    setText(els.audienceInstagramStartLabel, "(" + previousMonthLabel + ")");
    setText(els.audienceInstagramStart, formatNumber(instagramStart));
    setText(els.audienceInstagramNetNewLabel, "Net New (" + currentMonthLabel + ")");
    setText(els.audienceInstagramShare, formatSignedNumber(instagramNetNew));
    setStatText(els.audienceFacebookFollowers, latestMonth ? latestMonth.fbFollowersRaw : null, formatNumber);
    setText(els.audienceFacebookMonthLabel, audienceMonthLabel);
    setTrendBadge(els.audienceFacebookNote, percentDelta(facebookStart, facebookCurrent));
    setText(els.audienceFacebookStartLabel, "(" + previousMonthLabel + ")");
    setText(els.audienceFacebookStart, formatNumber(facebookStart));
    setText(els.audienceFacebookNetNewLabel, "Net New (" + currentMonthLabel + ")");
    setText(els.audienceFacebookShare, formatSignedNumber(facebookNetNew));
    setStatText(els.audienceCostPerFollower, latestMonth ? latestMonth.tiktokFollowersRaw : null, formatNumber);
    setText(els.audienceTiktokMonthLabel, audienceMonthLabel);
    setTrendBadge(els.audienceCostPerFollowerNote, percentDelta(tiktokStart, tiktokCurrent));
    setText(els.audienceTiktokStartLabel, "(" + previousMonthLabel + ")");
    setText(els.audienceTiktokFollowers, formatNumber(tiktokStart));
    setText(els.audienceTiktokNetNewLabel, "Net New (" + currentMonthLabel + ")");
    setText(els.audienceTiktokGrowth, formatSignedNumber(tiktokNetNew));
    setText(els.audienceDistributionSub, latestMonth.label + " snapshot");
    setText(els.summaryAvgCostPerLeadNote, "As of " + latestMonthLabel);

    setStatText(els.websiteTotalSessions, latestMonth ? latestMonth.websiteTrafficRaw : null, formatRoiCompactNumber);
    setText(els.websiteSessionsMonthLabel, currentMonthBracketLabel);
    setText(els.websiteTotalSessionsNote, latestMonth ? latestMonth.label : "Selected month");
    setText(els.websitePeakLabel, peakTrafficMonth ? peakTrafficMonth.shortLabel.toUpperCase() + " " + peakTrafficMonth.key.slice(0, 4) + " PEAK" : "Peak Month");
    setText(els.websitePeakValue, peakTrafficMonth ? formatNumber(peakTrafficMonth.websiteTraffic) : "0");
    setText(els.websiteTotalAdSpend, formatCurrency(currentMetaMonth ? currentMetaMonth.totalSpend : 0, 0));
    setText(els.websiteTotalAdSpendNote, latestMonth ? latestMonth.label : "Selected month");
    setText(
      els.websiteTrafficChartSub,
      peakTrafficMonth
        ? "Monthly sessions · bell curve peaking " + peakTrafficMonth.shortLabel + " " + peakTrafficMonth.key.slice(0, 4)
        : "Monthly sessions"
    );

    const previousPipeline = previousMonth ? numeric(previousMonth.totalLeads) : 0;
    const totalPipeline = latestMonth ? numeric(latestMonth.totalLeads) : 0;
    const pipelineGrowth = totalPipeline - previousPipeline;
    const previousLeadGrowth = previousMonth ? numeric(previousMonth.leadGrowth) : 0;
    const currentLeadGrowth = latestMonth ? numeric(latestMonth.leadGrowth) : 0;
    const previousMonthRevenueLabel = previousMonth ? "Past Month (" + previousMonth.label + ")" : "Past Month";
    setStatText(els.leadNewLeadsValue, latestMonth ? latestMonth.newLeadsRaw : null, formatRoiCompactNumber);
    setText(els.leadNewLeadsMonthLabel, currentMonthBracketLabel);
    setText(els.leadNewLeadsNote, latestMonth ? latestMonth.label : "Selected month");
    setText(els.leadPipelineGrowth, formatSignedNumber(pipelineGrowth));
    setText(els.leadTotalPipeline, formatRoiCompactNumber(totalPipeline));
    setText(els.leadPipelineMonthLabel, currentMonthBracketLabel);
    setText(
      els.leadPipelineNote,
      latestMonth ? "Total leads as of " + latestMonth.label : "Total leads current month"
    );
    setText(els.leadAvgCostPerLead, formatPercentPoints(currentLeadGrowth * 100));
    setText(els.leadGrowthMonthLabel, currentMonthBracketLabel);
    setText(
      els.leadGrowthNote,
      previousMonth && latestMonth
        ? "Growth from " + previousMonth.label + " to " + latestMonth.label
        : "Growth from previous month to current month"
    );
    setText(
      els.newLeadsChartSub,
      peakLeadsMonth
        ? peakLeadsMonth.label + " peak · " + formatNumber(peakLeadsMonth.newLeads) + " leads"
        : "Monthly lead acquisition"
    );
    setText(els.totalLeadsChartSub, "Cumulative leads · " + formatNumber(firstMonth.totalLeads) + " → " + formatNumber(latestMonth.totalLeads));

    setStatText(els.revenueTotalValue, latestMonth ? latestMonth.totalRevenueRaw : null, formatRoiCompactCurrency);
    setText(els.revenueTotalMonthLabel, currentMonthBracketLabel);
    setText(els.revenuePastMonthLabel, previousMonthRevenueLabel);
    setStatText(els.revenueDirectValue, latestMonth ? latestMonth.directRevenueRaw : null, formatRoiCompactCurrency);
    setText(els.revenueDirectMonthLabel, currentMonthBracketLabel);
    setText(els.revenueDirectShareValue, formatPercent(totals.directSplitShare, 0));
    setText(els.revenueDirectPastMonthLabel, previousMonthRevenueLabel);
    setStatText(els.revenueDirectPeakMonth, previousMonth ? previousMonth.directRevenueRaw : null, formatRoiCompactCurrency);
    setStatText(els.revenueDirectSplitAvg, latestMonth ? latestMonth.directSplitRaw : null, function(v) { return formatPercent(v, 0); });
    setText(els.revenueSplitMonthLabel, currentMonthBracketLabel);
    setText(els.revenueVsLastYear, formatRoiCompactCurrency(totals.totalRevenue / Math.max(state.roiMonths.length, 1)));
    setStatText(els.revenuePeakMonth, previousMonth ? previousMonth.totalRevenueRaw : null, formatRoiCompactCurrency);
    setText(els.revenueSplitDirectValue, formatPercent(totals.avgDirectSplit, 0));
    setText(els.revenueSplitPastMonthLabel, previousMonthRevenueLabel);
    setStatText(els.revenueSplitPeakMonth, previousMonth ? previousMonth.directSplitRaw : null, function(v) { return formatPercent(v, 0); });
    setText(
      els.revenueChartSub,
      peakRevenueMonth
        ? peakRevenueMonth.label + " peak · " + formatCurrency(peakRevenueMonth.totalRevenue, 0)
        : "Monthly revenue comparison"
    );
    setText(els.bookingSplitChartSub, "Monthly % · direct bookings");

    const currentFunnelViews = latestMonth ? numeric(latestMonth.totalViews) : 0;
    const currentFunnelFollowers = latestMonth ? numeric(latestMonth.totalFollowers) : 0;
    const currentFunnelSessions = latestMonth ? numeric(latestMonth.websiteTraffic) : 0;
    const currentFunnelLeads = latestMonth ? numeric(latestMonth.newLeads) : 0;
    const currentFunnelRevenue = latestMonth ? numeric(latestMonth.directRevenue) : 0;
    const funnelShowcaseWidths = {
      views: 1,
      followers: 0.78,
      sessions: 0.55,
      leads: 0.34,
      revenue: 0.14
    };
    setStatText(els.funnelViewsValue, latestMonth ? latestMonth.igViewsRaw : null, function() { return formatRoiCompactNumber(currentFunnelViews); });
    setBarWidth(els.funnelViewsFill, funnelShowcaseWidths.views);
    setText(els.funnelFollowersValue, formatRoiCompactNumber(currentFunnelFollowers));
    setBarWidth(els.funnelFollowersFill, funnelShowcaseWidths.followers);
    setStatText(els.funnelSessionsValue, latestMonth ? latestMonth.websiteTrafficRaw : null, formatRoiCompactNumber);
    setBarWidth(els.funnelSessionsFill, funnelShowcaseWidths.sessions);
    setStatText(els.funnelLeadsValue, latestMonth ? latestMonth.newLeadsRaw : null, formatRoiCompactNumber);
    setBarWidth(els.funnelLeadsFill, funnelShowcaseWidths.leads);
    setStatText(els.funnelRevenueValue, latestMonth ? latestMonth.directRevenueRaw : null, formatRoiCompactCurrency);
    setBarWidth(els.funnelRevenueFill, funnelShowcaseWidths.revenue);
    setText(els.funnelFollowersConv, "↓ " + formatPercent(share(currentFunnelFollowers, currentFunnelViews), 1) + " to followers ↓");
    setText(els.funnelTrafficConv, "↓ " + formatPercent(share(currentFunnelSessions, currentFunnelFollowers), 1) + " to website sessions ↓");
    setText(els.funnelLeadsConv, "↓ " + formatPercent(share(currentFunnelLeads, currentFunnelSessions), 1) + " to leads ↓");
    setText(els.funnelRevenueConv, "↓ revenue ↓");
    setText(els.funnelCostFollower, formatCurrency(currentFunnelFollowers ? numeric(latestMonth.adSpend) / currentFunnelFollowers : 0));
    setText(els.funnelCostLead, formatCurrency(currentFunnelLeads ? numeric(latestMonth.adSpend) / currentFunnelLeads : 0));
    setText(els.funnelRevenuePerSpend, "$" + round2(currentFunnelViews && latestMonth && numeric(latestMonth.adSpend) ? currentFunnelRevenue / numeric(latestMonth.adSpend) : 0));
    setText(els.funnelRevenuePerSpendNote, formatCurrency(latestMonth ? numeric(latestMonth.adSpend) : 0, 0) + " spend → " + formatCurrency(currentFunnelRevenue, 0) + " direct revenue");

    renderRoiCharts();
  }

  function renderRoiEmpty(selectedMonth) {
    syncClientFrame(state.client, selectedMonth);
    setText(els.dateRangeLabel, "Social · " + formatMonthKey(selectedMonth));

    setText(els.summaryTotalImpressions, "0");
    setText(els.summaryNewFollowers, "0");
    setText(els.summaryNewLeads, "0");
    setText(els.summaryTotalRevenue, "$0");
    setText(els.summaryDirectSplitAvg, "0%");
    setText(els.summaryAvgCostPerLead, "0");
    setText(els.summaryAvgCostPerLeadNote, "As of selected month");
    setDefaultRoiOverviewLabels();

    setText(els.contentInstagramViews, "0");
    setText(els.contentMetaViews, "0");
    setText(els.contentTiktokViews, "0");
    setText(els.contentTotalViewsDisplay, "0");
    setText(els.contentTotalViewsSubcopy, "Across all platforms");
    setText(els.contentTiktokPeakText, "Growing");
    setText(els.contentMetaShareText, "0%");
    setText(els.contentInstagramShareText, "0%");
    setText(els.contentTiktokShareText, "0%");
    setText(els.contentMetaNote, "0% of total");
    setText(els.contentInstagramNote, "0% of total");
    setBarWidth(els.contentMetaShareBar, 0);
    setBarWidth(els.contentInstagramShareBar, 0);
    setBarWidth(els.contentTiktokShareBar, 0);
    setText(els.contentPeakPill, "Peak -");
    setText(els.contentViewsChartSub, "Platform breakdown");

    setText(els.audienceTotalFollowers, "0");
    setTrendBadge(els.audienceGrowthBadge, 0);
    setText(els.audienceStartedFollowersLabel, "(Previous month)");
    setText(els.audienceStartedFollowers, "0");
    setText(els.audienceNetNewFollowersLabel, "Net New (Selected month)");
    setText(els.audienceNetNewFollowers, "0");
    setText(els.audienceInstagramFollowers, "0");
    setText(els.audienceInstagramNote, "0%");
    setText(els.audienceInstagramStartLabel, "(Previous month)");
    setText(els.audienceInstagramStart, "0");
    setText(els.audienceInstagramNetNewLabel, "Net New (Selected month)");
    setText(els.audienceInstagramShare, "0");
    setText(els.audienceFacebookFollowers, "0");
    setText(els.audienceFacebookNote, "0%");
    setText(els.audienceFacebookStartLabel, "(Previous month)");
    setText(els.audienceFacebookStart, "0");
    setText(els.audienceFacebookNetNewLabel, "Net New (Selected month)");
    setText(els.audienceFacebookShare, "0%");
    setText(els.audienceCostPerFollower, "0");
    setText(els.audienceCostPerFollowerNote, "3-month total");
    setText(els.audienceTiktokStartLabel, "(Previous month)");
    setText(els.audienceTiktokFollowers, "0");
    setText(els.audienceTiktokNetNewLabel, "Net New (Selected month)");
    setText(els.audienceTiktokGrowth, "0%");
    setText(els.audienceDistributionSub, "Latest month snapshot");

    setText(els.websiteTotalSessions, "0");
    setText(els.websiteSessionsMonthLabel, "(Selected month)");
    setText(els.websiteTotalSessionsNote, "Selected month");
    setText(els.websitePeakLabel, "Peak Month");
    setText(els.websitePeakValue, "0");
    setText(els.websiteTotalAdSpend, "$0");
    setText(els.websiteTotalAdSpendNote, "Selected month");
    setText(els.websiteTrafficChartSub, "Monthly sessions");
    setText(els.leadNewLeadsValue, "0");
    setText(els.leadNewLeadsMonthLabel, "(Selected month)");
    setText(els.leadNewLeadsNote, "Selected month");
    setText(els.leadPipelineGrowth, "0");
    setText(els.leadTotalPipeline, "0");
    setText(els.leadPipelineMonthLabel, "(Selected month)");
    setText(els.leadPipelineNote, "Current - previous month");
    setText(els.leadAvgCostPerLead, "0");
    setText(els.leadGrowthMonthLabel, "(Selected month)");
    setText(els.leadGrowthNote, "Growth from previous month to current month");
    setText(els.newLeadsChartSub, "Monthly lead acquisition");
    setText(els.totalLeadsChartSub, "Cumulative leads");
    setText(els.revenueTotalValue, "$0");
    setText(els.revenueTotalMonthLabel, "(Selected month)");
    setText(els.revenueDirectValue, "$0");
    setText(els.revenueDirectMonthLabel, "(Selected month)");
    setText(els.revenueDirectShareValue, "0%");
    setText(els.revenueDirectPeakMonth, "-");
    setText(els.revenueDirectSplitAvg, "0%");
    setText(els.revenueSplitMonthLabel, "(Selected month)");
    setText(els.revenueVsLastYear, "$0");
    setText(els.revenuePastMonthLabel, "Past Month");
    setText(els.revenuePeakMonth, "-");
    setText(els.revenueDirectPastMonthLabel, "Past Month");
    setText(els.revenueSplitDirectValue, "0%");
    setText(els.revenueSplitPastMonthLabel, "Past Month");
    setText(els.revenueSplitPeakMonth, "-");
    setText(els.revenueChartSub, "Monthly revenue comparison");
    setText(els.bookingSplitChartSub, "Monthly direct percentage");
    setText(els.funnelViewsValue, "0");
    setText(els.funnelFollowersValue, "0");
    setText(els.funnelSessionsValue, "0");
    setText(els.funnelLeadsValue, "0");
    setText(els.funnelRevenueValue, "$0");
    setText(els.funnelFollowersConv, "↓ to followers ↓");
    setText(els.funnelTrafficConv, "↓ to sessions ↓");
    setText(els.funnelLeadsConv, "↓ to leads ↓");
    setText(els.funnelRevenueConv, "↓ to revenue ↓");
    setText(els.funnelCostFollower, "$0.00");
    setText(els.funnelCostLead, "$0.00");
    setText(els.funnelRevenuePerSpend, "$0");
    setText(els.funnelRevenuePerSpendNote, "$0 spend → $0 revenue");
    setBarWidth(els.funnelViewsFill, 0);
    setBarWidth(els.funnelFollowersFill, 0);
    setBarWidth(els.funnelSessionsFill, 0);
    setBarWidth(els.funnelLeadsFill, 0);
    setBarWidth(els.funnelRevenueFill, 0);

    var emptyItems = [
      "No workbook performance data was found for the selected client and month range.",
      "Try another month or load a client with available historical reporting."
    ];
    renderList(els.summaryOverviewList, emptyItems);

    destroyCharts("roi-");
  }

  function renderRoiCharts() {
    destroyCharts("roi-");
    buildRoiCharts();
  }

  function buildRoiCharts() {
    const labels = state.roiMonths.map(function (month) {
      return month.label;
    });
    const shortLabels = state.roiMonths.map(function (month) {
      return month.shortLabel + " '" + month.key.slice(2, 4);
    });
    const compactMonthYearLabels = state.roiMonths.map(function (month) {
      return formatShortMonthYearKeyCompact(month.key);
    });
    const axisText = "#64748B";
    const mutedText = "#94A3B8";
    const gridColor = "#E6EEF8";
    const instagramColor = "#2663EB";
    const facebookColor = "#F7AD43";
    const tiktokColor = "#12B981";
    const trafficColor = "#2563EB";
    const leadsColor = "#F59E0B";
    const pipelineColor = "#10B981";
    const totalRevenueColor = "#2563EB";
    const directRevenueColor = "#7C3AED";
    const splitColor = "#2563EB";
    function createChart(id, key, options) {
      const target = document.getElementById(id);
      if (!target) {
        return;
      }
      target.innerHTML = "";
      const chart = new ApexCharts(target, options);
      chart.render().then(function () {
        const svg = target.querySelector("svg");
        if (svg) {
          svg.removeAttribute("role");
          svg.removeAttribute("aria-label");
          svg.removeAttribute("aria-labelledby");
          svg.removeAttribute("title");
        }
        target.removeAttribute("role");
        target.removeAttribute("aria-label");
        target.removeAttribute("aria-labelledby");
        target.removeAttribute("title");
        target.querySelectorAll("title, desc").forEach(function (node) {
          node.remove();
        });
      });
      pushChart(chart, key);
    }

    function sharedChart(height, type) {
      return {
        chart: {
          type: type,
          height: height,
          fontFamily: "Inter, sans-serif",
          toolbar: { show: false },
          accessibility: { enabled: false },
          animations: { enabled: true, easing: "easeinout", speed: 520 },
          zoom: { enabled: false }
        },
        dataLabels: { enabled: false },
        grid: {
          borderColor: gridColor,
          strokeDashArray: 0,
          xaxis: { lines: { show: false } }
        },
        legend: {
          position: "bottom",
          horizontalAlign: "center",
          fontSize: "13px",
          fontWeight: 600,
          labels: { colors: axisText },
          markers: { radius: 4 }
        },
        tooltip: {
          shared: false,
          intersect: true,
          theme: "light"
        }
      };
    }

    function buildResponsiveXAxisLabelOptions(categories, options) {
      options = options || {};
      const breakpoint = getChartLabelBreakpoint();
      const count = Array.isArray(categories) ? categories.length : 0;
      let step = 1;

      if (breakpoint === "xs") {
        step = count > 8 ? 3 : count > 4 ? 2 : 1;
      } else if (breakpoint === "sm") {
        step = count > 10 ? 3 : count > 5 ? 2 : 1;
      } else if (breakpoint === "md") {
        step = count > 12 ? 2 : 1;
      }

      const rotate = typeof options.rotate === "number"
        ? options.rotate
        : breakpoint === "xs"
          ? -55
          : breakpoint === "sm"
            ? -40
            : 0;
      const fontSize = breakpoint === "xs" ? "10px" : breakpoint === "sm" ? "11px" : "12px";
      const minHeight = rotate ? (breakpoint === "xs" ? 62 : 52) : 36;
      const maxHeight = rotate ? (breakpoint === "xs" ? 62 : 52) : 40;

      return {
        hideOverlappingLabels: false,
        trim: false,
        rotate: rotate,
        rotateAlways: rotate !== 0,
        minHeight: minHeight,
        maxHeight: maxHeight,
        offsetY: options.offsetY || 0,
        style: {
          colors: options.colors || axisText,
          fontSize: fontSize,
          fontWeight: options.fontWeight || 600
        },
        formatter: function (value, _timestamp, opts) {
          const index = opts && typeof opts.i === "number" ? opts.i : categories.indexOf(value);
          if (step > 1 && index >= 0 && index % step !== 0 && index !== count - 1) {
            return "";
          }
          return value;
        }
      };
    }

    function sharedAxis(yFormatter, extra) {
      extra = extra || {};
      return {
        xaxis: {
          categories: shortLabels,
          labels: buildResponsiveXAxisLabelOptions(shortLabels),
          axisBorder: { show: false },
          axisTicks: { color: gridColor }
        },
        yaxis: {
          min: typeof extra.min === "number" ? extra.min : undefined,
          labels: {
            style: {
              colors: mutedText,
              fontSize: "12px",
              fontWeight: 600
            },
            formatter: yFormatter
          }
        },
        tooltip: {
          y: {
            formatter: extra.tooltipFormatter || yFormatter
          }
        },
        legend: extra.showLegend === false ? { show: false } : undefined
      };
    }

    function paddedAxisBounds(values) {
      const cleaned = (Array.isArray(values) ? values : []).map(numeric).filter(function (value) {
        return isFinite(value);
      });
      if (!cleaned.length) {
        return { min: 0, max: undefined };
      }

      const min = Math.min.apply(null, cleaned);
      const max = Math.max.apply(null, cleaned);
      const span = Math.max(max - min, 1);
      const padding = Math.max(Math.round(span * 0.2), Math.round(max * 0.05), 25);

      return {
        min: Math.max(0, min - padding),
        max: max + padding
      };
    }

    createChart("followersChart", "roi-followers", {
      series: [
        { name: "Instagram", data: state.roiMonths.map(function (month) { return month.igFollowers; }) },
        { name: "Facebook", data: state.roiMonths.map(function (month) { return month.fbFollowers; }) },
        { name: "TikTok", data: state.roiMonths.map(function (month) { return month.tiktokFollowers; }) }
      ],
      chart: {
        type: "bar",
        height: 240,
        fontFamily: "Inter, sans-serif",
        toolbar: { show: false },
        accessibility: { enabled: false },
        animations: { enabled: true, easing: "easeinout", speed: 520 },
        zoom: { enabled: false }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "55%",
          borderRadius: 6,
          borderRadiusApplication: "end"
        }
      },
      dataLabels: { enabled: false },
      stroke: {
        show: true,
        width: 2,
        colors: ["transparent"]
      },
      xaxis: {
        categories: shortLabels,
        labels: {
          style: { colors: axisText, fontSize: "12px", fontWeight: 600 }
        },
        axisBorder: { show: false },
        axisTicks: { color: gridColor }
      },
      yaxis: {
        labels: {
          style: { colors: mutedText, fontSize: "12px", fontWeight: 600 },
          formatter: formatNumber
        }
      },
      fill: { opacity: 1 },
      tooltip: {
        shared: false,
        intersect: true,
        theme: "light",
        y: {
          formatter: function (value) {
            return formatNumber(value) + " followers";
          }
        }
      },
      colors: [instagramColor, facebookColor, tiktokColor],
      grid: {
        borderColor: gridColor,
        strokeDashArray: 0,
        xaxis: { lines: { show: false } }
      },
      legend: {
        position: "bottom",
        horizontalAlign: "center",
        fontSize: "13px",
        fontWeight: 600,
        labels: { colors: axisText },
        markers: { radius: 4 }
      }
    });

    const latest = state.roiMonths[state.roiMonths.length - 1];
    createChart("followersDonutChart", "roi-donut", Object.assign(
      sharedChart(240, "donut"),
      {
        series: [latest.igFollowers, latest.fbFollowers, latest.tiktokFollowers],
        labels: ["Instagram", "Facebook", "TikTok"],
        colors: [instagramColor, facebookColor, tiktokColor],
        stroke: {
          colors: ["#ffffff"],
          width: 4
        },
        plotOptions: {
          pie: {
            donut: {
              size: "70%",
              labels: {
                show: true,
                value: {
                  show: true,
                  fontSize: "18px",
                  fontWeight: 700,
                  color: axisText,
                  offsetY: 18,
                  formatter: function (value) {
                    return formatPercent(share(numeric(value), latest.totalFollowers), 0);
                  }
                },
                total: {
                  show: true,
                  label: latest.shortLabel + " Followers",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: axisText,
                  formatter: function () {
                    return formatNumber(latest.totalFollowers);
                  }
                }
              }
            }
          }
        },
        legend: {
          position: "bottom",
          horizontalAlign: "center",
          fontSize: "13px",
          fontWeight: 600,
          labels: { colors: axisText },
          markers: { radius: 4 }
        },
        tooltip: {
          y: {
            formatter: function (value) {
              return formatNumber(value) + " followers";
            }
          }
        }
      }
    ));

    createChart("websiteTrafficChart", "roi-traffic", Object.assign(
      sharedChart(220, "area"),
      sharedAxis(formatLargeNumber, {
        showLegend: false,
        tooltipFormatter: function (value) { return formatNumber(value) + " sessions"; }
      }),
      {
        series: [{ name: "Website Traffic", data: state.roiMonths.map(function (month) { return month.websiteTraffic; }) }],
        colors: [trafficColor],
        stroke: { curve: "smooth", width: 3.5 },
        fill: {
          type: "gradient",
          gradient: { shadeIntensity: 1, opacityFrom: 0.22, opacityTo: 0.04, stops: [0, 90, 100] }
        },
        markers: {
          size: 5,
          colors: [trafficColor],
          strokeColors: "#ffffff",
          strokeWidth: 2,
          hover: { size: 6 }
        }
      }
    ));

    createChart("newLeadsChart", "roi-leads", Object.assign(
      sharedChart(190, "bar"),
      sharedAxis(formatNumber, {
        showLegend: false,
        tooltipFormatter: function (value) { return formatNumber(value) + " leads"; }
      }),
      {
        series: [{ name: "New Leads", data: state.roiMonths.map(function (month) { return month.newLeads; }) }],
        colors: [leadsColor],
        plotOptions: {
          bar: {
            columnWidth: "42%",
            borderRadius: 8,
            borderRadiusApplication: "end"
          }
        }
      }
    ));

    createChart("totalLeadsChart", "roi-pipeline", Object.assign(
      sharedChart(190, "area"),
      sharedAxis(formatNumber, Object.assign(
        {
          showLegend: false,
          tooltipFormatter: function (value) { return formatNumber(value) + " leads"; }
        },
        paddedAxisBounds(state.roiMonths.map(function (month) { return month.totalLeads; }))
      )),
      {
        series: [{ name: "Total Pipeline", data: state.roiMonths.map(function (month) { return month.totalLeads; }) }],
        colors: [pipelineColor],
        stroke: { curve: "smooth", width: 3.5 },
        fill: {
          type: "gradient",
          gradient: { shadeIntensity: 1, opacityFrom: 0.20, opacityTo: 0.04, stops: [0, 90, 100] }
        },
        markers: {
          size: 5,
          colors: [pipelineColor],
          strokeColors: "#ffffff",
          strokeWidth: 2,
          hover: { size: 6 }
        }
      }
    ));

    createChart("revenueChart", "roi-revenue", {
      series: [
        { name: "Total Revenue", data: state.roiMonths.map(function (month) { return month.totalRevenue; }) },
        { name: "Direct Revenue", data: state.roiMonths.map(function (month) { return month.directRevenue; }) }
      ],
      chart: {
        type: "area",
        height: 190,
        fontFamily: "Inter, sans-serif",
        toolbar: { show: false },
        accessibility: { enabled: false },
        animations: { enabled: true, easing: "easeinout", speed: 520 },
        zoom: { enabled: false }
      },
      dataLabels: { enabled: false },
      stroke: {
        curve: "smooth",
        width: [3.5, 3],
        dashArray: [0, 6]
      },
      xaxis: {
        categories: compactMonthYearLabels,
        tickPlacement: "on",
        labels: buildResponsiveXAxisLabelOptions(compactMonthYearLabels, { offsetY: 4 }),
        axisBorder: { show: false },
        axisTicks: { color: gridColor }
      },
      yaxis: {
        min: 0,
        labels: {
          minWidth: 64,
          style: { colors: mutedText, fontSize: "12px", fontWeight: 600 },
          formatter: formatCurrencyCompact
        }
      },
      fill: {
        type: "gradient",
        gradient: { shadeIntensity: 1, opacityFrom: 0.18, opacityTo: 0.03, stops: [0, 90, 100] }
      },
      colors: [totalRevenueColor, directRevenueColor],
      grid: {
        borderColor: gridColor,
        strokeDashArray: 0,
        xaxis: { lines: { show: false } },
        padding: { left: 8, right: 18, top: 6, bottom: 0 }
      },
      tooltip: {
        shared: true,
        intersect: false,
        theme: "light",
        y: {
          formatter: function (value) {
            return formatCurrency(value, 0);
          }
        }
      },
      markers: {
        size: 4,
        strokeColors: "#ffffff",
        strokeWidth: 2,
        hover: { size: 6 }
      },
      legend: {
        position: "bottom",
        horizontalAlign: "center",
        offsetY: 6,
        fontSize: "13px",
        fontWeight: 600,
        labels: { colors: axisText },
        markers: { radius: 4 }
      }
    });

    createChart("bookingSplitChart", "roi-split", Object.assign(
      sharedChart(190, "bar"),
      sharedAxis(function (value) {
        return Math.round(value) + "%";
      }, {
        showLegend: false,
        tooltipFormatter: function (value) { return Math.round(value) + "%"; }
      }),
      {
        series: [{ name: "Direct Split", data: state.roiMonths.map(function (month) { return month.directSplit * 100; }) }],
        colors: [splitColor],
        plotOptions: {
          bar: {
            columnWidth: "42%",
            borderRadius: 8,
            borderRadiusApplication: "end"
          }
        }
      }
    ));

    const hideLyRevenue = canonicalizeClientSlug(state.client && state.client.slug) === "the-cohost-company";

    const revenueLyAxis = buildTrendAxisBounds(
      state.allRoiMonths.reduce(function (values, month) {
        values.push(month.totalRevenue, month.directRevenue);
        if (!hideLyRevenue) values.push(month.totalRevenueLy);
        return values;
      }, []),
      { step: 25000, tightRangeThreshold: 0.3 }
    );

    const revenueLySeries = [
      { name: "Total Revenue", data: state.allRoiMonths.map(function (month) { return month.totalRevenue; }) },
      { name: "Direct Booking Revenue", data: state.allRoiMonths.map(function (month) { return month.directRevenue; }) }
    ];
    if (!hideLyRevenue) {
      revenueLySeries.push({ name: "LY Revenue", data: state.allRoiMonths.map(function (month) { return month.totalRevenueLy; }) });
    }

    createChart("revenueLyChart", "roi-revenue-ly", {
      series: revenueLySeries,
      chart: {
        type: "line",
        height: 210,
        fontFamily: "Inter, sans-serif",
        toolbar: { show: false },
        accessibility: { enabled: false },
        animations: { enabled: true, easing: "easeinout", speed: 520 },
        zoom: { enabled: false }
      },
      dataLabels: { enabled: false },
      stroke: {
        curve: "smooth",
        width: hideLyRevenue ? [3.5, 3] : [3.5, 3, 3],
        dashArray: hideLyRevenue ? [0, 0] : [0, 0, 7]
      },
      xaxis: {
        categories: state.allRoiMonths.map(function (month) { return formatShortMonthYearKeyCompact(month.key); }),
        tickPlacement: "on",
        labels: buildResponsiveXAxisLabelOptions(
          state.allRoiMonths.map(function (month) { return formatShortMonthYearKeyCompact(month.key); }),
          { offsetY: 4 }
        ),
        axisBorder: { show: false },
        axisTicks: { color: gridColor }
      },
      yaxis: {
        min: revenueLyAxis.min,
        max: revenueLyAxis.max,
        tickAmount: revenueLyAxis.tickAmount,
        labels: {
          minWidth: 64,
          style: { colors: mutedText, fontSize: "12px", fontWeight: 600 },
          formatter: formatCurrencyCompact
        }
      },
      colors: hideLyRevenue ? [totalRevenueColor, directRevenueColor] : [totalRevenueColor, directRevenueColor, "#94A3B8"],
      grid: {
        borderColor: gridColor,
        strokeDashArray: 0,
        xaxis: { lines: { show: false } },
        padding: { left: 8, right: 18, top: 6, bottom: 0 }
      },
      tooltip: {
        shared: true,
        intersect: false,
        theme: "light",
        y: {
          formatter: function (value) {
            return formatCurrency(value, 0);
          }
        }
      },
      markers: {
        size: 4,
        strokeColors: "#ffffff",
        strokeWidth: 2,
        hover: { size: 6 }
      },
      legend: {
        position: "bottom",
        horizontalAlign: "center",
        offsetY: 6,
        fontSize: "13px",
        fontWeight: 600,
        labels: { colors: axisText },
        markers: { radius: 4 }
      }
    });
  }

  function renderMetaView(selectedMonth) {
    const meta = state.metaModel || buildMetaModel(state.metaRows);
    const pendingMetaScrollKey = state.pendingMetaScrollKey;
    state.pendingMetaScrollKey = "";
    var selectedMonthHasNoData = !hasRenderableMetaMonthData(selectedMonth, state.metaRows || []);
    var shouldShowMetaEmptyState = !meta.months.length
      || (
        canonicalizeClientSlug(state.client && state.client.slug) === "hillside-amble"
        && selectedMonth === "2026-05"
        && selectedMonthHasNoData
      );
    var shouldShowComingSoon = !shouldShowMetaEmptyState && selectedMonthHasNoData;
    if (shouldShowMetaEmptyState || shouldShowComingSoon) {
      var emptyBody = shouldShowComingSoon
        ? [
            '<div class="meta-chart-card" style="text-align:center;padding:48px 24px;">',
            '<div class="meta-chart-title" style="font-size:1rem;font-weight:600;margin-bottom:10px;letter-spacing:0.04em;text-transform:uppercase;">Report Coming Soon</div>',
            '<div class="meta-chart-sub" style="font-size:0.9rem;line-height:1.7;">Currently gathering your ' + escapeHtml(formatMonthKey(selectedMonth)) + ' Meta Ads data. Your report will be available shortly.</div>',
            '</div>'
          ].join("")
        : '<div class="meta-chart-card"><div class="meta-chart-title">No Meta Ads data available</div><div class="meta-chart-sub">Select a different month or client to load a 3-month Meta Ads window.</div></div>';
      els.metaView.innerHTML = [
        '<div class="meta-view">',
        '<div class="meta-header">',
        '<div>',
        '<div class="meta-title">' + escapeHtml(state.client.name) + "</div>",
        '<div class="meta-legend"><div class="meta-legend-item">' + escapeHtml(formatMonthKey(selectedMonth)) + "</div></div>",
        '<div class="meta-subtitle">Meta Ads Report</div>',
        "</div></div>",
        '<div class="meta-body">',
        '<section class="meta-section" id="meta-portfolio">',
        '<div class="meta-section-label">Portfolio snapshot — selected months</div>',
        emptyBody,
        "</section></div></div>"
      ].join("");
      destroyCharts("meta-");
      return;
    }

    const legend = '<div class="meta-legend">' + meta.months.map(function (month, index) {
      return '<div class="meta-legend-item"><span class="meta-legend-dot" style="background:' + META_COLORS[index % META_COLORS.length] + ';"></span>' + escapeHtml(month.label) + "</div>";
    }).join("") + "</div>";
    const header = [
      '<div class="meta-view">',
      '<div class="meta-header">',
      '<div>',
      '<div class="meta-title">' + escapeHtml(state.client.name) + "</div>",
      legend,
      '<div class="meta-subtitle">Meta Ads Report</div>',
      "</div>",
      "</div>",
      '<div class="meta-body">',
      renderMetaSummaryStrip(meta),
      renderMetaPortfolio(meta),
      renderMetaCampaignSections(meta),
      renderMetaInsights(meta),
      "</div></div>"
    ].join("");

    els.metaView.innerHTML = header;
    bindMetaViewInteractions();
    if (pendingMetaScrollKey) {
      requestAnimationFrame(function () {
        const target = els.metaView.querySelector('[data-meta-campaign-section="' + pendingMetaScrollKey + '"]');
        if (target && typeof target.scrollIntoView === "function") {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
    renderMetaCharts(meta);
  }

  function hasRenderableMetaMonthData(selectedMonth, rows) {
    if (!selectedMonth) {
      return false;
    }
    var monthRows = (rows || []).filter(function (row) {
      return toMonthKey(row.year, row.month) === selectedMonth;
    });
    if (!monthRows.length) {
      return false;
    }
    return monthRows.some(function (row) {
      return numeric(row.spend) > 0
        || numeric(row.impressions) > 0
        || numeric(row.profile_visits || row.profileVisits) > 0
        || numeric(row.leads_followers || row.leadsFollowers) > 0
        || numeric(row.bookings_email_matched || row.bookingsEmail) > 0
        || numeric(row.bookings_fb_events || row.bookingsFb) > 0;
    });
  }

  function renderPricingEmpty(selectedMonth, clientName, message) {
    if (!els.pricingView) {
      return;
    }
    els.pricingView.innerHTML = [
      '<div class="pricing-ref-shell pricing-ref-shell-empty">',
      '<div class="pp-wrap">',
      '<section class="section visible pricing-ref-hero">',
      '<header class="pp-header">',
      '<div class="pp-eyebrow">Pricing Tool</div>',
      '<h1>' + escapeHtml(clientName || (state.client && state.client.name) || "Pricing Tool") + '</h1>',
      '<div class="pp-subtitle">' + escapeHtml(formatMonthKey(selectedMonth)) + '</div>',
      '</header>',
      '<div class="pricing-empty-card">' + escapeHtml(message || "Pricing data is not available yet for this client.") + '</div>',
      '</section>',
      '</div>',
      '</div>'
    ].join("");
  }

  function hasRevenueIntelligenceMonthData(selectedMonth) {
    return selectedMonth === "2026-05";
  }

  function splitRevenueIntelligenceLocation(name) {
    const raw = String(name || "").split("|").slice(1).join("|").trim();
    if (!raw) {
      return { city: "", state: "" };
    }
    const parts = raw.split(",").map(function (part) {
      return String(part || "").trim();
    }).filter(Boolean);
    if (parts.length >= 2) {
      return { city: parts.slice(0, -1).join(", "), state: parts[parts.length - 1] };
    }
    return { city: raw, state: "" };
  }

  function buildRevenueIntelligencePricingData() {
    const source = state.revenueIntelligenceData || {};
    const breakdown = Array.isArray(source.propertyBreakdown) ? source.propertyBreakdown : [];
    const windowKeys = ["30", "60", "90"];

    if (!breakdown.length) {
      return null;
    }

    const windows = windowKeys.reduce(function (acc, windowKey) {
      acc[windowKey] = {
        all: breakdown.map(function (property) {
          const windowData = (property.windows && property.windows[windowKey]) || {};
          const location = splitRevenueIntelligenceLocation(property.name);
          return {
            id: property.id || property.name,
            name: property.name || "Listing",
            nickname: property.name || "Listing",
            city: location.city,
            state: location.state,
            basePrice: Number(property.adr) || Number(windowData.adr) || 0,
            thumbnail: null,
            totalDays: Number(windowData.totalDays) || 0,
            bookedDays: Number(windowData.bookedNights) || 0,
            availableDays: Number(windowData.availableNights) || 0,
            occupancyRate: Number(windowData.occupancyRate) || 0,
            potentialRevenue: Number(windowData.totalRevenue) || 0,
            recommendations: []
          };
        })
      };
      return acc;
    }, {});

    return {
      windows: windows,
      totalListings: breakdown.length,
      generatedAt: source.generatedAt || "",
      threshold: Number(source.threshold) || 75
    };
  }

  function renderPricingView(selectedMonth) {
    if (!els.pricingView) {
      return;
    }
    if (!state.client || !window.PricingToolModule) {
      renderPricingEmpty(selectedMonth, state.client && state.client.name);
      return;
    }
    if (canonicalizeClientSlug(state.client.slug) === "flohom" || canonicalizeClientSlug(state.client.slug) === "reflections-resorts" || canonicalizeClientSlug(state.client.slug) === "awayframes" || canonicalizeClientSlug(state.client.slug) === "paradise-pointe" || canonicalizeClientSlug(state.client.slug) === "stay-on-30a") {
      if (!hasRevenueIntelligenceMonthData(selectedMonth)) {
        renderPricingEmpty(selectedMonth, state.client && state.client.name, "No pricing data available for this month.");
        return;
      }
      const livePricingData = buildRevenueIntelligencePricingData();
      if (!livePricingData) {
        renderPricingEmpty(selectedMonth, state.client && state.client.name);
        return;
      }
      window.PricingToolModule.render(els.pricingView, {
        data: livePricingData,
        client: state.client,
        selectedMonth: selectedMonth
      });
      return;
    }
    if (!isPricingToolClient(state.client.slug) || !state.pricingToolData) {
      renderPricingEmpty(selectedMonth, state.client && state.client.name);
      return;
    }
    window.PricingToolModule.render(els.pricingView, {
      data: state.pricingToolData,
      client: state.client,
      selectedMonth: selectedMonth
    });
  }

  function renderMetaPortfolio(meta) {
    return [
      '<section class="meta-section" id="meta-portfolio">',
      renderMetaStageHeader("01", "Portfolio Snapshot"),
      renderMetaComparisonTable(meta),
      '<div class="meta-feature-grid">',
      renderMetaChartCard("Revenue vs. Spend Trend", "Monthly direct revenue and total spend", "meta-rev-spend"),
      '<div class="meta-feature-stack">' +
        renderMetaKpiNoSpark("Total ad spend", meta.months, function (month) { return month.totalSpend; }, formatCurrency) +
        renderMetaKpiNoSpark("Avg booking value", meta.months, function (month) { return month.avgBookingValue; }, formatCurrency) +
      '</div>',
      "</div>",
      '<div class="meta-chart-grid meta-chart-grid-2">',
      renderMetaChartCard("Avg booking value trend", "Month-over-month booking value lines shown", "meta-booking-value-trend"),
      renderMetaChartCard("Monthly Revenue by Campaign Type", "How each campaign type contributed each month", "meta-bookings"),
      "</div>",
      "</section>"
    ].join("");
  }

  function renderMetaSummaryStrip(meta) {
    const currentMonth = meta.months && meta.months.length ? meta.months[meta.months.length - 1] : null;
    const currentRows = currentMonth ? meta.rows.filter(function (row) {
      return row.key === currentMonth.key;
    }) : [];
    const currentMonthLabel = currentMonth ? currentMonth.label : "Selected month";
    const currentBookings = currentMonth ? numeric(currentMonth.totalBookings) : 0;
    const currentCostPerBooking = currentBookings ? numeric(currentMonth.totalSpend) / currentBookings : 0;
    const currentFollowers = sumMetric(currentRows, "leadsFollowers");
    const currentViews = sumMetric(currentRows, "impressions");
    const currentLeads = sumMetric(currentRows, "igBioLeads");
    const currentPctAvgBookingValue = averageMetric(currentRows, "pctAvgBookingValue");

    return [
      '<section class="meta-summary-strip">',
      renderMetaSummaryStat("Ad Spend", formatCurrency(currentMonth ? currentMonth.totalSpend : 0, 0), currentMonthLabel),
      renderMetaSummaryStat("Ad Rev", formatCurrency(currentMonth ? currentMonth.attributedRevenue : 0, 0), currentMonthLabel),
      renderMetaSummaryStat("ROAS", formatMultiple(currentMonth ? currentMonth.blendedRoas : 0), currentMonthLabel),
      renderMetaSummaryStat("Cost Per Booking (%)", currentCostPerBooking ? formatCurrency(currentCostPerBooking, 0) : "—", currentPctAvgBookingValue ? formatPercent(currentPctAvgBookingValue, 0) + " avg BV" : currentMonthLabel),
      renderMetaSummaryStat("Leads", formatNumber(currentLeads), currentMonthLabel),
      renderMetaSummaryStat("Followers", formatNumber(currentFollowers), currentMonthLabel),
      renderMetaSummaryStat("Views", formatNumber(currentViews), currentMonthLabel),
      "</section>"
    ].join("");
  }

  function renderMetaSummaryStat(label, value, note) {
    return [
      '<div class="meta-summary-stat">',
      '<div class="meta-summary-label">' + escapeHtml(label) + "</div>",
      '<div class="meta-summary-value">' + escapeHtml(value) + "</div>",
      '<div class="meta-summary-note">' + escapeHtml(note) + "</div>",
      "</div>"
    ].join("");
  }

  function renderMetaCampaignSections(meta) {
    const campaignTypes = visibleMetaCampaignTypes(meta);
    if (!campaignTypes.length) {
      return "";
    }

    const expandedSections = campaignTypes.map(function (campaignType) {
      return isMetaCampaignExpanded(campaignType) ? renderMetaCampaignSection(meta, campaignType) : "";
    }).join("");

    return [
      '<section class="meta-section" id="meta-campaigns">',
      renderMetaCampaignHighlights(meta),
      expandedSections,
      "</section>"
    ].join("");
  }

  function renderMetaCampaignHighlights(meta) {
    const cards = visibleMetaCampaignTypes(meta).map(function (campaignType) {
      const rows = meta.rowsByCampaign[campaignType] || [];
      return renderMetaCampaignHighlightCard(campaignType, rows);
    }).join("");

    if (!cards) {
      return "";
    }

    return [
      renderMetaStageHeader("02", "Campaign Channels"),
      '<div class="meta-channel-summary-grid">',
      cards,
      "</div>"
    ].join("");
  }

  function renderMetaCampaignHighlightCard(campaignType, rows) {
    const summary = summarizeCampaignHighlight(rows);
    const isOpen = isMetaCampaignExpanded(campaignType);
    const accent = campaignType.toLowerCase().indexOf("retarget") >= 0
      ? { bg: "#e0f2fe", color: "#0891b2", icon: "↺", subtitle: "High-intent conversion campaign" }
      : { bg: "#f3e8ff", color: "#7c3aed", icon: "◎", subtitle: "Top-of-funnel discovery campaign" };

    return [
      '<article class="meta-channel-card' + (isOpen ? " is-open" : "") + '" data-meta-campaign-toggle="' + escapeHtml(campaignType) + '">',
      '<div class="meta-channel-head">',
      '<div style="display:flex; gap:16px; align-items:flex-start;">',
      '<div class="meta-channel-icon" style="background:' + accent.bg + "; color:" + accent.color + ';">' + accent.icon + "</div>",
      '<div><div class="meta-channel-title">' + escapeHtml(campaignType) + '</div><div class="meta-channel-subtitle">' + escapeHtml(accent.subtitle) + "</div></div>",
      "</div>",
      '<button class="meta-channel-toggle" type="button" data-meta-campaign-toggle-button="' + escapeHtml(campaignType) + '" aria-expanded="' + (isOpen ? "true" : "false") + '" aria-label="' + (isOpen ? "Hide " : "Show ") + escapeHtml(campaignType) + ' details">' + (isOpen ? "Hide" : "Show") + "</button>",
      "</div>",
      '<div class="meta-channel-stats">',
      renderMetaChannelStat("Total Spend", formatCurrency(summary.totalSpend, 0), summary.monthCount + "-month total"),
      renderMetaChannelStat("Revenue", formatCurrency(summary.totalRevenue, 0), "Attributed"),
      renderMetaChannelStat("Peak Month", summary.peakMonthLabel, summary.peakMonthNote),
      "</div>",
      "</article>"
    ].join("");
  }

  function renderMetaChannelStat(label, value, note) {
    const valueClass = label === "Peak Month" ? "meta-channel-stat-value meta-channel-stat-value-peak" : "meta-channel-stat-value";
    return [
      '<div class="meta-channel-stat">',
      '<div class="meta-channel-stat-label">' + escapeHtml(label) + "</div>",
      '<div class="' + valueClass + '">' + escapeHtml(value) + "</div>",
      label === "Peak Month" ? "" : '<div class="meta-channel-stat-note">' + escapeHtml(note) + "</div>",
      "</div>"
    ].join("");
  }

  function summarizeCampaignHighlight(rows) {
    const peakMonth = highestRow(rows, "revenue");
    return {
      monthCount: rows.length,
      totalSpend: sumMetric(rows, "spend"),
      totalRevenue: sumMetric(rows, "revenue"),
      peakMonthLabel: peakMonth ? peakMonth.label : "—",
      peakMonthNote: peakMonth ? "Highest revenue month" : "No data available"
    };
  }

  function buildRetargetingRoasTakeaway(rows) {
    if (!rows.length) {
      return "ROAS data is not available for this period.";
    }

    const peakRoasRow = highestRow(rows, "roas");
    const lowRoasRow = lowestPositiveRow(rows, "roas");
    const latestRow = rows[rows.length - 1];

    if (!peakRoasRow) {
      return "ROAS data is not available for this period.";
    }

    if (latestRow && latestRow === peakRoasRow) {
      return latestRow.label + " posted the strongest ROAS at " + formatMultiple(latestRow.roas) + ", showing retargeting efficiency improved into the latest month.";
    }

    if (lowRoasRow && peakRoasRow !== lowRoasRow) {
      return peakRoasRow.label + " posted the strongest ROAS at " + formatMultiple(peakRoasRow.roas) + ", up from " + formatMultiple(lowRoasRow.roas) + " in " + lowRoasRow.label + ".";
    }

    return peakRoasRow.label + " posted the strongest ROAS at " + formatMultiple(peakRoasRow.roas) + ".";
  }

  function buildDiscoveryTrafficTakeaway(rows) {
    if (!rows.length) {
      return "Traffic data is not available for this period.";
    }

    const peakImpressionsRow = highestRow(rows, "impressions");
    const peakVisitsRow = highestRow(rows, "profileVisits");
    const latestRow = rows[rows.length - 1];
    const latestVisitShare = latestRow && latestRow.impressions > 0
      ? latestRow.profileVisits / latestRow.impressions
      : 0;

    if (peakImpressionsRow && peakVisitsRow && peakImpressionsRow.key === peakVisitsRow.key) {
      return peakImpressionsRow.label + " led both reach and traffic, with " + formatNumber(peakImpressionsRow.impressions) + " impressions and " + formatNumber(peakImpressionsRow.profileVisits) + " page visits.";
    }

    if (latestRow && latestVisitShare > 0) {
      return latestRow.label + " converted reach into " + formatNumber(latestRow.profileVisits) + " page visits from " + formatNumber(latestRow.impressions) + " impressions.";
    }

    if (peakImpressionsRow) {
      return peakImpressionsRow.label + " delivered the strongest reach at " + formatNumber(peakImpressionsRow.impressions) + " impressions.";
    }

    return "Traffic data is not available for this period.";
  }

  function isMetaCampaignExpanded(campaignType) {
    return !!state.metaExpandedCampaigns[metaCampaignToggleKey(campaignType)];
  }

  function metaCampaignToggleKey(campaignType) {
    return slugify(campaignType);
  }

  function visibleMetaCampaignTypes(meta) {
    return (meta.campaignTypes || []).filter(function (campaignType) {
      const rows = meta.rowsByCampaign[campaignType] || [];
      return rows.some(function (row) {
        return numeric(row.spend) > 0 || numeric(row.revenue) > 0 || numeric(row.impressions) > 0;
      });
    });
  }

  function renderMetaCampaignSection(meta, campaignType) {
    const rows = meta.rowsByCampaign[campaignType] || [];
    const chartKey = slugify(campaignType);
    const isRetargeting = campaignType.toLowerCase().indexOf("retarget") !== -1;
    const isDiscovery = campaignType.toLowerCase().indexOf("discovery") !== -1;
    const retargetingSummary = isRetargeting ? summarizeRetargetingRows(rows) : null;
    const discoverySummary = isDiscovery ? summarizeDiscoveryRows(rows) : null;
    const rangeLabel = formatMetaMonthRange(rows);
    const analysisEntry = getMetaAnalysisEntry(canonicalizeClientSlug(state.client && state.client.slug), state.selectedMonth);
    const retargetingTakeaways = analysisEntry && Array.isArray(analysisEntry.retargeting_key_takeaways) && analysisEntry.retargeting_key_takeaways.length
      ? analysisEntry.retargeting_key_takeaways
      : [buildRetargetingRoasTakeaway(rows)];
    const discoveryTakeaways = analysisEntry && Array.isArray(analysisEntry.discovery_key_takeaways) && analysisEntry.discovery_key_takeaways.length
      ? analysisEntry.discovery_key_takeaways
      : [buildDiscoveryTrafficTakeaway(rows)];

    if (isRetargeting) {
      return [
        '<div class="meta-section" data-meta-campaign-section="' + escapeHtml(chartKey) + '" style="margin:26px 0 20px;">',
        renderMetaStageHeader("—", campaignType + " Campaign"),
        '<div class="meta-campaign-table-card"><div class="meta-campaign-table-wrap"><table class="meta-campaign-table">',
        "<thead><tr><th>Month</th><th>Spend</th><th>Revenue</th><th>ROAS</th><th>Impressions</th><th>Page Visits</th><th>Bookings</th><th>Cost/Booking</th><th>Cost/Booking %</th></tr></thead>",
        "<tbody>",
        rows.slice().reverse().map(renderMetaCampaignTableRow).join(""),
        "</tbody></table></div></div>",
        '<div class="meta-retarget-feature-grid" style="margin-top:22px;">',
        '<div class="meta-retarget-kpi-stack">',
        renderMetaAverageStatCard("Cost/booking average", formatCurrency(retargetingSummary.avgCostPerBooking), retargetingSummary.avgPeriodLabel),
        renderMetaAverageStatCard("Avg booking value", formatCurrency(retargetingSummary.avgBookingValue), retargetingSummary.avgPeriodLabel),
        renderMetaAverageStatCard("Avg ROAS", formatMultiple(retargetingSummary.avgRoas), retargetingSummary.avgPeriodLabel),
        "</div>",
        renderMetaChartCard("Spend vs attributed revenue", "Total monthly ad spend vs total revenue generated", "meta-" + chartKey + "-spend-revenue"),
        "</div>",
        '<div class="meta-chart-grid meta-chart-grid-2" style="margin-top:22px;">',
        renderMetaChartCard("ROAS by month", "Shows how efficiently retargeting turned spend into revenue each month", "meta-" + chartKey + "-roas-month"),
        renderMetaTakeawayCard(retargetingTakeaways, rangeLabel),
        "</div>",
        "</div>"
      ].join("");
    }

    return [
      '<div class="meta-section" data-meta-campaign-section="' + escapeHtml(chartKey) + '" style="margin:26px 0 20px;">',
      renderMetaStageHeader("—", campaignType + " Campaign"),
      '<div class="meta-campaign-table-card"><div class="meta-campaign-table-wrap"><table class="meta-campaign-table">',
      "<thead><tr><th>Month</th><th>Spend</th><th>Revenue</th><th>ROAS</th><th>Impressions</th><th>Followers</th><th>Page Visits</th><th>Bookings</th><th>Cost/Booking</th><th>Cost/Booking %</th></tr></thead>",
      "<tbody>",
      rows.slice().reverse().map(renderMetaDiscoveryCampaignTableRow).join(""),
      "</tbody></table></div></div>",
      isDiscovery
        ? [
            '<div class="meta-discovery-summary-grid" style="margin-top:18px;">',
            renderMetaCompactSummaryCard("Total impressions", formatCompactNumber(discoverySummary.totalImpressions), formatSignedPercentLabel(discoverySummary.impressionsDelta), discoverySummary.impressionsDelta >= 0 ? "good" : "warn"),
            renderMetaCompactSummaryCard("Total followers", formatNumber(discoverySummary.totalFollowers), rangeLabel, "neutral"),
            renderMetaCompactSummaryCard("Total page visits", formatCompactNumber(discoverySummary.totalPageVisits), rangeLabel, "neutral"),
            "</div>"
          ].join("")
        : "",
      isDiscovery
        ? [
            '<div class="meta-chart-grid meta-chart-grid-2" style="margin-top:22px;">',
            renderMetaChartCard("Spend vs attributed revenue", "Monthly spend alongside total revenue generated", "meta-" + chartKey + "-spend-revenue"),
            renderMetaChartCard("ROAS", "How efficiently spend turned into revenue each month", "meta-" + chartKey + "-roas"),
            "</div>",
            '<div class="meta-chart-grid meta-chart-grid-2" style="margin-top:18px;">',
            renderMetaChartCard("Impressions vs page visits", "Reach compared with the visits driven from that traffic", "meta-" + chartKey + "-impressions-visits"),
            renderMetaTakeawayCard(discoveryTakeaways, rangeLabel),
            "</div>"
          ].join("")
        : [
            '<div class="meta-chart-grid meta-chart-grid-3" style="margin-top:22px;">',
            renderMetaChartCard(campaignType + " performance", "ROAS or blended ROAS by month", "meta-" + chartKey + "-performance"),
            renderMetaChartCard(campaignType + " volume", "Leads, followers, or bookings by month", "meta-" + chartKey + "-volume"),
            renderMetaChartCard(campaignType + " efficiency", "Cost trend for the key conversion event", "meta-" + chartKey + "-efficiency"),
            "</div>"
          ].join(""),
      "</div>"
    ].join("");
  }

  function renderMetaCompactSummaryCard(label, value, pillText, tone) {
    return [
      '<div class="meta-chart-card meta-compact-summary-card">',
      '<div class="meta-retarget-stat-label">' + escapeHtml(label) + "</div>",
      '<div class="meta-compact-summary-value">' + escapeHtml(value) + "</div>",
      pillText ? renderMetricPill(pillText, tone || "neutral") : "",
      "</div>"
    ].join("");
  }

  function renderMetaAverageStatCard(label, value, note) {
    return [
      '<div class="meta-chart-card meta-retarget-stat-card">',
      '<div class="meta-retarget-stat-label">' + escapeHtml(label) + "</div>",
      '<div class="meta-retarget-stat-value">' + escapeHtml(value) + "</div>",
      '<div class="meta-retarget-stat-note">' + escapeHtml(note) + "</div>",
      "</div>"
    ].join("");
  }

  function averageOfRows(rows, getter) {
    // We average across every valid positive monthly value so the KPIs update automatically
    // as the visible retargeting history grows from 2 months to 3 months or longer.
    const values = rows.map(function (row) { return numeric(getter(row)); }).filter(function (value) {
      return value > 0;
    });
    if (!values.length) {
      return 0;
    }
    return values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
  }

  function summarizeRetargetingRows(rows) {
    const avgMonths = rows.filter(function (row) {
      return numeric(row.spend) > 0 || numeric(row.revenue) > 0 || primaryRoas(row) > 0;
    }).length || rows.length || 0;

    return {
      avgCostPerBooking: averageOfRows(rows, function (row) { return row.costPerBooking; }),
      avgBookingValue: averageOfRows(rows, function (row) { return row.avgBookingValue; }),
      avgRoas: averageOfRows(rows, function (row) { return primaryRoas(row); }),
      avgPeriodLabel: avgMonths ? avgMonths + "-month avg" : "No data yet"
    };
  }

  function summarizeDiscoveryRows(rows) {
    const firstRow = rows[0] || null;
    const lastRow = rows[rows.length - 1] || null;
    const firstImpressions = firstRow ? numeric(firstRow.impressions) : 0;
    const lastImpressions = lastRow ? numeric(lastRow.impressions) : 0;
    const impressionsDelta = firstImpressions > 0 ? ((lastImpressions - firstImpressions) / firstImpressions) : 0;
    const totalLeadsFollowers = sumMetric(rows, "leadsFollowers");

    return {
      totalImpressions: sumMetric(rows, "impressions"),
      totalFollowers: totalLeadsFollowers,
      totalLeadsFollowers: totalLeadsFollowers,
      totalBookings: rows.reduce(function (sum, row) { return sum + totalCampaignBookings(row); }, 0),
      totalPageVisits: sumMetric(rows, "profileVisits"),
      impressionsDelta: impressionsDelta
    };
  }

  function formatMetaMonthRange(rows) {
    if (!rows || !rows.length) {
      return "Selected range";
    }
    const firstKey = rows[0].key;
    const lastKey = rows[rows.length - 1].key;
    if (firstKey === lastKey) {
      return formatShortMonthYearKey(firstKey);
    }
    return formatShortMonthYearKey(firstKey) + " - " + formatShortMonthYearKey(lastKey);
  }

  function formatSignedPercentLabel(value) {
    const percent = Math.round(numeric(value) * 100);
    if (percent > 0) {
      return "+" + percent + "%";
    }
    if (percent < 0) {
      return percent + "%";
    }
    return "0%";
  }

  function renderMetaCampaignTableRow(row) {
    return [
      "<tr>",
      '<td><span class="meta-pill month-' + escapeHtml(String(row.monthIndex)) + '">' + escapeHtml(row.shortLabel) + "</span></td>",
      '<td class="meta-strong">' + escapeHtml(formatCurrency(row.spend, 2)) + "</td>",
      '<td class="meta-strong">' + escapeHtml(formatCurrency(row.revenue, 0)) + "</td>",
      '<td class="meta-strong">' + escapeHtml(formatMultiple(primaryRoas(row))) + "</td>",
      '<td class="meta-strong">' + escapeHtml(formatNumber(row.impressions)) + "</td>",
      '<td class="meta-strong">' + escapeHtml(formatNumber(row.profileVisits)) + "</td>",
      '<td class="meta-strong">' + escapeHtml(formatNullableNumber(totalCampaignBookings(row))) + "</td>",
      '<td class="meta-strong">' + escapeHtml(formatNullableCurrency(row.costPerBooking)) + "</td>",
      '<td class="meta-strong">' + escapeHtml(formatNullablePercent(row.pctAvgBookingValue)) + "</td>",
      "</tr>"
    ].join("");
  }

  function renderMetaDiscoveryCampaignTableRow(row) {
    return [
      "<tr>",
      '<td><span class="meta-pill month-' + escapeHtml(String(row.monthIndex)) + '">' + escapeHtml(row.shortLabel) + "</span></td>",
      '<td class="meta-strong">' + escapeHtml(formatCurrency(row.spend, 2)) + "</td>",
      '<td class="meta-strong">' + escapeHtml(formatCurrency(row.revenue, 0)) + "</td>",
      '<td class="meta-strong">' + escapeHtml(formatMultiple(primaryRoas(row))) + "</td>",
      '<td class="meta-strong">' + escapeHtml(formatNumber(row.impressions)) + "</td>",
      '<td class="meta-strong">' + escapeHtml(formatNullableNumber(row.leadsFollowers)) + "</td>",
      '<td class="meta-strong">' + escapeHtml(formatNumber(row.profileVisits)) + "</td>",
      '<td class="meta-strong">' + escapeHtml(formatNullableNumber(totalCampaignBookings(row))) + "</td>",
      '<td class="meta-strong">' + escapeHtml(formatNullableCurrency(row.costPerBooking)) + "</td>",
      '<td class="meta-strong">' + escapeHtml(formatNullablePercent(row.pctAvgBookingValue)) + "</td>",
      "</tr>"
    ].join("");
  }

  function renderMetaCampaignCard(row) {
    return [
      '<article class="meta-campaign-card">',
      '<div class="meta-campaign-head" style="background:' + monthLightColor(row.monthIndex) + ';">',
      '<div><div class="meta-campaign-name">' + escapeHtml(row.campaignType) + '</div><div class="meta-campaign-spend">' + escapeHtml(row.label) + " · Spend: " + escapeHtml(formatCurrency(row.spend, 0)) + "</div></div>",
      '<span class="meta-campaign-badge meta-badge ' + escapeHtml(performanceStatus(row).className) + '">' + escapeHtml(performanceStatus(row).label) + "</span>",
      "</div>",
      '<div class="meta-campaign-metrics">',
      renderMetaMetric("ROAS", formatMultiple(primaryRoas(row)), true),
      renderMetaMetric("Revenue", formatCurrency(row.revenue, 0)),
      renderMetaMetric("Impressions", formatNumber(row.impressions)),
      renderMetaMetric("Cost / visit", formatNullableCurrency(row.costPerVisit)),
      renderMetaMetric("Profile visits", formatNumber(row.profileVisits)),
      renderMetaMetric("Leads / followers", formatNullableNumber(row.leadsFollowers)),
      renderMetaMetric("Cost / lead/follower", formatNullableCurrency(row.costPerLeadFollower)),
      renderMetaMetric("IG bio leads", formatNullableNumber(row.igBioLeads)),
      renderMetaMetric("Bookings (email)", formatNullableNumber(row.bookingsEmail)),
      renderMetaMetric("Bookings (FB)", formatNullableNumber(row.bookingsFb)),
      renderMetaMetric("Cost / booking", formatNullableCurrency(row.costPerBooking)),
      renderMetaMetric("% of avg booking value", formatNullablePercent(row.pctAvgBookingValue)),
      "</div>",
      '<div class="meta-note">' + escapeHtml(metaComment(row)) + "</div>",
      "</article>"
    ].join("");
  }

  function renderMetaComparisonToggleButton() {
    return '<button class="meta-comparison-toggle-button" type="button" data-meta-comparison-toggle="true">' + escapeHtml(state.metaComparisonExpanded ? "Hide table" : "Show table") + "</button>";
  }

  function renderMetaComparisonTable(meta) {
    const rows = (meta.rows || []).slice().sort(function (a, b) {
      if (a.key !== b.key) {
        return b.key.localeCompare(a.key);
      }
      return a.campaignType.localeCompare(b.campaignType);
    });

    const showDirectRevenue = canonicalizeClientSlug(state.client && state.client.slug) === "reflections-resorts";

    // Build a lookup of directRevenue by month key from ROI data
    const directRevenueByMonth = {};
    if (showDirectRevenue && Array.isArray(state.allRoiMonths)) {
      state.allRoiMonths.forEach(function (m) {
        directRevenueByMonth[m.key] = m.directRevenue;
      });
    }

    return [
      '<div class="meta-table-card meta-portfolio-table"><div class="meta-table-wrap"><table class="meta-table">',
      "<thead><tr><th>Month</th><th>Campaign</th><th>Spend</th><th>Revenue</th>" +
        (showDirectRevenue ? "<th>Direct Booking Revenue</th>" : "") +
        "<th>ROAS</th><th>Impressions</th><th>Visits</th><th>Leads/Followers</th><th>IG Bio Leads</th><th>Bookings (Email)</th><th>Bookings (FB)</th><th>Cost/Booking</th><th>% Avg BV</th></tr></thead>",
      "<tbody>",
      rows.map(function (row) {
        // Only show direct revenue on the first campaign row per month to avoid duplication
        const monthKey = row.key;
        const directRevenue = showDirectRevenue ? (directRevenueByMonth[monthKey] || 0) : null;
        return [
          "<tr>",
          '<td><span class="meta-month-pill meta-month-' + escapeHtml(String(row.monthIndex)) + '">' + escapeHtml(row.shortLabel) + "</span></td>",
          "<td>" + escapeHtml(row.campaignType) + "</td>",
          "<td>" + escapeHtml(formatCurrency(row.spend, 0)) + "</td>",
          "<td>" + escapeHtml(formatCurrency(row.revenue, 0)) + "</td>",
          (showDirectRevenue ? "<td>" + escapeHtml(directRevenue > 0 ? formatCurrency(directRevenue, 0) : "—") + "</td>" : ""),
          "<td>" + escapeHtml(formatMultiple(primaryRoas(row))) + "</td>",
          "<td>" + escapeHtml(formatNumber(row.impressions)) + "</td>",
          "<td>" + escapeHtml(formatNumber(row.profileVisits)) + "</td>",
          "<td>" + escapeHtml(formatNullableNumber(row.leadsFollowers)) + "</td>",
          "<td>" + escapeHtml(formatNullableNumber(row.igBioLeads)) + "</td>",
          "<td>" + escapeHtml(formatNullableNumber(row.bookingsEmail)) + "</td>",
          "<td>" + escapeHtml(formatNullableNumber(row.bookingsFb)) + "</td>",
          "<td>" + escapeHtml(formatNullableCurrency(row.costPerBooking)) + "</td>",
          "<td>" + escapeHtml(formatNullablePercent(row.pctAvgBookingValue)) + "</td>",
          "</tr>"
        ].join("");
      }).join(""),
      "</tbody></table></div></div>"
    ].join("");
  }


  function renderMetaInsights(meta) {
    const analysisEntry = getMetaAnalysisEntry(canonicalizeClientSlug(state.client && state.client.slug), state.selectedMonth);
    const bestRoas = highestMonth(meta.months, "blendedRoas");
    const insightTakeaways = analysisEntry && Array.isArray(analysisEntry.performance_insights) && analysisEntry.performance_insights.length
      ? analysisEntry.performance_insights
      : [
          bestRoas ? bestRoas.label + " posted the strongest blended ROAS at " + formatMultiple(bestRoas.blendedRoas) + "." : "ROAS data is limited for the selected months."
        ];

    return [
      '<section class="meta-section" id="meta-insights">',
      renderMetaStageHeader("03", "Performance Insights"),
      '<div class="meta-insight-split">',
      renderMetaTakeawayCard(insightTakeaways, meta.months.length ? formatMetaMonthRange(meta.months) : ""),
      renderMetaEfficiencyCard(meta),
      "</div>",
      "</section>"
    ].join("");
  }

  function renderMetaEfficiencyCard(meta) {
    const rows = meta.rows.slice().sort(function (a, b) {
      const aRoas = primaryRoas(a);
      const bRoas = primaryRoas(b);
      const aMissing = !(aRoas > 0);
      const bMissing = !(bRoas > 0);
      if (aMissing && bMissing) {
        return a.monthIndex - b.monthIndex || a.campaignType.localeCompare(b.campaignType);
      }
      if (aMissing) {
        return 1;
      }
      if (bMissing) {
        return -1;
      }
      if (aRoas !== bRoas) {
        return bRoas - aRoas; // higher ROAS = better, so descending
      }
      return a.monthIndex - b.monthIndex || a.campaignType.localeCompare(b.campaignType);
    });

    const validRoas = rows.map(function (row) {
      return primaryRoas(row);
    }).filter(function (value) {
      return value > 0;
    });
    const bestRoas = validRoas.length ? Math.max.apply(null, validRoas) : 0;

    return [
      '<div class="meta-insight-card meta-efficiency-card">',
      '<div class="meta-efficiency-head">',
      '<div class="meta-efficiency-title">Campaign Efficiency — ROAS</div>',
      '<div class="meta-efficiency-sub">Higher ROAS = better performance</div>',
      '</div>',
      '<div class="meta-efficiency-list">',
      rows.map(function (row) {
        const roas = primaryRoas(row);
        const hasRoas = roas > 0;
        const score = hasRoas && bestRoas > 0 ? roas / bestRoas : 0;
        const barWidth = hasRoas ? Math.max(14, Math.min(100, 16 + (score * 84))) : 12;
        const ratioTone = !hasRoas ? "neutral" : roas >= 10 ? "great" : roas >= 5 ? "solid" : "decent";
        const monthStyle = 'background:' + monthLightColor(row.monthIndex) + ';color:' + monthColor(row.monthIndex) + ';';
        const barColor = hasRoas ? monthColor(row.monthIndex) : "#cbd5e1";
        return [
          '<div class="meta-efficiency-row">',
          '<div class="meta-efficiency-label"><span class="meta-pill meta-efficiency-pill month-' + escapeHtml(String(row.monthIndex)) + '" style="' + monthStyle + '">' + escapeHtml(row.shortLabel) + '</span><span>' + escapeHtml(row.campaignType) + '</span></div>',
          '<div class="meta-efficiency-track"><div class="meta-efficiency-fill" style="width:' + barWidth + '%;background:' + escapeHtml(barColor) + ';"></div></div>',
          '<div class="meta-efficiency-cost">' + escapeHtml(hasRoas ? formatMultiple(roas) : "—") + '</div>',
          '</div>'
        ].join("");
      }).join(""),
      '</div>',
      '</div>'
    ].join("");
  }

  function renderMetaStageHeader(number, title, rightContent) {
    return [
      '<div class="meta-stage' + (rightContent ? " meta-stage-with-button" : "") + '">',
      '<div class="meta-stage-copy">',
      '<span class="meta-stage-num">' + escapeHtml(number) + "</span>",
      '<span class="meta-stage-title">' + escapeHtml(title) + "</span>",
      '<div class="meta-stage-line"></div>',
      "</div>",
      rightContent ? '<div class="meta-stage-controls">' + rightContent + '<div class="meta-stage-anchor"></div></div>' : '<div class="meta-stage-anchor"></div>',
      "</div>"
    ].join("");
  }

  function renderMetaKpi(label, months, valueGetter, formatter, chartId) {
    return [
      '<div class="meta-kpi">',
      '<div class="meta-kpi-label">' + escapeHtml(label) + "</div>",
      '<div class="meta-kpi-months">',
      months.map(function (month, index) {
        return [
          index ? '<div class="meta-kpi-divider"></div>' : "",
          '<div class="meta-kpi-row">',
          '<span class="meta-kpi-month" style="background:' + monthLightColor(index) + ';color:' + monthColor(index) + ';">' + escapeHtml(month.shortLabel) + "</span>",
          '<span class="meta-kpi-val">' + escapeHtml(formatter(valueGetter(month), 0)) + "</span>",
          "</div>"
        ].join("");
      }).join(""),
      "</div>",
      '<div class="meta-kpi-spark" id="' + escapeHtml(chartId) + '"></div>',
      "</div>"
    ].join("");
  }

  function renderMetaKpiNoSpark(label, months, valueGetter, formatter) {
    const displayMonths = (months || []).slice().reverse();
    return [
      '<div class="meta-kpi meta-kpi-no-spark">',
      '<div class="meta-kpi-label">' + escapeHtml(label) + "</div>",
      '<div class="meta-kpi-months">',
      displayMonths.map(function (month, index) {
        return [
          index ? '<div class="meta-kpi-divider"></div>' : "",
          '<div class="meta-kpi-row">',
          '<span class="meta-kpi-month" style="background:' + monthLightColor(index) + ';color:' + monthColor(index) + ';">' + escapeHtml(month.shortLabel) + "</span>",
          '<span class="meta-kpi-val">' + escapeHtml(formatter(valueGetter(month), 0)) + "</span>",
          "</div>"
        ].join("");
      }).join(""),
      "</div>",
      "</div>"
    ].join("");
  }

  function renderMetaChartCard(title, subtitle, id) {
    return [
      '<div class="meta-chart-card">',
      '<div class="meta-chart-title">' + escapeHtml(title) + "</div>",
      '<div class="meta-chart-sub">' + escapeHtml(subtitle) + "</div>",
      '<div id="' + escapeHtml(id) + '"></div>',
      "</div>"
    ].join("");
  }

  function renderMetaMetric(label, value, hero) {
    return '<div><div class="meta-metric-label">' + escapeHtml(label) + '</div><div class="meta-metric-value' + (hero ? " hero" : "") + '">' + escapeHtml(value) + "</div></div>";
  }

  function renderMetricPill(value, tone) {
    return '<span class="meta-pill metric-' + escapeHtml(tone || "neutral") + '">' + escapeHtml(value) + "</span>";
  }

  function renderMetaInsightCard(title, body, tone) {
    return '<div class="meta-insight-card ' + escapeHtml(tone || "") + '"><div class="meta-insight-title">' + escapeHtml(title) + '</div><div class="meta-insight-body">' + escapeHtml(body) + "</div></div>";
  }

  function renderMetaTakeawayCard(items, periodLabel) {
    return [
      '<div class="meta-takeaway-card">',
      '<div class="meta-takeaway-title">Key Takeaways' +
        (periodLabel ? ' <span style="font-size:0.6em;font-weight:500;opacity:0.5;white-space:nowrap;">(' + escapeHtml(periodLabel) + ')</span>' : '') +
      '</div>',
      '<ul class="meta-takeaway-list">',
      items.map(function (item) {
        return "<li>" + escapeHtml(item) + "</li>";
      }).join(""),
      "</ul>",
      "</div>"
    ].join("");
  }

  function renderMetaCharts(meta) {
    destroyCharts("meta-");

    const monthLabels = meta.months.map(function (month) { return month.label; });
    const shortYearLabels = meta.months.map(function (month) { return month.shortYearLabel || formatShortMonthYearKeyCompact(month.key); });
    const shortMonthLabels = meta.months.map(function (month) { return month.shortLabel; });
    const bookingValueSeries = meta.months.map(function (month) { return month.avgBookingValue; });
    const bookingValueMax = Math.max.apply(null, bookingValueSeries.concat([0]));
    const bookingValueMin = Math.min.apply(null, bookingValueSeries.filter(function (value) {
      return numeric(value) > 0;
    }).concat([0]));
    const bookingValueAxis = buildCurrencyAxisBounds(bookingValueMin, bookingValueMax, 250);

    const revenueChartEl = document.querySelector("#meta-rev-spend");
    if (revenueChartEl) {
      const directRevenueByMonthKey = state.roiMonths.reduce(function (map, month) {
        map[month.key] = numeric(month.directRevenue);
        return map;
      }, {});

      pushChart(new ApexCharts(revenueChartEl, {
      chart: Object.assign({}, sharedChart("bar", 280), {
        offsetX: 0
      }),
      series: [
        { name: "Spend", data: meta.months.map(function (month) { return month.totalSpend; }) },
        { name: "Revenue", data: meta.months.map(function (month) { return directRevenueByMonthKey[month.key] || 0; }) }
      ],
      xaxis: Object.assign({}, sharedXAxis(shortYearLabels, { offsetY: 8 }), {
        tickPlacement: "between",
        labels: buildResponsiveSharedXAxisLabels(shortYearLabels, { offsetY: 8 })
      }),
      yaxis: sharedYAxis(function (value) { return formatCurrencyCompact(value); }, { minWidth: 52, offsetX: 4 }),
      colors: ["#4F7DF3", "#F59E0B"],
      plotOptions: {
        bar: {
          borderRadius: 10,
          borderRadiusApplication: "end",
          borderRadiusWhenStacked: "last",
          columnWidth: "58%"
        }
      },
      legend: sharedLegend(),
      dataLabels: { enabled: false },
      tooltip: {
        shared: true,
        intersect: false,
        y: { formatter: function (value) { return formatCurrency(value, 0); } }
      },
      grid: sharedGrid({ padding: { left: 18, right: 0, top: 4, bottom: 18 } })
      }), "meta-rev-spend");
    }

    const roasChartEl = document.querySelector("#meta-booking-value-trend");
    if (roasChartEl) {
      pushChart(new ApexCharts(roasChartEl, {
      chart: Object.assign({}, sharedChart("line", 280), {
        offsetX: 0
      }),
      series: [
        { name: "Avg booking value", type: "line", data: bookingValueSeries }
      ],
      xaxis: sharedXAxis(monthLabels, { offsetY: 6 }),
      yaxis: sharedYAxis(function (value) { return formatCurrencyCompact(value); }, {
        offsetX: 4,
        minWidth: 40,
        min: bookingValueAxis.min,
        max: bookingValueAxis.max,
        tickAmount: bookingValueAxis.tickAmount
      }),
      colors: [monthColor(2)],
      stroke: { width: 3, curve: "smooth", lineCap: "round" },
      markers: {
        size: 7,
        hover: { sizeOffset: 1 },
        colors: [monthColor(2)],
        strokeColors: "#ffffff",
        strokeWidth: 3
      },
      grid: sharedGrid({ padding: { left: 14, right: 10, top: 12, bottom: 18 } }),
      legend: { show: false },
      tooltip: {
        shared: false,
        intersect: true,
        y: { formatter: function (value) { return formatCurrency(value, 0); } }
      },
      dataLabels: { enabled: false }
      }), "meta-booking-value-trend");
    }

    const bookingsChartEl = document.querySelector("#meta-bookings");
    if (bookingsChartEl) {
      const campaignRevenueSeries = meta.campaignTypes.map(function (campaignType, index) {
        const campaignRows = meta.rowsByCampaign[campaignType] || [];
        const monthlyRevenue = meta.months.map(function () { return 0; });

        campaignRows.forEach(function (row) {
          const monthIndex = Math.max(0, numeric(row.monthIndex));
          if (monthIndex >= 0 && monthIndex < monthlyRevenue.length) {
            monthlyRevenue[monthIndex] += numeric(row.revenue);
          }
        });

        return {
          name: campaignType,
          data: monthlyRevenue,
          color: META_COLORS[index % META_COLORS.length]
        };
      });

      pushChart(new ApexCharts(bookingsChartEl, {
      chart: Object.assign({}, sharedChart("bar", 280), {
        stacked: true
      }),
      series: campaignRevenueSeries,
      xaxis: sharedXAxis(shortYearLabels, { offsetY: 4 }),
      yaxis: sharedYAxis(function (value) { return formatCurrencyCompact(value); }, { minWidth: 52, offsetX: 4 }),
      colors: campaignRevenueSeries.map(function (entry) { return entry.color; }),
      plotOptions: { bar: { borderRadius: 10, borderRadiusApplication: "end", borderRadiusWhenStacked: "last", columnWidth: "54%" } },
      tooltip: {
        shared: true,
        intersect: false,
        y: { formatter: function (value) { return formatCurrency(value, 0); } }
      },
      legend: sharedLegend(),
      dataLabels: { enabled: false },
      grid: sharedGrid({ padding: { left: 18, right: 0, top: 8, bottom: 18 } })
      }), "meta-bookings");
    }

    meta.campaignTypes.forEach(function (campaignType) {
      const chartKey = slugify(campaignType);
      const rows = meta.rowsByCampaign[campaignType] || [];
      const volumeMetric = chooseVolumeMetric(rows);
      const efficiencyMetric = chooseEfficiencyMetric(rows);
      const campaignMonthLabels = rows.map(function (row) { return row.shortYearLabel; });
      const performanceValues = rows.map(function (row) { return primaryRoas(row); });
      const efficiencyValues = rows.map(function (row) { return numeric(row[efficiencyMetric.key]); });
      const volumeValues = rows.map(function (row) { return numeric(row[volumeMetric.key]); });
      const performanceAxis = buildTrendAxisBounds(performanceValues, {
        step: performanceValues.length && Math.max.apply(null, performanceValues.concat([0])) <= 20 ? 1 : 5,
        tightRangeThreshold: 0.4
      });
      const efficiencyAxis = buildTrendAxisBounds(efficiencyValues, {
        step: chooseAxisStep(Math.max.apply(null, efficiencyValues.concat([0]))),
        tightRangeThreshold: 0.4
      });
      const volumeMax = roundUpValue(Math.max.apply(null, volumeValues.concat([0])));
      const isRetargeting = campaignType.toLowerCase().indexOf("retarget") !== -1;
      const isDiscovery = campaignType.toLowerCase().indexOf("discovery") !== -1;

      if (isRetargeting) {
        const spendRevenueEl = document.querySelector("#meta-" + chartKey + "-spend-revenue");
        const roasMonthEl = document.querySelector("#meta-" + chartKey + "-roas-month");
        const spendValues = rows.map(function (row) { return numeric(row.spend); });
        const revenueValues = rows.map(function (row) { return numeric(row.revenue); });
        const roasMonthMax = roundUpAxis(Math.max.apply(null, performanceValues.concat([2])));
        const roasMonthAxis = buildTrendAxisBounds(performanceValues, {
          step: roasMonthMax <= 20 ? 1 : 5,
          tightRangeThreshold: 0.4
        });

        if (spendRevenueEl) {
          pushChart(new ApexCharts(spendRevenueEl, {
        chart: Object.assign({}, sharedChart("bar", 240), {
              offsetX: 0
            }),
            series: [
              { name: "Spend", data: spendValues },
              { name: "Attributed revenue", data: revenueValues }
            ],
            xaxis: Object.assign({}, sharedXAxis(campaignMonthLabels, { offsetY: 8 }), {
              tickPlacement: "between",
              labels: buildResponsiveSharedXAxisLabels(campaignMonthLabels, { offsetY: 8 })
            }),
            yaxis: sharedYAxis(function (value) { return formatCurrencyCompact(value); }, { minWidth: 54, offsetX: 4 }),
            colors: ["#2663EB", "#F7AD43"],
            plotOptions: {
              bar: {
                borderRadius: 10,
                borderRadiusApplication: "end",
                borderRadiusWhenStacked: "last",
                columnWidth: "54%"
              }
            },
            legend: sharedLegend(),
            dataLabels: { enabled: false },
            tooltip: {
              shared: true,
              intersect: false,
              y: { formatter: function (value) { return formatCurrency(value, 0); } }
            },
            grid: sharedGrid({ padding: { left: 18, right: 0, top: 4, bottom: 18 } })
          }), "meta-" + chartKey + "-spend-revenue");
        }

        if (roasMonthEl) {
          pushChart(new ApexCharts(roasMonthEl, {
            chart: sharedChart("line", 215),
            series: [{ name: "ROAS", type: "line", data: performanceValues }],
            xaxis: sharedXAxis(campaignMonthLabels, { offsetY: 6 }),
            yaxis: sharedYAxis(function (value) { return round2(value) + "x"; }, {
              offsetX: 4,
              minWidth: 52,
              min: roasMonthAxis.min,
              max: Math.max(roasMonthAxis.max, roasMonthMax),
              tickAmount: roasMonthAxis.tickAmount
            }),
            colors: ["#2663EB"],
            stroke: { width: 3, curve: "smooth", lineCap: "round" },
            markers: {
              size: 7,
              hover: { sizeOffset: 1 },
              colors: ["#2663EB"],
              strokeColors: "#ffffff",
              strokeWidth: 3
            },
            grid: sharedGrid({ padding: { left: 16, right: 10, top: 10, bottom: 18 } }),
            legend: { show: false },
            tooltip: {
              shared: false,
              intersect: true,
              y: { formatter: function (value) { return formatMultiple(value); } }
            },
            dataLabels: { enabled: false }
          }), "meta-" + chartKey + "-roas-month");
        }


        return;
      }

      if (isDiscovery) {
        const spendRevenueEl = document.querySelector("#meta-" + chartKey + "-spend-revenue");
        const roasEl = document.querySelector("#meta-" + chartKey + "-roas");
        const impressionsVisitsEl = document.querySelector("#meta-" + chartKey + "-impressions-visits");
        const spendValues = rows.map(function (row) { return numeric(row.spend); });
        const revenueValues = rows.map(function (row) { return numeric(row.revenue); });
        const impressionValues = rows.map(function (row) { return numeric(row.impressions); });
        const visitValues = rows.map(function (row) { return numeric(row.profileVisits); });
        const roasMax = roundUpAxis(Math.max.apply(null, performanceValues.concat([2])));
        const impressionsVisitsMax = roundUpValue(Math.max.apply(null, impressionValues.concat(visitValues).concat([0])));
        const impressionsVisitScaleStops = [0, 2000, 10000, 38000, 78000, 112000];
        if (impressionsVisitsMax > impressionsVisitScaleStops[impressionsVisitScaleStops.length - 1]) {
          impressionsVisitScaleStops.push(impressionsVisitsMax);
        }
        function transformImpressionsVisitValue(value) {
          const numericValue = Math.max(0, numeric(value));
          for (let index = 0; index < impressionsVisitScaleStops.length - 1; index += 1) {
            const start = impressionsVisitScaleStops[index];
            const end = impressionsVisitScaleStops[index + 1];
            if (numericValue <= end) {
              const span = Math.max(1, end - start);
              return index + ((numericValue - start) / span);
            }
          }
          return impressionsVisitScaleStops.length - 1;
        }
        const transformedImpressionValues = impressionValues.map(transformImpressionsVisitValue);
        const transformedVisitValues = visitValues.map(transformImpressionsVisitValue);
        const roasAxis = buildTrendAxisBounds(performanceValues, {
          step: roasMax <= 20 ? 1 : 5,
          tightRangeThreshold: 0.4
        });

        if (spendRevenueEl) {
          pushChart(new ApexCharts(spendRevenueEl, {
            chart: Object.assign({}, sharedChart("bar", 235), {
              offsetX: 0
            }),
            series: [
              { name: "Spend", data: spendValues },
              { name: "Attributed revenue", data: revenueValues }
            ],
            xaxis: Object.assign({}, sharedXAxis(campaignMonthLabels, { offsetY: 8 }), {
              tickPlacement: "between",
              labels: buildResponsiveSharedXAxisLabels(campaignMonthLabels, { offsetY: 8 })
            }),
            yaxis: sharedYAxis(function (value) { return formatCurrencyCompact(value); }, { minWidth: 54, offsetX: 4 }),
            colors: ["#2663EB", "#F7AD43"],
            plotOptions: {
              bar: {
                borderRadius: 10,
                borderRadiusApplication: "end",
                borderRadiusWhenStacked: "last",
                columnWidth: "54%"
              }
            },
            legend: sharedLegend(),
            dataLabels: { enabled: false },
            tooltip: {
              shared: true,
              intersect: false,
              y: { formatter: function (value) { return formatCurrency(value, 0); } }
            },
            grid: sharedGrid({ padding: { left: 18, right: 0, top: 4, bottom: 18 } })
          }), "meta-" + chartKey + "-spend-revenue");
        }

        if (roasEl) {
          pushChart(new ApexCharts(roasEl, {
            chart: sharedChart("line", 235),
            series: [{ name: "ROAS", type: "line", data: performanceValues }],
            xaxis: sharedXAxis(campaignMonthLabels, { offsetY: 6 }),
            yaxis: sharedYAxis(function (value) { return round2(value) + "x"; }, {
              offsetX: 4,
              minWidth: 52,
              min: roasAxis.min,
              max: Math.max(roasAxis.max, roasMax),
              tickAmount: roasAxis.tickAmount
            }),
            colors: ["#F7AD43"],
            stroke: { width: 3, curve: "smooth", lineCap: "round" },
            markers: {
              size: 7,
              hover: { sizeOffset: 1 },
              colors: ["#F7AD43"],
              strokeColors: "#ffffff",
              strokeWidth: 3
            },
            grid: sharedGrid({ padding: { left: 16, right: 10, top: 10, bottom: 18 } }),
            legend: { show: false },
            tooltip: {
              shared: false,
              intersect: true,
              y: { formatter: function (value) { return formatMultiple(value); } }
            },
            dataLabels: { enabled: false }
          }), "meta-" + chartKey + "-roas");
        }

        if (impressionsVisitsEl) {
          pushChart(new ApexCharts(impressionsVisitsEl, {
            chart: sharedChart("line", 290),
            series: [
              { name: "Impressions", type: "line", data: transformedImpressionValues },
              { name: "Page visits", type: "line", data: transformedVisitValues }
            ],
            xaxis: sharedXAxis(campaignMonthLabels, { offsetY: 2 }),
            yaxis: sharedYAxis(function (value) {
              const roundedIndex = Math.round(value);
              if (Math.abs(value - roundedIndex) > 0.001 || roundedIndex < 0 || roundedIndex >= impressionsVisitScaleStops.length) {
                return "";
              }
              return formatCompactNumber(impressionsVisitScaleStops[roundedIndex]);
            }, {
              offsetX: 4,
              minWidth: 52,
              min: 0,
              max: impressionsVisitScaleStops.length - 1,
              tickAmount: impressionsVisitScaleStops.length - 1
            }),
            colors: ["#2663EB", "#12B981"],
            stroke: { width: 3, curve: "smooth", lineCap: "round" },
            markers: {
              size: 6,
              hover: { sizeOffset: 1 },
              strokeColors: "#ffffff",
              strokeWidth: 3
            },
            grid: sharedGrid({ padding: { left: 16, right: 10, top: 6, bottom: 4 } }),
            legend: Object.assign({}, sharedLegend(), {
              offsetY: 10,
              itemMargin: { horizontal: 12, vertical: 0 }
            }),
            tooltip: {
              shared: true,
              intersect: false,
              y: {
                formatter: function (_value, context) {
                  if (!context) {
                    return "";
                  }
                  const sourceValues = context.seriesIndex === 0 ? impressionValues : visitValues;
                  return formatNumber(sourceValues[context.dataPointIndex]);
                }
              }
            },
            dataLabels: { enabled: false }
          }), "meta-" + chartKey + "-impressions-visits");
        }


        return;
      }

      const performanceEl = document.querySelector("#meta-" + chartKey + "-performance");
      const volumeEl = document.querySelector("#meta-" + chartKey + "-volume");
      const efficiencyEl = document.querySelector("#meta-" + chartKey + "-efficiency");

      if (!performanceEl || !volumeEl || !efficiencyEl) {
        return;
      }

      pushChart(new ApexCharts(performanceEl, {
        chart: sharedChart("line", 250),
        series: [
          { name: "ROAS", type: "line", data: performanceValues }
        ],
        xaxis: sharedXAxis(campaignMonthLabels, { offsetY: 6 }),
        yaxis: sharedYAxis(function (value) { return round2(value) + "x"; }, {
          offsetX: -8,
          minWidth: 52,
          min: performanceAxis.min,
          max: performanceAxis.max,
          tickAmount: performanceAxis.tickAmount
        }),
        colors: [monthColor(1)],
        stroke: { width: 3, curve: "smooth", lineCap: "round" },
        markers: {
          size: 7,
          hover: { sizeOffset: 1 },
          colors: [monthColor(1)],
          strokeColors: "#ffffff",
          strokeWidth: 3
        },
        grid: sharedGrid({ padding: { left: 12, right: 10, top: 10, bottom: 18 } }),
        legend: { show: false },
        tooltip: {
          shared: false,
          intersect: true,
          y: { formatter: function (value) { return formatMultiple(value); } }
        },
        dataLabels: { enabled: false }
      }), "meta-" + chartKey + "-performance");

      pushChart(new ApexCharts(volumeEl, {
        chart: sharedChart("bar", 250),
        series: [{ name: volumeMetric.label, data: volumeValues }],
        xaxis: sharedXAxis(campaignMonthLabels, { offsetY: 6 }),
        yaxis: sharedYAxis(formatNumber, { minWidth: 42, offsetX: -8, min: 0, max: volumeMax, tickAmount: 4 }),
        colors: rows.map(function (row) { return monthColor(row.monthIndex); }),
        plotOptions: { bar: { borderRadius: 10, distributed: true, columnWidth: "52%" } },
        tooltip: {
          y: { formatter: function (value) { return formatNumber(value); } }
        },
        legend: { show: false },
        dataLabels: { enabled: true, style: { fontSize: "11px", fontWeight: 600 } },
        grid: sharedGrid({ padding: { left: 0, right: 8, top: 6, bottom: 18 } })
      }), "meta-" + chartKey + "-volume");

      pushChart(new ApexCharts(efficiencyEl, {
        chart: sharedChart("line", 250),
        series: [
          { name: efficiencyMetric.label, type: "line", data: efficiencyValues }
        ],
        xaxis: sharedXAxis(campaignMonthLabels, { offsetY: 6 }),
        yaxis: sharedYAxis(function (value) { return "$" + round2(value); }, {
          offsetX: -8,
          minWidth: 52,
          min: efficiencyAxis.min,
          max: efficiencyAxis.max,
          tickAmount: efficiencyAxis.tickAmount
        }),
        colors: [monthColor(0)],
        stroke: { width: 3, curve: "smooth", lineCap: "round" },
        markers: {
          size: 7,
          hover: { sizeOffset: 1 },
          colors: [monthColor(0)],
          strokeColors: "#ffffff",
          strokeWidth: 3
        },
        grid: sharedGrid({ padding: { left: 12, right: 10, top: 10, bottom: 18 } }),
        legend: { show: false },
        tooltip: {
          shared: false,
          intersect: true,
          y: { formatter: function (value) { return value ? formatCurrency(value) : "—"; } }
        },
        dataLabels: { enabled: false }
      }), "meta-" + chartKey + "-efficiency");
    });

    renderMatchingCharts("meta-");
  }

  function renderMetaSparkChart(id, seriesName, months, valueGetter, tooltipFormatter) {
    const target = document.querySelector("#" + id);
    if (!target) {
      return;
    }

    pushChart(new ApexCharts(target, {
      chart: {
        type: "bar",
        height: 52,
        sparkline: { enabled: true },
        toolbar: { show: false },
        accessibility: { enabled: false },
        animations: { enabled: true, easing: "easeinout", speed: 450 }
      },
      series: [{
        name: seriesName,
        data: months.map(function (month) {
          return numeric(valueGetter(month));
        })
      }],
      xaxis: {
        categories: months.map(function (month) { return month.shortLabel; })
      },
      colors: META_COLORS,
      plotOptions: {
        bar: {
          distributed: true,
          borderRadius: 2,
          columnWidth: "92%"
        }
      },
      dataLabels: { enabled: false },
      grid: { show: false },
      tooltip: {
        enabled: true,
        shared: false,
        intersect: true,
        x: {
          formatter: function (_, opts) {
            return months[opts.dataPointIndex] ? months[opts.dataPointIndex].label : "";
          }
        },
        y: {
          formatter: function (value) {
            return tooltipFormatter(value);
          }
        }
      },
      states: {
        hover: {
          filter: {
            type: "lighten",
            value: 0.04
          }
        }
      }
    }), "meta-" + id);
  }

  function buildLineAnnotations(categories, values, formatter, borderColor, textColor) {
    return values.map(function (value, index) {
      var offsetX = 0;
      if (index === 0) {
        offsetX = 26;
      } else if (index === values.length - 1) {
        offsetX = -26;
      }

      return {
        x: categories[index],
        y: value,
        marker: {
          size: 0
        },
        label: {
          text: formatter(value),
          borderColor: borderColor,
          borderWidth: 2,
          borderRadius: 10,
          offsetY: -24,
          offsetX: offsetX,
          style: {
            background: "#ffffff",
            color: textColor,
            fontSize: "11px",
            fontWeight: 700,
            padding: {
              left: 8,
              right: 8,
              top: 4,
              bottom: 4
            }
          }
        }
      };
    });
  }

  function buildLinePoints(categories, values, color) {
    return values.map(function (value, index) {
      return {
        x: categories[index],
        y: value,
        marker: {
          size: 6,
          fillColor: color,
          strokeColor: "#ffffff",
          strokeWidth: 3,
          radius: 999
        },
        label: {
          text: ""
        }
      };
    });
  }

  function buildMetaModel(rows) {
    const monthMap = {};
    const rowsByCampaign = {};
    const campaignOrder = [];

    rows.forEach(function (row) {
      if (!monthMap[row.key]) {
        monthMap[row.key] = {
          key: row.key,
          label: row.label,
          shortLabel: row.shortLabel,
          shortYearLabel: row.shortYearLabel,
          monthIndex: row.monthIndex,
          totalSpend: 0,
          attributedRevenue: 0,
          blendedRoas: 0,
          avgBookingValue: 0,
          maxEmailBookings: 0,
          maxFbBookings: 0
        };
      }

      monthMap[row.key].totalSpend += numeric(row.spend);
      monthMap[row.key].attributedRevenue += numeric(row.revenue);
      monthMap[row.key].blendedRoas = Math.max(monthMap[row.key].blendedRoas, numeric(row.blendedRoas) || numeric(row.roas));
      monthMap[row.key].avgBookingValue = Math.max(monthMap[row.key].avgBookingValue, numeric(row.avgBookingValue));
      monthMap[row.key].maxEmailBookings += numeric(row.bookingsEmail);
      monthMap[row.key].maxFbBookings += numeric(row.bookingsFb);

      if (!rowsByCampaign[row.campaignType]) {
        rowsByCampaign[row.campaignType] = [];
        campaignOrder.push(row.campaignType);
      }
      rowsByCampaign[row.campaignType].push(row);
    });

    const months = Object.values(monthMap).sort(function (a, b) {
      return a.key.localeCompare(b.key);
    }).map(function (month) {
      month.totalBookings = month.maxEmailBookings + month.maxFbBookings;
      return month;
    });

    campaignOrder.forEach(function (campaignType) {
      rowsByCampaign[campaignType].sort(function (a, b) {
        return a.key.localeCompare(b.key);
      });
    });

    return {
      rows: rows,
      months: months,
      rowsByCampaign: rowsByCampaign,
      campaignTypes: campaignOrder
    };
  }

  function normalizeMetaSpendBoundaryMonths(meta, clientSlug) {
    if (!meta || !meta.months || !meta.months.length) {
      return meta;
    }

    if (clientSlug === "reflections-resorts") {
      meta.months.forEach(function (month) {
        if (month.key === "2025-12") {
          month.totalSpend = 698.42;
        }
      });
    }

    return meta;
  }

  function buildMetaSummary(meta) {
    const totalSpend = sumMetric(meta.months, "totalSpend");
    const totalRevenue = sumMetric(meta.months, "attributedRevenue");
    const totalBookings = sumMetric(meta.months, "totalBookings");
    const avgRoas = averageMetric(meta.months, "blendedRoas");
    const bestMonth = highestMonth(meta.months, "attributedRevenue");
    const peakRoasRow = meta.rows.filter(function (row) {
      return primaryRoas(row) > 0;
    }).reduce(function (highest, row) {
      return !highest || primaryRoas(row) > primaryRoas(highest) ? row : highest;
    }, null);
    const peakRoasValue = peakRoasRow ? primaryRoas(peakRoasRow) : 0;

    return {
      monthCount: meta.months.length,
      totalSpend: totalSpend,
      totalRevenue: totalRevenue,
      totalBookings: totalBookings,
      avgRoas: avgRoas,
      bestMonth: bestMonth,
      peakRoasRow: peakRoasRow,
      peakRoasValue: peakRoasValue
    };
  }

  function totalCampaignBookings(row) {
    return numeric(row.bookingsEmail) + numeric(row.bookingsFb);
  }

  function summarizeRoi(months) {
    const totalRevenue = sumMetric(months, "totalRevenue");
    const directRevenue = sumMetric(months, "directRevenue");
    const newLeads = sumMetric(months, "newLeads");

    return {
      totalViews: sumMetric(months, "totalViews"),
      igViews: sumMetric(months, "igViews"),
      fbViews: sumMetric(months, "fbViews"),
      tiktokViews: sumMetric(months, "tiktokViews"),
      totalFollowers: sumMetric(months, "totalFollowers"),
      igFollowers: sumMetric(months, "igFollowers"),
      fbFollowers: sumMetric(months, "fbFollowers"),
      tiktokFollowers: sumMetric(months, "tiktokFollowers"),
      netNewFollowers: months.length ? Math.max(0, months[months.length - 1].totalFollowers - months[0].totalFollowers) : 0,
      newLeads: newLeads,
      totalRevenue: totalRevenue,
      directRevenue: directRevenue,
      directSplitShare: totalRevenue ? directRevenue / totalRevenue : 0,
      avgDirectSplit: averageMetric(months, "directSplit"),
      websiteTraffic: sumMetric(months, "websiteTraffic"),
      adSpend: sumMetric(months, "adSpend"),
      avgCostPerLead: averageMetric(months, "leadCost"),
      avgCostPerFollower: averageMetric(months, "followerCost")
    };
  }

  function handleNavClick(event) {
    const link = event.target.closest(".nav-link");
    if (!link) {
      return;
    }

    const targetId = link.getAttribute("href");
    if (!targetId || targetId.charAt(0) !== "#") {
      return;
    }

    const target = document.querySelector(targetId);
    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    setSidebarOpen(false, true);

    const navRoot = link.closest(".sidebar-nav");
    if (navRoot) {
      navRoot.querySelectorAll(".nav-link").forEach(function (item) {
        item.classList.toggle("active", item === link);
      });
    }
  }

  function bindMetaViewInteractions() {
    if (!els.metaView) {
      return;
    }

    const comparisonToggle = els.metaView.querySelector("[data-meta-comparison-toggle]");
    if (comparisonToggle) {
      comparisonToggle.addEventListener("click", function (event) {
        event.preventDefault();
        state.metaComparisonExpanded = !state.metaComparisonExpanded;
        destroyCharts("meta-");
        renderMetaView(els.monthInput.value);
      });
    }

    els.metaView.querySelectorAll("[data-meta-campaign-toggle-button]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        handleMetaCampaignToggle(button.getAttribute("data-meta-campaign-toggle-button"));
      });
    });

    els.metaView.querySelectorAll("[data-meta-campaign-toggle]").forEach(function (card) {
      card.addEventListener("click", function (event) {
        if (event.target.closest("[data-meta-campaign-toggle-button]")) {
          return;
        }
        event.preventDefault();
        handleMetaCampaignToggle(card.getAttribute("data-meta-campaign-toggle"));
      });
    });
  }

  function switchView(view) {
    state.activeView = view === "meta" ? "meta" : view === "pricing" ? "pricing" : "roi";
    setSidebarOpen(false, true);
    els.sidebarDashboardTitle.textContent = state.activeView === "meta"
      ? "Meta Ads Dashboard"
      : state.activeView === "pricing"
        ? "Pricing Tool"
        : "Performance Dashboard";
    applyViewState();
    updateRoute(els.clientSelect.value, els.monthInput.value, state.activeView);
    destroyCharts();
    if (state.activeView === "meta") {
      renderMetaView(els.monthInput.value);
    } else if (state.activeView === "pricing") {
      renderPricingView(els.monthInput.value);
    } else {
      if (state.roiMonths.length) {
        renderRoiCharts();
      } else {
        renderRoiEmpty(els.monthInput.value);
      }
    }
  }

  function handleMetaCampaignToggle(campaignType) {
    if (!campaignType) {
      return;
    }

    const key = metaCampaignToggleKey(campaignType);
    const shouldOpen = !state.metaExpandedCampaigns[key];
    Object.keys(state.metaExpandedCampaigns).forEach(function (existingKey) {
      state.metaExpandedCampaigns[existingKey] = false;
    });
    state.metaExpandedCampaigns[key] = shouldOpen;
    state.pendingMetaScrollKey = shouldOpen ? key : "";
    destroyCharts("meta-");
    renderMetaView(els.monthInput.value);
  }

  function syncMetaExpandedCampaigns(meta) {
    const nextState = {};
    const campaignTypes = (meta && meta.campaignTypes) || [];

    campaignTypes.forEach(function (campaignType) {
      const key = metaCampaignToggleKey(campaignType);
      nextState[key] = Object.prototype.hasOwnProperty.call(state.metaExpandedCampaigns, key)
        ? state.metaExpandedCampaigns[key]
        : false;
    });

    state.metaExpandedCampaigns = nextState;
  }

  function syncClientFrame(client, selectedMonth) {
    if (!client) {
      return;
    }

    document.title = document.body.classList.contains("auth-locked")
      ? "HGM Client Dashboard"
      : client.name + " | " + (state.activeView === "meta"
        ? "Meta Ads Dashboard"
        : state.activeView === "pricing"
          ? "Pricing Tool"
          : "Performance Dashboard");
    els.sidebarCurrentMonth.textContent = formatMonthKey(selectedMonth);
    var heading = document.getElementById("clientNameHeading") || els.clientNameHeading;
    if (heading) {
      heading.textContent = client.name;
    }
    var exportGroup = document.getElementById("exportBtnGroup");
    if (exportGroup) exportGroup.style.display = "flex";
    var perfWrap = document.getElementById("exportPerfBtnWrap");
    if (perfWrap) perfWrap.style.display = "flex";
  }

  function applyViewState() {
    const isMeta = state.activeView === "meta";
    const isPricing = state.activeView === "pricing";
    els.roiSegmentBtn.classList.toggle("active", !isMeta && !isPricing);
    els.metaSegmentBtn.classList.toggle("active", isMeta);
    if (els.pricingSegmentBtn) {
      els.pricingSegmentBtn.classList.toggle("hidden", !state.pricingToolAvailable);
      els.pricingSegmentBtn.classList.toggle("active", isPricing && state.pricingToolAvailable);
    }
    els.roiNav.classList.toggle("hidden", isMeta || isPricing);
    els.metaNav.classList.toggle("hidden", !isMeta || isPricing);
    els.roiView.classList.toggle("hidden", isMeta || isPricing);
    els.metaView.classList.toggle("hidden", !isMeta || isPricing);
    if (els.pricingView) {
      els.pricingView.classList.toggle("hidden", !isPricing || !state.pricingToolAvailable);
    }
    if (state.client) {
      var perfWrap = document.getElementById("exportPerfBtnWrap");
      var metaWrap = document.getElementById("exportMetaBtnWrap");
      if (perfWrap) perfWrap.style.display = (!isMeta && !isPricing) ? "flex" : "none";
      if (metaWrap) metaWrap.style.display = isMeta ? "flex" : "none";
    }
  }

  function renderList(element, items) {
    if (!element) {
      return;
    }
    element.innerHTML = items.map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("");
  }

  function setDefaultRoiOverviewLabels() {
    setText(els.summaryLabel1, "Total Revenue");
    setText(els.summaryLabel2, "Direct Revenue");
    setText(els.summaryLabel3, "Direct Split");
    setText(els.summaryLabel4, "New Leads");
    setText(els.summaryLabel5, "New Followers");
    setText(els.summaryLabel6, "Views");
    setText(els.summaryNote1, "");
    setText(els.summaryNote2, "");
    setText(els.summaryNote3, "");
    setText(els.summaryAvgCostPerLeadNote, "");
    setText(els.summaryNote5, "");
    setText(els.summaryNote6, "");
  }

  // Find the best matching analysis entry: exact period_key match first,
  // then fall back to the most recent period_key <= selectedMonth.
  function findBestAnalysisEntry(store, selectedMonth) {
    if (!store) return null;
    if (store[selectedMonth]) return store[selectedMonth];
    // Find the closest period_key that is <= selectedMonth
    const keys = Object.keys(store).filter(function(k) { return k <= selectedMonth; }).sort();
    if (keys.length) return store[keys[keys.length - 1]];
    return null;
  }

  function applyRoiAnalysis(clientSlug, selectedMonth) {
    const entry = getRoiAnalysisEntry(clientSlug, selectedMonth);
    if (!entry) return;
    if (Array.isArray(entry.key_takeaways) && entry.key_takeaways.length) {
      renderList(els.summaryOverviewList, entry.key_takeaways);
    }
  }

  function getRoiAnalysisEntry(clientSlug, selectedMonth) {
    const clientData = state.roiAnalysis && state.roiAnalysis[clientSlug];
    if (!clientData || !clientData.roi) return null;
    return findBestAnalysisEntry(clientData.roi, selectedMonth);
  }

  function getMetaAnalysisEntry(clientSlug, selectedMonth) {
    const clientData = state.metaAnalysis && state.metaAnalysis[clientSlug];
    if (!clientData || !clientData.meta) return null;
    return findBestAnalysisEntry(clientData.meta, selectedMonth);
  }

  function renderPills(element, items) {
    element.innerHTML = items.map(function (item) {
      return '<div class="insight-pill">' + escapeHtml(item) + "</div>";
    }).join("");
  }

  function renderMetaDelta(previous, current, isRatio) {
    if (previous === null || previous === undefined || !Number.isFinite(Number(previous))) {
      return "";
    }

    const delta = percentDelta(previous, current);
    const className = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
    const prefix = delta > 0 ? "+" : "";
    const rounded = Math.round(delta);
    if (!Number.isFinite(rounded)) {
      return "";
    }

    return '<span class="meta-delta ' + className + '">' + escapeHtml(prefix + rounded + "%") + "</span>";
  }

  function setTrendBadge(element, value) {
    if (!element) {
      return;
    }
    const rounded = Number.isFinite(Number(value)) ? Math.round(value) : 0;
    const positive = rounded > 0;
    const negative = rounded < 0;

    element.classList.remove("positive", "negative", "neutral");
    if (positive) {
      element.classList.add("positive");
      element.textContent = "▲ " + Math.abs(rounded) + "%";
    } else if (negative) {
      element.classList.add("negative");
      element.textContent = "▼ " + Math.abs(rounded) + "%";
    } else {
      element.classList.add("neutral");
      element.textContent = "0%";
    }
  }

  function setPeakBadge(element, month) {
    if (!element) {
      return;
    }

    if (!month) {
      element.className = "stat-tile-trend neutral";
      element.textContent = "Peak -";
      return;
    }

    element.className = "stat-tile-trend positive";
    element.textContent = "Peak " + month.shortLabel + " '" + month.key.slice(2, 4);
  }

  function setupSectionObserver() {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, index) {
        if (entry.isIntersecting) {
          setTimeout(function () {
            entry.target.classList.add("visible");
          }, index * 60);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    });

    document.querySelectorAll(".section").forEach(function (section) {
      observer.observe(section);
    });
  }

  function showMessage(message, tone) {
    var target = document.getElementById("statusMessage") || els.statusMessage;
    if (!target) {
      return;
    }
    target.className = "status-message";
    target.textContent = message || "";
    if (!message) {
      target.style.display = "none";
      return;
    }

    target.classList.add(tone === "error" ? "error" : "info");
    target.style.display = "block";
  }

  function setLoading(isLoading) {
    els.applyFilterBtn.disabled = isLoading;
    els.applyFilterBtn.textContent = isLoading ? "Loading..." : "Apply Filter";
  }

  function updateRoute(clientSlug, month, view) {
    var nextView = view === "meta" ? "meta" : view === "pricing" ? "pricing" : "roi";
    if (!state.isAdminAccess) {
      var clientParam = buildRouteClientParam(clientSlug);
      var token = encodeRouteToken(clientParam, month, nextView);
      window.history.replaceState({}, "", window.location.pathname + "?t=" + token);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.set("client", buildRouteClientParam(clientSlug));
    params.set("month", month);
    params.set("view", nextView);
    params.delete("code");
    params.delete("clientName");
    window.history.replaceState({}, "", window.location.pathname + "?" + params.toString());
  }

  function enumerateMonths(from, to) {
    const result = [];
    const cursor = new Date(from + "-01T00:00:00");
    const end = new Date(to + "-01T00:00:00");

    while (cursor <= end) {
      result.push(cursor.getFullYear() + "-" + String(cursor.getMonth() + 1).padStart(2, "0"));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return result;
  }

  function sharedChart(type, height) {
    return {
      type: type,
      height: height,
      fontFamily: "Inter",
      toolbar: { show: false },
      accessibility: { enabled: false },
      animations: { enabled: true, easing: "easeout", speed: 360 },
      zoom: { enabled: false }
    };
  }

  function sharedBarPlot() {
    return {
      bar: { horizontal: false, columnWidth: "55%", borderRadius: 8, borderRadiusApplication: "end" }
    };
  }

  function getChartLabelBreakpoint() {
    const width = window.innerWidth || document.documentElement.clientWidth || 1440;
    if (width < 720) {
      return "xs";
    }
    if (width < 980) {
      return "sm";
    }
    if (width < 1280) {
      return "md";
    }
    return "lg";
  }

  function sharedXAxis(categories, options) {
    options = options || {};
    return {
      categories: categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      crosshairs: {
        show: false
      },
      labels: buildResponsiveSharedXAxisLabels(categories, options)
    };
  }

  function buildResponsiveSharedXAxisLabels(categories, options) {
    options = options || {};
    const breakpoint = getChartLabelBreakpoint();
    const count = Array.isArray(categories) ? categories.length : 0;
    let step = 1;

    if (breakpoint === "xs") {
      step = count > 8 ? 3 : count > 4 ? 2 : 1;
    } else if (breakpoint === "sm") {
      step = count > 10 ? 3 : count > 5 ? 2 : 1;
    } else if (breakpoint === "md") {
      step = count > 12 ? 2 : 1;
    }

    const rotate = typeof options.rotate === "number"
      ? options.rotate
      : breakpoint === "xs"
        ? -55
        : breakpoint === "sm"
          ? -40
          : 0;

    return {
      style: {
        colors: "#8FA1BF",
        fontSize: breakpoint === "xs" ? "10px" : "11px",
        fontWeight: 500
      },
      offsetY: options.offsetY || 0,
      hideOverlappingLabels: false,
      trim: false,
      rotate: rotate,
      rotateAlways: rotate !== 0,
      minHeight: rotate ? (breakpoint === "xs" ? 62 : 52) : 36,
      maxHeight: rotate ? (breakpoint === "xs" ? 62 : 52) : 36,
      formatter: function (value, _timestamp, opts) {
        const index = opts && typeof opts.i === "number" ? opts.i : categories.indexOf(value);
        if (step > 1 && index >= 0 && index % step !== 0 && index !== count - 1) {
          return "";
        }
        return value;
      }
    };
  }

  function sharedYAxis(formatter, options) {
    options = options || {};
    return {
      min: options.min,
      max: options.max,
      tickAmount: options.tickAmount,
      labels: {
        style: { colors: "#8FA1BF", fontSize: "11px", fontWeight: 500 },
        formatter: formatter,
        offsetX: options.offsetX || 0,
        minWidth: options.minWidth || undefined
      },
      forceNiceScale: true
    };
  }

  function sharedGrid(options) {
    options = options || {};
    return {
      borderColor: "#E7EDF6",
      strokeDashArray: 3,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: options.padding || undefined
    };
  }

  function roundUpAxis(value) {
    if (!value || value <= 10) {
      return 10;
    }
    if (value <= 20) {
      return 20;
    }
    if (value <= 50) {
      return 50;
    }
    return Math.ceil(value / 20) * 20;
  }

  function roundUpValue(value) {
    if (!value || value <= 10) {
      return 10;
    }
    if (value <= 100) {
      return Math.ceil(value / 10) * 10;
    }
    if (value <= 1000) {
      return Math.ceil(value / 100) * 100;
    }
    if (value <= 10000) {
      return Math.ceil(value / 1000) * 1000;
    }
    return Math.ceil(value / 5000) * 5000;
  }

  function roundDownToStep(value, step) {
    if (!step) {
      return Math.max(0, value);
    }
    return Math.max(0, Math.floor(value / step) * step);
  }

  function roundUpToStep(value, step) {
    if (!step) {
      return Math.max(0, value);
    }
    return Math.max(step, Math.ceil(value / step) * step);
  }

  function chooseAxisStep(maxValue) {
    const safeMax = Math.max(0, numeric(maxValue));
    if (safeMax <= 10) {
      return 1;
    }
    if (safeMax <= 50) {
      return 5;
    }
    if (safeMax <= 100) {
      return 10;
    }
    if (safeMax <= 500) {
      return 50;
    }
    if (safeMax <= 1000) {
      return 100;
    }
    if (safeMax <= 10000) {
      return 1000;
    }
    if (safeMax <= 100000) {
      return 5000;
    }
    return 25000;
  }

  function buildTrendAxisBounds(values, options) {
    options = options || {};
    const numericValues = (values || []).map(numeric).filter(function (value) {
      return Number.isFinite(value);
    });

    if (!numericValues.length) {
      return { min: 0, max: 10, tickAmount: 4 };
    }

    const minValue = Math.min.apply(null, numericValues);
    const maxValue = Math.max.apply(null, numericValues);
    const spread = maxValue - minValue;
    const effectiveSpread = spread || Math.max(1, maxValue * 0.12);
    const lowerPadding = effectiveSpread * (options.lowerPaddingRatio || 0.18);
    const upperPadding = effectiveSpread * (options.upperPaddingRatio || 0.14);
    const shouldStartAtZero = options.forceZero === true
      || minValue <= 0
      || (
        options.preferDataMin !== true
        && minValue / Math.max(maxValue, 1) < (options.tightRangeThreshold || 0.45)
      );
    const step = options.step || chooseAxisStep(maxValue + upperPadding);
    const axisMin = shouldStartAtZero ? 0 : roundDownToStep(minValue - lowerPadding, step);
    const axisMax = roundUpToStep(maxValue + upperPadding, step);

    return {
      min: axisMin,
      max: Math.max(axisMin + step, axisMax),
      tickAmount: options.tickAmount || 4
    };
  }

  function buildCurrencyAxisBounds(minValue, maxValue, step) {
    const safeStep = step || 250;
    const safeMax = Math.max(0, numeric(maxValue));
    const safeMin = Math.max(0, numeric(minValue));
    const axisMin = safeMin > 0 ? Math.floor(safeMin / safeStep) * safeStep : 0;
    const axisMax = Math.max(axisMin + safeStep, Math.ceil(safeMax / safeStep) * safeStep);
    return {
      min: axisMin,
      max: axisMax,
      tickAmount: Math.max(1, Math.round((axisMax - axisMin) / safeStep))
    };
  }

  function sharedLegend(show) {
    if (show === false) {
      return { show: false };
    }

    return {
      position: "bottom",
      horizontalAlign: "center",
      fontSize: "11px",
      fontWeight: 500,
      markers: {
        width: 8,
        height: 8,
        radius: 999
      },
      itemMargin: {
        horizontal: 12
      },
      labels: { colors: "#64748B" }
    };
  }

  function destroyCharts(prefix) {
    state.allCharts = state.allCharts.filter(function (entry) {
      const shouldDestroy = !prefix || entry.key.indexOf(prefix) === 0;
      if (shouldDestroy && entry.chart && typeof entry.chart.destroy === "function") {
        entry.chart.destroy();
      }
      return !shouldDestroy;
    });
  }

  function pushChart(chart, key) {
    state.allCharts.push({ chart: chart, key: key });
  }

  function renderMatchingCharts(prefix) {
    state.allCharts.forEach(function (entry) {
      if (entry.key.indexOf(prefix) === 0) {
        entry.chart.render();
      }
    });
  }

  function refreshRenderedCharts(prefix) {
    window.requestAnimationFrame(function () {
      window.setTimeout(function () {
        state.allCharts.forEach(function (entry) {
          if (entry.key.indexOf(prefix) === 0 && entry.chart) {
            if (typeof entry.chart.windowResizeHandler === "function") {
              entry.chart.windowResizeHandler();
            } else if (typeof entry.chart.updateOptions === "function") {
              entry.chart.updateOptions({}, false, false);
            }
          }
        });
      }, 60);
    });
  }

  function primaryRoas(row) {
    return numeric(row.roas) || numeric(row.blendedRoas);
  }

  function performanceStatus(row) {
    const roas = primaryRoas(row);
    if (roas >= 10) {
      return { label: "Great", className: "great" };
    }
    if (roas >= 5) {
      return { label: "Solid", className: "solid" };
    }
    if (roas >= 1) {
      return { label: "Decent", className: "decent" };
    }
    if (row.revenue > 0) {
      return { label: "Building", className: "building" };
    }
    return { label: "Weak", className: "weak" };
  }

  function metaComment(row) {
    if (row.comments) {
      return row.comments;
    }
    if (primaryRoas(row) >= 10) {
      return "Strong month with efficient revenue capture and healthy traffic quality.";
    }
    if (numeric(row.leadsFollowers) > 0) {
      return "Lead and audience generation stayed active, but conversion efficiency has room to improve.";
    }
    return "This campaign is still building toward stronger conversion signals.";
  }

  function chooseVolumeMetric(rows) {
    if (rows.some(function (row) { return numeric(row.leadsFollowers) > 0; })) {
      return { key: "leadsFollowers", label: "Leads / Followers" };
    }
    if (rows.some(function (row) { return numeric(row.bookingsFb) > 0; })) {
      return { key: "bookingsFb", label: "FB Bookings" };
    }
    if (rows.some(function (row) { return numeric(row.bookingsEmail) > 0; })) {
      return { key: "bookingsEmail", label: "Email Bookings" };
    }
    return { key: "profileVisits", label: "Profile Visits" };
  }

  function chooseEfficiencyMetric(rows) {
    if (rows.some(function (row) { return numeric(row.costPerLeadFollower) > 0; })) {
      return { key: "costPerLeadFollower", label: "Cost / Lead-Follower" };
    }
    if (rows.some(function (row) { return numeric(row.costPerBooking) > 0; })) {
      return { key: "costPerBooking", label: "Cost / Booking" };
    }
    return { key: "costPerVisit", label: "Cost / Visit" };
  }

  function monthColor(index) {
    return META_COLORS[index % META_COLORS.length];
  }

  function monthLightColor(index) {
    return ["#DBEAFE", "#FEF3C7", "#D1FAE5"][index % 3];
  }

  function highestMonth(rows, field) {
    if (!rows.length) {
      return null;
    }

    return rows.reduce(function (highest, row) {
      return !highest || numeric(row[field]) > numeric(highest[field]) ? row : highest;
    }, null);
  }

  function highestRow(rows, field) {
    if (!rows.length) {
      return null;
    }
    return rows.reduce(function (highest, row) {
      return !highest || numeric(row[field]) > numeric(highest[field]) ? row : highest;
    }, null);
  }

  function lowestPositiveRow(rows, field) {
    const filtered = rows.filter(function (row) {
      return numeric(row[field]) > 0;
    });
    if (!filtered.length) {
      return null;
    }
    return filtered.reduce(function (lowest, row) {
      return !lowest || numeric(row[field]) < numeric(lowest[field]) ? row : lowest;
    }, null);
  }

  function highestMonthText(months, field, label) {
    const month = highestMonth(months, field);
    if (!month) {
      return "No " + label + " data was available.";
    }
    return month.label + " recorded the highest " + label + " at " + formatNumber(month[field]) + ".";
  }

  function sumMetric(rows, field) {
    return rows.reduce(function (sum, row) {
      return sum + numeric(row[field]);
    }, 0);
  }

  function averageMetric(rows, field) {
    const values = rows.map(function (row) { return numeric(row[field]); }).filter(function (value) { return value > 0; });
    if (!values.length) {
      return 0;
    }
    return values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
  }

  function share(part, whole) {
    return whole ? numeric(part) / numeric(whole) : 0;
  }

  function percentDelta(start, end) {
    const initial = numeric(start);
    const final = numeric(end);
    if (!initial) {
      return final ? 100 : 0;
    }
    return ((final - initial) / initial) * 100;
  }

  function numeric(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function isNA(value) {
    return typeof value === "string" && value.toUpperCase() === "N/A";
  }

  /**
   * Smart stat renderer for individual metric tiles.
   *   "N/A"            → "N/A (not tracked)"  (uses innerHTML)
   *   null / undefined → "—"
   *   any number       → formatter(value)
   */
  function setStatText(element, rawVal, formatter) {
    if (!element) return;
    if (isNA(rawVal)) {
      element.innerHTML = 'N/A <small style="opacity:0.45;font-size:0.65em;font-weight:400">(not tracked)</small>';
    } else if (rawVal === null || rawVal === undefined) {
      element.textContent = "—";
    } else {
      element.textContent = formatter(rawVal);
    }
  }

  function parsePercentText(value) {
    if (typeof value === "number") {
      return value;
    }
    if (!value) {
      return 0;
    }
    return numeric(String(value).replace("%", ""));
  }

  function estimatePreviousTotal(current, growthDecimal) {
    const growth = numeric(growthDecimal);
    return growth > -1 && growth !== 0 ? current / (1 + growth) : current;
  }

  function toMonthKey(year, month) {
    return String(year) + "-" + String(month).padStart(2, "0");
  }

  function formatMonthKey(value) {
    return monthFormatter.format(new Date(value + "-01T00:00:00"));
  }

  function formatShortMonthKey(value) {
    return shortMonthFormatter.format(new Date(value + "-01T00:00:00"));
  }

  function formatShortMonthYearKey(value) {
    var date = new Date(value + "-01T00:00:00");
    return shortMonthFormatter.format(date) + " " + date.getFullYear();
  }

  function formatShortMonthYearKeyCompact(value) {
    var date = new Date(value + "-01T00:00:00");
    return shortMonthFormatter.format(date) + " " + date.getFullYear();
  }

  function formatNumber(value) {
    return Math.round(numeric(value)).toLocaleString("en-US");
  }

  function formatSignedNumber(value) {
    const amount = numeric(value);
    if (amount > 0) {
      return "+" + formatNumber(amount);
    }
    if (amount < 0) {
      return "-" + formatNumber(Math.abs(amount));
    }
    return "0";
  }

  function formatNullableNumber(value) {
    return value === null || value === undefined ? "—" : formatNumber(value);
  }

  function formatCurrency(value, digits) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: digits === 0 ? 0 : 2,
      maximumFractionDigits: digits === 0 ? 0 : 2
    }).format(numeric(value));
  }

  function formatNullableCurrency(value) {
    return value === null || value === undefined ? "—" : formatCurrency(value);
  }

  function formatCurrencyCompact(value) {
    const amount = numeric(value);
    if (amount >= 1000) {
      return "$" + (amount / 1000).toFixed(0) + "K";
    }
    return "$" + round2(amount);
  }

  function formatRoiCompactNumber(value) {
    const amount = numeric(value);
    if (amount >= 1000000) {
      return trimCompactDecimal(amount / 1000000) + "M";
    }
    if (amount >= 1000) {
      return trimCompactDecimal(amount / 1000) + "K";
    }
    return String(Math.round(amount));
  }

  function formatRoiCompactCurrency(value) {
    const amount = numeric(value);
    if (amount >= 1000000) {
      return "$" + trimCompactDecimal(amount / 1000000) + "M";
    }
    if (amount >= 1000) {
      return "$" + trimCompactDecimal(amount / 1000) + "K";
    }
    return "$" + round2(amount);
  }

  function trimCompactDecimal(value) {
    const amount = numeric(value);
    const truncated = amount >= 0
      ? Math.floor(amount * 10) / 10
      : Math.ceil(amount * 10) / 10;
    return truncated.toFixed(1).replace(/\.0$/, ".0");
  }

  function formatPercent(value, digits) {
    return (numeric(value) * 100).toFixed(digits === undefined ? 0 : digits) + "%";
  }

  function formatPercentPoints(value) {
    const amount = Math.round(numeric(value) * 10) / 10;
    return (Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(1)) + "%";
  }

  function formatNullablePercent(value) {
    return value === null || value === undefined ? "—" : formatPercent(value, 0);
  }

  function roasTone(value) {
    const score = numeric(value);
    if (score >= 10) {
      return "good";
    }
    if (score >= 5) {
      return "neutral";
    }
    if (score > 0) {
      return "warn";
    }
    return "bad";
  }

  function costVisitTone(value) {
    const score = numeric(value);
    if (!score) {
      return "neutral";
    }
    if (score <= 0.2) {
      return "good";
    }
    if (score <= 0.3) {
      return "neutral";
    }
    return "bad";
  }

  function leadFollowerTone(value) {
    const score = numeric(value);
    if (!score) {
      return "neutral";
    }
    if (score <= 0.3) {
      return "good";
    }
    if (score <= 0.8) {
      return "warn";
    }
    return "bad";
  }

  function bookingTone(value) {
    const score = numeric(value);
    if (!score) {
      return "neutral";
    }
    if (score <= 100) {
      return "good";
    }
    if (score <= 200) {
      return "warn";
    }
    return "bad";
  }

  function abvTone(value) {
    const score = numeric(value);
    if (!score) {
      return "neutral";
    }
    if (score <= 0.15) {
      return "good";
    }
    if (score <= 0.4) {
      return "warn";
    }
    return "bad";
  }

  function formatSignedPercent(value, digits) {
    const rounded = numeric(value).toFixed(digits === undefined ? 0 : digits);
    return (numeric(value) > 0 ? "+" : "") + rounded + "%";
  }

  function formatLargeNumber(value) {
    const number = numeric(value);
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + "M";
    }
    if (number >= 1000) {
      return (number / 1000).toFixed(1) + "K";
    }
    return String(Math.round(number));
  }

  function formatCompactNumber(value) {
    const number = numeric(value);
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + "M";
    }
    if (number >= 1000) {
      return (number / 1000).toFixed(0) + "K";
    }
    return String(Math.round(number));
  }

  function formatMultiple(value) {
    return round2(value) + "x";
  }

  function round2(value) {
    return Math.round(numeric(value) * 100) / 100;
  }

  function slugify(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function setText(element, value) {
    if (!element) {
      return;
    }
    element.textContent = value;
  }

  function setBarWidth(element, ratio) {
    if (!element) {
      return;
    }
    element.style.width = Math.max(0, Math.min(100, numeric(ratio) * 100)) + "%";
  }


  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
