"use client";

import { useActionState, useState } from "react";
import { submitAccessCode, type AccessCodeState } from "@/app/login/actions";

const initialState: AccessCodeState = { error: null };

export function AccessGate() {
  const [state, formAction, isPending] = useActionState(submitAccessCode, initialState);
  const [code, setCode] = useState("");

  // Accepts every code format that exists across clients: the original
  // 5-digit-only codes, the later 8-digit-only codes, and the newest
  // 8-digit + 3-letter codes (see generateCandidateCode in
  // app/admin/super/actions.ts) — existing clients' codes keep working
  // unchanged. Uppercased to match the password exactly as generated.
  const digits = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
  const canSubmit = digits.length >= 5 && !isPending;

  return (
    <div className="auth-gate" id="authGate" aria-live="polite">
      <div className="root">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
        <div className="card">
          <div className="logo-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="logo-image" src="/assets/image.png" alt="HiddenGem Media logo" />
            <div>
              <div className="logo-name">HiddenGem Media</div>
              <div className="logo-tagline">Client Dashboard</div>
            </div>
          </div>
          <div className="divider" />
          <div className="title-block">
            <h1>Client Dashboard</h1>
            <p>Enter your access code to open your dashboard.</p>
          </div>
          <form id="authForm" action={formAction} style={{ animation: "rise 0.5s 0.2s both" }}>
            <label className="label" htmlFor="code">
              Access Code
            </label>
            <div className="field-wrap">
              <div className="prefix">
                HGM <span className="sep">-</span>
              </div>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                maxLength={11}
                placeholder="_ _ _ _ _ _ _ _ _ _ _"
                autoComplete="off"
                spellCheck={false}
                aria-label="access code"
                value={digits}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <div id="st" className={`status${state.error ? " e" : ""}`} role="status" aria-live="polite">
              {state.error}
            </div>
            <p className="hint">Your access code was shared by your account manager.</p>
            <button id="btn" className={`btn${state.error ? " bad" : ""}`} type="submit" disabled={!canSubmit}>
              <span id="btxt">{isPending ? "Opening..." : "Open Dashboard"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
