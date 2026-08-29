import type { DecodedToken } from "./types";

// Decodes a JWT payload for display purposes only. This does NOT verify the
// signature - the API is the source of truth for whether a token is valid.
export function decodeToken(token: string): DecodedToken | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return {
      sub: payload.sub,
      org: payload.org,
      role: payload.role,
      scope: payload.scope,
      exp: payload.exp,
      raw: token.trim(),
    };
  } catch {
    return null;
  }
}

export function scopesOf(token: DecodedToken | null): string[] {
  return token?.scope?.split(" ").filter(Boolean) ?? [];
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return decodeURIComponent(
    atob(padded)
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join(""),
  );
}
