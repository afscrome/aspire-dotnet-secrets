import { useState } from "react";
import type { Company, Ticket } from "../types";
import { timeAgo } from "../time";

type StatusFilter = "open" | "closed" | "all";

interface TicketListProps {
  tickets: Ticket[];
  onSelect: (id: number) => void;
  canCreate: boolean;
  onNewTicket: () => void;
  loading: boolean;
  companies: Company[];
  orgFilter: string;
  onOrgFilterChange: (org: string) => void;
}

export function TicketList({
  tickets,
  onSelect,
  canCreate,
  onNewTicket,
  loading,
  companies,
  orgFilter,
  onOrgFilterChange,
}: TicketListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");

  const openCount = tickets.filter((t) => !t.isClosed).length;
  const closedCount = tickets.length - openCount;
  const visibleTickets = tickets.filter((t) => {
    if (statusFilter === "open") return !t.isClosed;
    if (statusFilter === "closed") return t.isClosed;
    return true;
  });

  return (
    <section className="panel ticket-list-panel">
      <div className="ticket-list-header">
        <h2>Tickets</h2>
        {canCreate && <button onClick={onNewTicket}>New ticket</button>}
      </div>

      <div className="ticket-list-filters">
        {companies.length > 0 && (
          <select
            className="org-filter"
            value={orgFilter}
            onChange={(e) => onOrgFilterChange(e.target.value)}
            aria-label="Filter by company"
          >
            <option value="">All companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        <select
          className="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="Filter by status"
        >
          <option value="open">Open{openCount > 0 ? ` (${openCount})` : ""}</option>
          <option value="closed">Closed{closedCount > 0 ? ` (${closedCount})` : ""}</option>
          <option value="all">All{tickets.length > 0 ? ` (${tickets.length})` : ""}</option>
        </select>
      </div>

      {loading && <p className="hint">Loading...</p>}

      {!loading && visibleTickets.length === 0 && (
        <p className="hint">
          {tickets.length === 0
            ? "No tickets visible for this token."
            : statusFilter === "open"
              ? "No open tickets."
              : statusFilter === "closed"
                ? "No closed tickets."
                : "No tickets."}
        </p>
      )}

      <ul className="ticket-list">
        {visibleTickets.map((t) => (
          <li key={t.id}>
            <button className="ticket-row" onClick={() => onSelect(t.id)}>
              <span className={`status-dot ${t.isClosed ? "closed" : "open"}`} />
              <span className="ticket-subject">{t.subject}</span>
              <span className="ticket-time">{timeAgo(t.createdAt)}</span>
              <span className="ticket-org">{t.org}</span>
              {t.assignedTo && <span className="chip chip-small">{t.assignedTo}</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
