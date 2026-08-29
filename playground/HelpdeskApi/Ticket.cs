namespace HelpdeskApi;

public sealed record Ticket
{
    public required int Id { get; init; }
    public required string Org { get; init; }
    public required string Subject { get; init; }
    public required string Body { get; init; }
    public required string ReportedBy { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public string? AssignedTo { get; set; }
    public bool IsClosed { get; set; }
    public List<TicketComment> Comments { get; init; } = [];
}

public sealed record TicketComment(string Author, string Text, DateTimeOffset CreatedAt);

public sealed record CreateTicketRequest(string Subject, string Body);

public sealed record AddCommentRequest(string Text);

public sealed record AssignTicketRequest(string AssignedTo);
