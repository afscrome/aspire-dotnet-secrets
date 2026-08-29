namespace HelpdeskApi;

public sealed class TicketStore
{
    private readonly List<Ticket> _tickets = [];
    private int _nextId = 1;

    public TicketStore()
    {
        var now = DateTimeOffset.UtcNow;
        Create("acme", "alice", "Printer on the 3rd floor won't connect", "It was fine yesterday. Tried turning it off and on again, no luck.", now.AddDays(-2));
        Create("acme", "bob", "Password reset needed for the billing portal", "Locked myself out after too many attempts.", now.AddHours(-5));
        Create("globex", "carol", "VPN drops every few minutes", "Started after the latest client update. Happens on both wifi and ethernet.", now.AddMinutes(-40));
    }

    public IReadOnlyList<Ticket> GetForOrg(string org) =>
        _tickets.Where(t => string.Equals(t.Org, org, StringComparison.Ordinal)).ToList();

    public IReadOnlyList<Ticket> GetAll(string? org) =>
        (org is null
            ? _tickets
            : _tickets.Where(t => string.Equals(t.Org, org, StringComparison.Ordinal)))
        .ToList();

    public Ticket? Find(int id) => _tickets.FirstOrDefault(t => t.Id == id);

    public Ticket Create(string org, string reportedBy, string subject, string body, DateTimeOffset? createdAt = null)
    {
        var ticket = new Ticket
        {
            Id = _nextId++,
            Org = org,
            Subject = subject,
            Body = body,
            ReportedBy = reportedBy,
            CreatedAt = createdAt ?? DateTimeOffset.UtcNow,
        };
        _tickets.Add(ticket);
        return ticket;
    }

    public Ticket? AddComment(int id, string author, string text)
    {
        var ticket = Find(id);
        ticket?.Comments.Add(new TicketComment(author, text, DateTimeOffset.UtcNow));
        return ticket;
    }

    public Ticket? Assign(int id, string assignedTo)
    {
        var ticket = Find(id);
        if (ticket is not null)
        {
            ticket.AssignedTo = assignedTo;
        }

        return ticket;
    }

    public Ticket? Close(int id)
    {
        var ticket = Find(id);
        if (ticket is not null)
        {
            ticket.IsClosed = true;
        }

        return ticket;
    }

    public bool Delete(int id)
    {
        var ticket = Find(id);
        return ticket is not null && _tickets.Remove(ticket);
    }
}
