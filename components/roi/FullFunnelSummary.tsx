import type { RoiViewModel } from "@/lib/roi-metrics";

export function FullFunnelSummary({ model }: { model: RoiViewModel }) {
  const { funnel, takeawayPeriodLabel, executiveSummary } = model;

  return (
    <section className="section reveal" id="full-funnel-summary">
      <div className="pp-stage">
        <span className="pp-stage-num">01</span>
        <span className="pp-stage-title">Full Funnel Summary</span>
        <div className="pp-stage-line" />
        <div className="pp-stage-accent" style={{ background: "#2997ff" }} />
      </div>
      <div className="pp-grid pp-grid-2">
        <div className="pp-glass pp-funnel-card">
          <div className="pp-chart-title pp-funnel-title">Conversion Funnel</div>
          <div className="pp-funnel-grid">
            <div className="pp-f-row">
              <div className="pp-f-label">Content Views</div>
              <div className="pp-f-track">
                <div
                  className="pp-f-fill"
                  id="funnelViewsFill"
                  style={{ width: `${funnel.views.fillRatio * 100}%`, background: "var(--pp-orange)" }}
                />
              </div>
              <div className="pp-f-val" id="funnelViewsValue">
                {funnel.views.value}
              </div>
            </div>
            <div className="pp-f-conv" id="funnelFollowersConv">
              {funnel.followersConv}
            </div>
            <div className="pp-f-row">
              <div className="pp-f-label">Total Followers</div>
              <div className="pp-f-track">
                <div
                  className="pp-f-fill"
                  id="funnelFollowersFill"
                  style={{ width: `${funnel.followers.fillRatio * 100}%`, background: "var(--pp-blue)" }}
                />
              </div>
              <div className="pp-f-val" id="funnelFollowersValue">
                {funnel.followers.value}
              </div>
            </div>
            <div className="pp-f-conv" id="funnelTrafficConv">
              {funnel.trafficConv}
            </div>
            <div className="pp-f-row">
              <div className="pp-f-label">Sessions</div>
              <div className="pp-f-track">
                <div
                  className="pp-f-fill"
                  id="funnelSessionsFill"
                  style={{ width: `${funnel.sessions.fillRatio * 100}%`, background: "var(--pp-teal)" }}
                />
              </div>
              <div className="pp-f-val" id="funnelSessionsValue">
                {funnel.sessions.value}
              </div>
            </div>
            <div className="pp-f-conv" id="funnelLeadsConv">
              {funnel.leadsConv}
            </div>
            <div className="pp-f-row">
              <div className="pp-f-label">New Leads</div>
              <div className="pp-f-track">
                <div
                  className="pp-f-fill"
                  id="funnelLeadsFill"
                  style={{ width: `${funnel.leads.fillRatio * 100}%`, background: "var(--pp-green)" }}
                />
              </div>
              <div className="pp-f-val" id="funnelLeadsValue">
                {funnel.leads.value}
              </div>
            </div>
            <div className="pp-f-conv" id="funnelRevenueConv">
              {funnel.revenueConv}
            </div>
            <div className="pp-f-row">
              <div className="pp-f-label">Revenue</div>
              <div className="pp-f-track">
                <div
                  className="pp-f-fill"
                  id="funnelRevenueFill"
                  style={{ width: `${funnel.revenue.fillRatio * 100}%`, background: "var(--pp-purple)" }}
                />
              </div>
              <div className="pp-f-val" id="funnelRevenueValue">
                {funnel.revenue.value}
              </div>
            </div>
          </div>
        </div>
        <div className="pp-insight-card pp-insight-card-compact">
          <h2>
            Key Takeaways{" "}
            <span id="takeawayPeriodLabel" style={{ fontSize: "0.6em", fontWeight: 500, opacity: 0.5, whiteSpace: "nowrap" }}>
              {takeawayPeriodLabel}
            </span>
          </h2>
          <ul id="summaryOverviewList" className="pp-insight-list">
            {executiveSummary.overviewItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
