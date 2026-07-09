"use client";

import { useActionState } from "react";
import { adminLogin, type AdminLoginState } from "@/app/admin/login/actions";

const initialState: AdminLoginState = { error: null };

export function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState(adminLogin, initialState);

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
              <div className="logo-tagline">Admin</div>
            </div>
          </div>
          <div className="divider" />
          <div className="title-block">
            <h1>Admin Login</h1>
            <p>Sign in with your admin email and password.</p>
          </div>
          <form action={formAction} style={{ animation: "rise 0.5s 0.2s both" }}>
            <div className="field-group">
              <label className="label" htmlFor="email">
                Email
              </label>
              <div className="field-wrap">
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="field-input"
                  placeholder="you@example.com"
                  autoComplete="username"
                  required
                />
              </div>
            </div>
            <div className="field-group">
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="field-wrap">
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="field-input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>
            <div id="st" className={`status${state.error ? " e" : ""}`} role="status" aria-live="polite">
              {state.error}
            </div>
            <button id="btn" className={`btn${state.error ? " bad" : ""}`} type="submit" disabled={isPending}>
              <span id="btxt">{isPending ? "Signing in..." : "Sign In"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
