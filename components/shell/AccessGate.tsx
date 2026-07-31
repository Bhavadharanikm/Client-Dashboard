"use client";

import { useActionState, useState } from "react";
import { submitAccessCode, type AccessCodeState } from "@/app/login/actions";

const initialState: AccessCodeState = { error: null };

export function AccessGate() {
  const [state, formAction, isPending] = useActionState(submitAccessCode, initialState);
  const [code, setCode] = useState("");

  // Accepts both the original 5-digit codes and newer 8-digit ones (see
  // generateCandidateCode in app/admin/super/actions.ts) — existing clients'
  // codes still work unchanged.
  const digits = code.replace(/\D/g, "").slice(0, 8);
  const canSubmit = digits.length >= 4 && !isPending;

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
                inputMode="numeric"
                maxLength={8}
                placeholder="_ _ _ _ _ _ _ _"
                autoComplete="off"
                spellCheck={false}
                aria-label="access code"
                value={digits}
                onChange={(event) => setCode(event.target.value)}
              />
              <div className="dots" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
                  <div key={index} className={`dot${index < digits.length ? " on" : ""}`} />
                ))}
              </div>
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
