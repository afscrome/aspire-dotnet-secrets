import { useState } from "react";
import type { ApiActivity } from "../api";

interface ActivityLogProps {
  entries: ApiActivity[];
}

export function ActivityLog({ entries }: ActivityLogProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="activity-log">
      <button className="activity-log-toggle" onClick={() => setOpen(!open)}>
        {open ? "▾" : "▸"} Activity log ({entries.length})
      </button>
      {open && (
        <ul className="activity-log-entries">
          {entries.length === 0 && <li className="hint">No requests yet.</li>}
          {[...entries].reverse().map((e, i) => (
            <li key={i} className={e.ok ? "activity-ok" : "activity-error"}>
              <span className="activity-method">{e.method}</span>
              <span className="activity-path">{e.path}</span>
              <span className="activity-status">{e.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
