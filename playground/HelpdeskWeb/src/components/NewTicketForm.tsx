import { useState } from "react";

interface NewTicketFormProps {
  onCreate: (subject: string, body: string) => void;
  onBack: () => void;
}

export function NewTicketForm({ onCreate, onBack }: NewTicketFormProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const submit = () => {
    if (!subject.trim()) {
      return;
    }
    onCreate(subject.trim(), body.trim());
  };

  return (
    <section className="panel new-ticket-panel">
      <button className="back-link" onClick={onBack}>
        &larr; Back to tickets
      </button>

      <h2>New ticket</h2>

      <div className="ticket-form-page">
        <label className="field-label" htmlFor="new-ticket-subject">
          Subject
        </label>
        <input
          id="new-ticket-subject"
          placeholder="Short summary..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        <label className="field-label" htmlFor="new-ticket-body">
          Description
        </label>
        <textarea
          id="new-ticket-body"
          className="body-input"
          placeholder="What's going on? Steps to reproduce, error messages, anything useful..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
        />

        <button className="submit-button" onClick={submit} disabled={!subject.trim()}>
          File ticket
        </button>
      </div>
    </section>
  );
}
