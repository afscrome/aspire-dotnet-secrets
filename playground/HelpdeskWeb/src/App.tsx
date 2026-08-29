import { useEffect, useState } from "react";
import { TokenPanel } from "./components/TokenPanel";
import { TicketList } from "./components/TicketList";
import { TicketDetail } from "./components/TicketDetail";
import { NewTicketForm } from "./components/NewTicketForm";
import { CompaniesPage } from "./components/CompaniesPage";
import { ActivityLog } from "./components/ActivityLog";
import { decodeToken, scopesOf } from "./jwt";
import type { ApiActivity } from "./api";
import {
  addComment,
  assignTicket,
  closeTicket,
  createCompany,
  createTicket,
  deleteCompany,
  deleteTicket,
  getCompanies,
  getTickets,
} from "./api";
import type { Company, Ticket } from "./types";

type View = "tickets" | "companies";

export default function App() {
  const [tokenInput, setTokenInput] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [orgFilter, setOrgFilter] = useState("");
  const [view, setView] = useState<View>("tickets");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [activity, setActivity] = useState<ApiActivity[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  const decoded = decodeToken(tokenInput);
  const scopes = scopesOf(decoded);
  const role = decoded?.role;
  const isStaff = role === "agent" || role === "admin";

  // *:any scopes are a distinct, wider grant from *:own - not just a bigger version of the
  // same permission - so they also require the matching staff role, mirroring the API.
  const canReadAny = scopes.includes("tickets:read:any") && isStaff;
  const canReadOwn = scopes.includes("tickets:read:own");
  const canRead = canReadAny || canReadOwn;

  const canWriteAny = scopes.includes("tickets:write:any") && isStaff;
  const canWriteOwn = scopes.includes("tickets:write:own");
  const canWrite = canWriteAny || canWriteOwn;

  const canAssign = scopes.includes("tickets:assign") && isStaff;

  // Admins need tickets:close:any; customers need tickets:close:own (the API already scopes
  // which tickets a customer ever sees to their own org, so no extra check is needed here).
  // Agents can never close tickets, even with one of these scopes.
  const canClose =
    (role === "admin" && scopes.includes("tickets:close:any")) ||
    (role === "customer" && scopes.includes("tickets:close:own"));
  const canDelete = role === "admin";
  const canManageCompanies = role === "admin";

  const logActivity = (entry: ApiActivity) => setActivity((prev) => [...prev, entry]);

  const refresh = async (org: string) => {
    if (!decoded || !canRead) {
      setTickets([]);
      return;
    }
    setLoading(true);
    const result = await getTickets(decoded.raw, org || null, logActivity);
    setLoading(false);
    if (result.ok && result.data) {
      setTickets(result.data);
    } else {
      setBanner(`GET /tickets failed (${result.status})`);
    }
  };

  const refreshCompanies = async () => {
    if (!decoded || !isStaff) {
      setCompanies([]);
      return;
    }
    setCompaniesLoading(true);
    const result = await getCompanies(decoded.raw, logActivity);
    setCompaniesLoading(false);
    if (result.ok && result.data) {
      setCompanies(result.data);
    } else {
      setBanner(`GET /companies failed (${result.status})`);
    }
  };

  useEffect(() => {
    setSelectedId(null);
    setCreating(false);
    setOrgFilter("");
    setView("tickets");
    refresh("");
    refreshCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenInput]);

  useEffect(() => {
    refresh(orgFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgFilter]);

  const runAction = async (
    action: () => Promise<{ ok: boolean; status: number }>,
    failureLabel: string,
  ) => {
    const result = await action();
    if (!result.ok) {
      setBanner(`${failureLabel} failed (${result.status})`);
    } else {
      setBanner(null);
    }
    await refresh(orgFilter);
  };

  const handleCreate = (subject: string, body: string) =>
    decoded &&
    runAction(() => createTicket(decoded.raw, subject, body, logActivity), "Filing ticket").then(() => setCreating(false));

  const handleComment = (id: number, text: string) =>
    decoded && runAction(() => addComment(decoded.raw, id, text, logActivity), "Adding comment");

  const handleAssign = (id: number, assignedTo: string) =>
    decoded && runAction(() => assignTicket(decoded.raw, id, assignedTo, logActivity), "Assigning ticket");

  const handleClose = (id: number) =>
    decoded && runAction(() => closeTicket(decoded.raw, id, logActivity), "Closing ticket");

  const handleDelete = (id: number) =>
    decoded &&
    runAction(async () => {
      const result = await deleteTicket(decoded.raw, id, logActivity);
      if (result.ok) {
        setSelectedId((current) => (current === id ? null : current));
      }
      return result;
    }, "Deleting ticket");

  const handleAddCompany = async (id: string, name: string) => {
    if (!decoded) {
      return;
    }
    const result = await createCompany(decoded.raw, id, name, logActivity);
    setBanner(result.ok ? null : `Adding company failed (${result.status})`);
    await refreshCompanies();
  };

  const handleRemoveCompany = async (id: string) => {
    if (!decoded) {
      return;
    }
    const result = await deleteCompany(decoded.raw, id, logActivity);
    setBanner(result.ok ? null : `Removing company failed (${result.status})`);
    if (orgFilter === id) {
      setOrgFilter("");
    }
    await refreshCompanies();
  };

  const selectedTicket = tickets.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Helpdesk Console</h1>
        <p className="hint">A companion UI for AlexCrome.Aspire.Hosting.UserJwts — paste a generated token to interact with the API.</p>
      </header>

      {banner && (
        <div className="banner banner-error dismissible">
          {banner}
          <button onClick={() => setBanner(null)}>&times;</button>
        </div>
      )}

      <TokenPanel tokenInput={tokenInput} decoded={decoded} onTokenChange={setTokenInput} />

      {isStaff && (
        <nav className="view-nav">
          <button className={view === "tickets" ? "nav-active" : ""} onClick={() => setView("tickets")}>
            Tickets
          </button>
          <button className={view === "companies" ? "nav-active" : ""} onClick={() => setView("companies")}>
            Companies
          </button>
        </nav>
      )}

      <div className="app-layout">
        {view === "companies" ? (
          <CompaniesPage
            companies={companies}
            canManage={canManageCompanies}
            onAdd={handleAddCompany}
            onRemove={handleRemoveCompany}
            loading={companiesLoading}
          />
        ) : selectedTicket ? (
          <TicketDetail
            ticket={selectedTicket}
            canWrite={canWrite}
            canAssign={canAssign}
            canClose={canClose}
            canDelete={canDelete}
            onBack={() => setSelectedId(null)}
            onAddComment={handleComment}
            onAssign={handleAssign}
            onClose={handleClose}
            onDelete={handleDelete}
          />
        ) : creating ? (
          <NewTicketForm onCreate={handleCreate} onBack={() => setCreating(false)} />
        ) : (
          <TicketList
            tickets={tickets}
            onSelect={setSelectedId}
            canCreate={canWrite}
            onNewTicket={() => setCreating(true)}
            loading={loading}
            companies={canReadAny ? companies : []}
            orgFilter={orgFilter}
            onOrgFilterChange={setOrgFilter}
          />
        )}
      </div>

      <ActivityLog entries={activity} />
    </div>
  );
}
