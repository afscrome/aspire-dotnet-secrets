export interface Ticket {
  id: number;
  org: string;
  subject: string;
  body: string;
  reportedBy: string;
  createdAt: string;
  assignedTo: string | null;
  isClosed: boolean;
  comments: TicketComment[];
}

export interface TicketComment {
  author: string;
  text: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
}

export interface DecodedToken {
  sub?: string;
  org?: string;
  role?: string;
  scope?: string;
  exp?: number;
  raw: string;
}
