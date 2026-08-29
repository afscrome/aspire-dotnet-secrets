import { useEffect, useState } from "react";
import type { DecodedToken } from "../types";
import { scopesOf } from "../jwt";

interface HistoryEntry {
  sub: string;
  role?: string;
  org?: string;
  token: string;
  lastUsed: number;
}

const HISTORY_KEY = "helpdesk-token-history";
const MAX_HISTORY = 8;

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as HistoryEntry[];
  } catch {
    return [];
  }
}

interface TokenPanelProps {
  tokenInput: string;
  decoded: DecodedToken | null;
  onTokenChange: (value: string) => void;
}

export function TokenPanel({ tokenInput, decoded, onTokenChange }: TokenPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  // Remember every distinct token we successfully decode, keyed by its sub claim.
  useEffect(() => {
    if (!decoded?.sub) {
      return;
    }
    setHistory((prev) => {
      const next = [
        { sub: decoded.sub!, role: decoded.role, org: decoded.org, token: decoded.raw, lastUsed: Date.now() },
        ...prev.filter((h) => h.sub !== decoded.sub),
      ].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decoded?.raw]);

  const expiry = decoded?.exp ? new Date(decoded.exp * 1000) : null;
  const isExpired = expiry ? expiry.getTime() < Date.now() : false;

  return (
    <div className="token-section">
      <section className="panel token-panel">
        <button className="panel-header-toggle" onClick={() => setCollapsed(!collapsed)}>
          <h2>
            {collapsed ? "▸" : "▾"} Token
            {collapsed && decoded && (
              <span className="token-summary">
                {" "}
                — <span className={`badge badge-role-${decoded.role ?? "none"}`}>{decoded.role ?? "?"}</span> @ {decoded.org ?? "?"}
              </span>
            )}
          </h2>
        </button>

        {!collapsed && (
          <>
            <p className="hint">
              Generate a token from the Aspire dashboard, or <code>aspire resource apiservice jwt-customer</code>, then paste it below.
            </p>
            <textarea
              className="token-input"
              placeholder="Paste a JWT here..."
              value={tokenInput}
              onChange={(e) => onTokenChange(e.target.value)}
              rows={3}
            />

            {tokenInput.trim() && !decoded && <p className="banner banner-error">That doesn't look like a valid JWT.</p>}

            {decoded && (
              <div className="identity-card">
                <div className="identity-row">
                  <span className="identity-label">sub</span>
                  <span className="identity-value">{decoded.sub ?? "—"}</span>
                </div>
                <div className="identity-row">
                  <span className="identity-label">org</span>
                  <span className="identity-value">{decoded.org ?? "—"}</span>
                </div>
                <div className="identity-row">
                  <span className="identity-label">role</span>
                  <span className={`badge badge-role-${decoded.role ?? "none"}`}>{decoded.role ?? "—"}</span>
                </div>
                <div className="identity-row identity-row-scope">
                  <span className="identity-label">scope</span>
                  <div className="chip-row">
                    {scopesOf(decoded).length > 0 ? (
                      scopesOf(decoded).map((s) => (
                        <span className="chip" key={s}>
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="identity-value">—</span>
                    )}
                  </div>
                </div>
                {expiry && (
                  <div className="identity-row">
                    <span className="identity-label">expires</span>
                    <span className={isExpired ? "identity-value expired" : "identity-value"}>
                      {expiry.toLocaleTimeString()} {isExpired ? "(expired)" : ""}
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <section className="panel token-history-panel">
        <h2>Previous tokens</h2>
        {history.length === 0 && <p className="hint">Tokens you paste will show up here, so you can switch back quickly.</p>}
        <ul className="history-list">
          {history.map((h) => (
            <li key={h.sub}>
              <button
                className={`history-row ${decoded?.sub === h.sub ? "active" : ""}`}
                onClick={() => onTokenChange(h.token)}
              >
                <span className="history-sub">{h.sub}</span>
                <span className={`badge badge-role-${h.role ?? "none"}`}>{h.role ?? "—"}</span>
                {h.org && <span className="chip chip-small">{h.org}</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
