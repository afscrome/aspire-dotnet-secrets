import { useState } from "react";
import type { Company } from "../types";

interface CompaniesPageProps {
  companies: Company[];
  canManage: boolean;
  onAdd: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  loading: boolean;
}

export function CompaniesPage({ companies, canManage, onAdd, onRemove, loading }: CompaniesPageProps) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");

  const submit = () => {
    if (!id.trim() || !name.trim()) {
      return;
    }
    onAdd(id.trim(), name.trim());
    setId("");
    setName("");
  };

  return (
    <section className="panel companies-panel">
      <h2>Companies</h2>
      <p className="hint">
        The customer organizations (tenants) this helpdesk serves — matches the <code>org</code> claim on customer tokens.
      </p>

      {loading && <p className="hint">Loading...</p>}
      {!loading && companies.length === 0 && <p className="hint">No companies yet.</p>}

      <ul className="company-list">
        {companies.map((c) => (
          <li className="company-row" key={c.id}>
            <span className="company-name">{c.name}</span>
            <span className="company-id chip">{c.id}</span>
            {canManage && (
              <button className="action-delete company-remove" onClick={() => onRemove(c.id)}>
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {canManage && (
        <div className="ticket-form-page">
          <label className="field-label" htmlFor="new-company-id">
            Company ID
          </label>
          <input
            id="new-company-id"
            placeholder="e.g. initech (used as the org claim)"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />

          <label className="field-label" htmlFor="new-company-name">
            Company name
          </label>
          <input id="new-company-name" placeholder="e.g. Initech" value={name} onChange={(e) => setName(e.target.value)} />

          <button className="submit-button" onClick={submit} disabled={!id.trim() || !name.trim()}>
            Add company
          </button>
        </div>
      )}
    </section>
  );
}
