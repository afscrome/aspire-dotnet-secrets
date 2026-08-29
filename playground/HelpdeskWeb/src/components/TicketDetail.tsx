import { useState } from "react";
import type { Ticket } from "../types";
import { timeAgo } from "../time";

interface TicketDetailProps {
  ticket: Ticket;
  canWrite: boolean;
  canAssign: boolean;
  canClose: boolean;
  canDelete: boolean;
  onBack: () => void;
  onAddComment: (id: number, text: string) => void;
  onAssign: (id: number, assignedTo: string) => void;
  onClose: (id: number) => void;
  onDelete: (id: number) => void;
}

export function TicketDetail({
  ticket,
  canWrite,
  canAssign,
  canClose,
  canDelete,
  onBack,
  onAddComment,
  onAssign,
  onClose,
  onDelete,
}: TicketDetailProps) {
  const [comment, setComment] = useState("");
  const [assignee, setAssignee] = useState("");

  const submitComment = () => {
    if (!comment.trim()) {
      return;
    }
    onAddComment(ticket.id, comment.trim());
    setComment("");
  };

  const submitAssign = () => {
    if (!assignee.trim()) {
      return;
    }
    onAssign(ticket.id, assignee.trim());
    setAssignee("");
  };

  const canCloseNow = canClose && !ticket.isClosed;
  const hasActions = canAssign || canCloseNow || canDelete;

  return (
    <section className="panel ticket-detail-panel">
      <button className="back-link" onClick={onBack}>
        &larr; Back to tickets
      </button>

      <div className="ticket-detail-header">
        <h2>{ticket.subject}</h2>
        <span className={`status-pill ${ticket.isClosed ? "closed" : "open"}`}>{ticket.isClosed ? "Closed" : "Open"}</span>
      </div>
      <p className="hint">
        #{ticket.id} · {ticket.org} · reported by {ticket.reportedBy} · {timeAgo(ticket.createdAt)}
        {ticket.assignedTo && <> · assigned to {ticket.assignedTo}</>}
      </p>

      {ticket.body && <p className="ticket-body">{ticket.body}</p>}

      <div className="comments">
        {ticket.comments.length === 0 && <p className="hint">No comments yet.</p>}
        {ticket.comments.map((c, i) => (
          <div className="comment" key={i}>
            <span className="comment-meta">
              <span className="comment-author">{c.author}</span>
              <span className="comment-time">{timeAgo(c.createdAt)}</span>
            </span>
            <span className="comment-text">{c.text}</span>
          </div>
        ))}
      </div>

      {canWrite && (
        <div className="comment-form">
          <input
            placeholder="Add a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitComment()}
          />
          <button onClick={submitComment} disabled={!comment.trim()}>
            Comment
          </button>
        </div>
      )}

      {hasActions && (
        <div className="ticket-actions">
          {canAssign && (
            <div className="assign-form">
              <input placeholder="Assign to..." value={assignee} onChange={(e) => setAssignee(e.target.value)} />
              <button onClick={submitAssign} disabled={!assignee.trim()}>
                Assign
              </button>
            </div>
          )}

          {(canCloseNow || canDelete) && (
            <div className="action-row">
              {canCloseNow && (
                <button className="action-close" onClick={() => onClose(ticket.id)}>
                  Close ticket
                </button>
              )}

              {canDelete && (
                <button className="action-delete" onClick={() => onDelete(ticket.id)}>
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
