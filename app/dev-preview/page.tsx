"use client";

// TEMPORARY — visual check of the new MonthPicker component. Deleted after use.

import { useState } from "react";
import { MonthPicker } from "@/components/shared/MonthPicker";

const availableMonths = ["2026-01", "2026-02", "2026-04", "2026-06"];

export default function DevPreviewPage() {
  const [value, setValue] = useState("2026-06");
  return (
    <div style={{ padding: 60 }}>
      <div style={{ width: 200, border: "1px solid #ccc", borderRadius: 8, padding: "8px 12px" }}>
        <MonthPicker value={value} onChange={setValue} availableMonths={availableMonths} />
      </div>
      <p style={{ marginTop: 20 }}>Selected: {value || "(none)"}</p>
      <p>Available: {availableMonths.join(", ")}</p>
    </div>
  );
}
