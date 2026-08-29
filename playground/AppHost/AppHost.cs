using AlexCrome.Aspire.Hosting.UserJwts;

var builder = DistributedApplication.CreateBuilder(args);

var signingKey = builder.AddJwtSigningToken("signing-key")
    .WithIssuer("helpdesk-dev")
    .WithDefaultClaim("aud", "helpdesk-api");

var api = builder.AddProject<Projects.HelpdeskApi>("apiservice")
    .WithHttpHealthCheck("/health")
    .WithJwtToken(
        signingKey,
        commandName: "jwt-customer",
        displayName: "Generate Customer Token",
        description: "Signed JWT for a customer who can view, file, and close tickets for their own org.",
        additionalClaims: new Dictionary<string, JwtClaimDefault>
        {
            ["sub"] = new("alice", UserConfigurable: true, Label: "User ID", Description: "Value used for the sub claim."),
            ["org"] = new("acme", UserConfigurable: true, Label: "Org", Description: "Tenant the customer belongs to."),
            ["role"] = new("customer"),
            ["scope"] = new("tickets:read:own tickets:write:own tickets:close:own"),
        })
    .WithJwtToken(
        signingKey,
        commandName: "jwt-customer-readonly",
        displayName: "Generate Read-Only Customer Token",
        description: "Signed JWT for a customer who can only view tickets for their own org.",
        additionalClaims: new Dictionary<string, JwtClaimDefault>
        {
            ["sub"] = new("dana", UserConfigurable: true, Label: "User ID", Description: "Value used for the sub claim."),
            ["org"] = new("acme", UserConfigurable: true, Label: "Org", Description: "Tenant the customer belongs to."),
            ["role"] = new("customer"),
            ["scope"] = new("tickets:read:own"),
        })
    .WithJwtToken(
        signingKey,
        commandName: "jwt-agent",
        displayName: "Generate Support Agent Token",
        description: "Signed JWT for a support agent with cross-org visibility who can triage and assign tickets.",
        additionalClaims: new Dictionary<string, JwtClaimDefault>
        {
            ["sub"] = new("agent.sam", UserConfigurable: true, Label: "User ID", Description: "Value used for the sub claim."),
            ["org"] = new("internal"),
            ["role"] = new("agent"),
            ["scope"] = new("tickets:read:any tickets:write:any tickets:assign"),
        })
    .WithJwtToken(
        signingKey,
        commandName: "jwt-admin",
        displayName: "Generate Admin Token",
        description: "Signed JWT for an admin with full access, including closing and deleting tickets.",
        additionalClaims: new Dictionary<string, JwtClaimDefault>
        {
            ["sub"] = new("admin.priya", UserConfigurable: true, Label: "User ID", Description: "Value used for the sub claim."),
            ["org"] = new("internal"),
            ["role"] = new("admin"),
            ["scope"] = new("tickets:read:any tickets:write:any tickets:assign tickets:close:any"),
        })
    .WithJwtToken(
        signingKey,
        commandName: "jwt-custom",
        displayName: "Generate Custom Token",
        description: "Fully customizable JWT for experimenting with any combination of sub, org, role and scope.",
        additionalClaims: new Dictionary<string, JwtClaimDefault>
        {
            ["sub"] = new("dev-user", UserConfigurable: true, Label: "User ID", Description: "Value used for the sub claim."),
            ["org"] = new("acme", UserConfigurable: true, Label: "Org", Description: "Value used for the org claim."),
            ["role"] = new("customer", UserConfigurable: true, Label: "Role", Description: "customer, agent, or admin."),
            ["scope"] = new(
                "tickets:read:own",
                UserConfigurable: true,
                Label: "Scope",
                Description: "Space-delimited scopes, e.g. tickets:read:own tickets:write:any tickets:close:any."),
        });

builder.AddViteApp("web", "../HelpdeskWeb")
    .WithReference(api)
    .WithEnvironment("VITE_API_BASE_URL", api.GetEndpoint("http"))
    .WithExternalHttpEndpoints();

builder.Build().Run();
