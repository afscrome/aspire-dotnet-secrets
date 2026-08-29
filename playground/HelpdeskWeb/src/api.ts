import type { Company, Ticket } from "./types";

const baseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

export interface ApiActivity {
  method: string;
  path: string;
  status: number;
  ok: boolean;
  timestamp: number;
}

export type ActivityListener = (entry: ApiActivity) => void;

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
}

async function call<T>(
  token: string,
  method: string,
  path: string,
  body: unknown,
  onActivity: ActivityListener,
): Promise<ApiResult<T>> {
  if (!baseUrl) {
    throw new Error("VITE_API_BASE_URL is not set. Run this app through the Aspire AppHost, not `npm run dev` directly.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  onActivity({ method, path, status: response.status, ok: response.ok, timestamp: Date.now() });

  let data: T | undefined;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = undefined;
    }
  }

  return { ok: response.ok, status: response.status, data };
}

export const getTickets = (token: string, org: string | null, onActivity: ActivityListener) =>
  call<Ticket[]>(token, "GET", org ? `/tickets?org=${encodeURIComponent(org)}` : "/tickets", undefined, onActivity);

export const createTicket = (token: string, subject: string, body: string, onActivity: ActivityListener) =>
  call<Ticket>(token, "POST", "/tickets", { subject, body }, onActivity);

export const addComment = (token: string, id: number, text: string, onActivity: ActivityListener) =>
  call<Ticket>(token, "POST", `/tickets/${id}/comments`, { text }, onActivity);

export const assignTicket = (token: string, id: number, assignedTo: string, onActivity: ActivityListener) =>
  call<Ticket>(token, "POST", `/tickets/${id}/assign`, { assignedTo }, onActivity);

export const closeTicket = (token: string, id: number, onActivity: ActivityListener) =>
  call<Ticket>(token, "POST", `/tickets/${id}/close`, undefined, onActivity);

export const deleteTicket = (token: string, id: number, onActivity: ActivityListener) =>
  call<void>(token, "DELETE", `/tickets/${id}`, undefined, onActivity);

export const getCompanies = (token: string, onActivity: ActivityListener) =>
  call<Company[]>(token, "GET", "/companies", undefined, onActivity);

export const createCompany = (token: string, id: string, name: string, onActivity: ActivityListener) =>
  call<Company>(token, "POST", "/companies", { id, name }, onActivity);

export const deleteCompany = (token: string, id: string, onActivity: ActivityListener) =>
  call<void>(token, "DELETE", `/companies/${encodeURIComponent(id)}`, undefined, onActivity);
