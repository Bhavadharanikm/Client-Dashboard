import type { RoiViewModel } from "@/lib/roi-metrics";

/**
 * Note: dashboard.js references several DOM ids for this section that no
 * longer exist in the current index.html markup (contentViewsChart,
 * contentMetaShareBar/Text, contentInstagramShareBar, contentTiktokShareBar,
 * etc.) — those are dead code from an earlier template revision. The already-
 * ported static RoiView.tsx (source of truth for current markup/CSS) only has
 * the ids rendered below, so this section is data-only with no chart mount.
 */
export function AwarenessSection({ model }: { model: RoiViewModel }) {
  const { awareness: a } = model;

  return (
    <section id="content-views" className="section reveal">
      <div className="pp-stage">
        <span className="pp-stage-num">02</span>
        <span className="pp-stage-title">Awareness</span>
        <div className="pp-stage-line" />
        <div className="pp-stage-accent" style={{ background: "var(--pp-orange)" }} />
      </div>
      <div className="pp-awareness">
        <div className="pp-glass pp-awareness-top">
          <div>
            <div className="pp-hero-label">Total Content Views</div>
            <div className="pp-hero-number" id="contentTotalViewsDisplay">
              {a.contentTotalViewsDisplay}
            </div>
          </div>
          <div className="pp-awareness-top-right">
            <div className="pp-hero-sub" id="contentTotalViewsSubcopy">
              {a.contentTotalViewsSubcopy}
            </div>
            <div className="pp-hero-foot">
              <span className="pp-tag pp-tag-orange" id="contentPeakPill">
                {a.contentPeakPill}
              </span>
            </div>
          </div>
        </div>
        <div className="pp-awareness-cards">
          <div className="pp-glass pp-stat">
            <div className="pp-s-label">IG Views</div>
            <div className="pp-s-value" id="contentInstagramViews">
              {a.contentInstagramViews}
            </div>
            <div className="pp-s-meta">
              <span className="pp-tag pp-tag-blue" id="contentInstagramNote">
                {a.contentInstagramNote}
              </span>
            </div>
          </div>
          <div className="pp-glass pp-stat">
            <div className="pp-s-label">FB Views</div>
            <div className="pp-s-value" id="contentMetaViews">
              {a.contentMetaViews}
            </div>
            <div className="pp-s-meta">
              <span className="pp-tag pp-tag-orange" id="contentMetaNote">
                {a.contentMetaNote}
              </span>
            </div>
          </div>
          <div className="pp-glass pp-stat">
            <div className="pp-s-label">TikTok Views</div>
            <div className="pp-s-value" id="contentTiktokViews">
              {a.contentTiktokViews}
            </div>
            <div className="pp-s-sub" id="contentTiktokPeakText">
              {a.contentTiktokPeakText}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
