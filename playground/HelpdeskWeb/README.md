# Helpdesk Console

A small React + Vite frontend for the [HelpdeskApi](../HelpdeskApi) playground sample. Paste a JWT generated from the
Aspire dashboard (or `aspire resource apiservice jwt-customer`) to browse and act on tickets, gated by the token's
`role` and `scope` claims.

This app is wired into the AppHost as the `web` resource and expects `VITE_API_BASE_URL` to be supplied by Aspire —
run it via `aspire start` / `aspire run` from the repo root rather than `npm run dev` directly.
