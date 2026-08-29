using System.Security.Claims;
using HelpdeskApi;
using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi;
using OpenTelemetry;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddOpenTelemetry(logging =>
{
    logging.IncludeFormattedMessage = true;
    logging.IncludeScopes = true;
});

builder.Services.AddOpenTelemetry()
    .UseOtlpExporter()
    .WithMetrics(metrics =>
    {
        metrics.AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddRuntimeInstrumentation();
    })
    .WithTracing(tracing =>
    {
        tracing.AddSource(builder.Environment.ApplicationName)
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation();
    });

// Add services to the container.
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, _, _) =>
    {
        var components = document.Components ??= new OpenApiComponents();
        var securitySchemes = components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>(StringComparer.Ordinal);

        securitySchemes["bearer"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "JWT Bearer token for API authentication."
        };

        return Task.CompletedTask;
    });

    options.AddOperationTransformer((operation, context, _) =>
    {
        var metadata = context.Description.ActionDescriptor.EndpointMetadata;
        var allowsAnonymous = metadata.OfType<IAllowAnonymous>().Any();
        var requiresAuthorization = metadata.OfType<IAuthorizeData>().Any();

        if (requiresAuthorization && !allowsAnonymous)
        {
            operation.Security ??= [];
            operation.Security.Add(new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference("bearer", null, null)] = []
            });
        }

        return Task.CompletedTask;
    });
});

builder.Services.AddAuthentication()
    .AddJwtBearer(options =>
    {
        // Keep claim types as minted (e.g. "sub", "role") instead of JwtBearer's
        // legacy remapping to long ClaimTypes.* URIs.
        options.MapInboundClaims = false;
        options.TokenValidationParameters.RoleClaimType = "role";
    });

builder.Services.AddSingleton<IAuthorizationHandler, HasScopeAuthorizationHandler>();
builder.Services.AddSingleton<TicketStore>();
builder.Services.AddSingleton<CompanyStore>();

const string WebCorsPolicy = "web";
builder.Services.AddCors(options =>
{
    // Any origin is fine here: this API is authenticated with a Bearer token (not
    // cookies), so a permissive CORS policy carries none of the CSRF risk it would
    // for cookie-based auth. This also sidesteps Aspire's local dev proxy exposing
    // the same resource under multiple hostnames (e.g. "web-<apphost>.dev.localhost"
    // vs. the raw "localhost:<port>"), which a fixed origin allowlist can't track.
    options.AddPolicy(WebCorsPolicy, policy => policy
        .AllowAnyOrigin()
        .AllowAnyHeader()
        .AllowAnyMethod());
});

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("TicketsAssign", policy => policy
        .RequireAuthenticatedUser()
        .RequireRole("agent", "admin")
        .AddRequirements(new HasScopeRequirement("tickets:assign")))
    .AddPolicy("Admin", policy => policy
        .RequireAuthenticatedUser()
        .RequireRole("admin"))
    .AddPolicy("StaffOnly", policy => policy
        .RequireAuthenticatedUser()
        .RequireRole("agent", "admin"));

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseCors(WebCorsPolicy);
app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/health");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.MapGet("/", () => Results.Redirect("/scalar/v1"))
    .ExcludeFromDescription();

static string[] GetScopes(ClaimsPrincipal user) =>
    user.FindFirst("scope")?.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries) ?? [];

app.MapGet("/whoami", (ClaimsPrincipal user) =>
{
    return Results.Ok(new
    {
        Sub = user.FindFirst("sub")?.Value,
        Org = user.FindFirst("org")?.Value,
        Role = user.FindFirst("role")?.Value,
        Scopes = GetScopes(user),
    });
}).RequireAuthorization();

app.MapGet("/tickets", (ClaimsPrincipal user, TicketStore store, string? org) =>
{
    var role = user.FindFirst("role")?.Value;
    var callerOrg = user.FindFirst("org")?.Value ?? string.Empty;
    var scopes = GetScopes(user);

    // tickets:read:any is deliberately distinct from tickets:read:own - it's a wider,
    // cross-org grant, not just a bigger version of the same permission, so it also
    // requires a staff role rather than being unlockable by scope alone.
    var canReadAny = scopes.Contains("tickets:read:any") && role is "agent" or "admin";
    var canReadOwn = scopes.Contains("tickets:read:own");

    if (!canReadAny && !canReadOwn)
    {
        return Results.Forbid();
    }

    var tickets = canReadAny ? store.GetAll(org) : store.GetForOrg(callerOrg);
    return Results.Ok(tickets);
}).RequireAuthorization();

app.MapPost("/tickets", (ClaimsPrincipal user, TicketStore store, CreateTicketRequest request) =>
{
    var scopes = GetScopes(user);
    if (!scopes.Contains("tickets:write:own") && !scopes.Contains("tickets:write:any"))
    {
        return Results.Forbid();
    }

    // A ticket is always filed under the caller's own org - there's no "any" version of
    // ticket creation, only of who can later comment on it.
    var org = user.FindFirst("org")?.Value ?? string.Empty;
    var sub = user.FindFirst("sub")?.Value ?? "unknown";

    var ticket = store.Create(org, sub, request.Subject, request.Body);
    return Results.Created($"/tickets/{ticket.Id}", ticket);
}).RequireAuthorization();

app.MapPost("/tickets/{id:int}/comments", (int id, ClaimsPrincipal user, TicketStore store, AddCommentRequest request) =>
{
    var ticket = store.Find(id);
    if (ticket is null)
    {
        return Results.NotFound();
    }

    var role = user.FindFirst("role")?.Value;
    var callerOrg = user.FindFirst("org")?.Value;
    var scopes = GetScopes(user);

    var canWriteAny = scopes.Contains("tickets:write:any") && role is "agent" or "admin";
    var canWriteOwn = scopes.Contains("tickets:write:own") && string.Equals(ticket.Org, callerOrg, StringComparison.Ordinal);

    if (!canWriteAny && !canWriteOwn)
    {
        return Results.Forbid();
    }

    var sub = user.FindFirst("sub")?.Value ?? "unknown";
    store.AddComment(id, sub, request.Text);
    return Results.Ok(ticket);
}).RequireAuthorization();

app.MapPost("/tickets/{id:int}/assign", (int id, TicketStore store, AssignTicketRequest request) =>
{
    var ticket = store.Assign(id, request.AssignedTo);
    return ticket is null ? Results.NotFound() : Results.Ok(ticket);
}).RequireAuthorization("TicketsAssign");

app.MapPost("/tickets/{id:int}/close", (int id, ClaimsPrincipal user, TicketStore store) =>
{
    var ticket = store.Find(id);
    if (ticket is null)
    {
        return Results.NotFound();
    }

    var role = user.FindFirst("role")?.Value;
    var callerOrg = user.FindFirst("org")?.Value;
    var scopes = GetScopes(user);

    // Admins can close anything, but need tickets:close:any - the scope is actually
    // enforced here, not just implied by role. Customers can close any ticket from
    // their own company (not just ones they filed) with tickets:close:own. Agents can
    // never close tickets, even if somehow granted one of these scopes - only
    // customers or admins can resolve a ticket.
    var canClose = role switch
    {
        "admin" => scopes.Contains("tickets:close:any"),
        "customer" => scopes.Contains("tickets:close:own") && string.Equals(ticket.Org, callerOrg, StringComparison.Ordinal),
        _ => false,
    };

    if (!canClose)
    {
        return Results.Forbid();
    }

    store.Close(id);
    return Results.Ok(ticket);
}).RequireAuthorization();

app.MapDelete("/tickets/{id:int}", (int id, TicketStore store) =>
{
    return store.Delete(id) ? Results.NoContent() : Results.NotFound();
}).RequireAuthorization("Admin");

app.MapGet("/companies", (CompanyStore store) => Results.Ok(store.GetAll()))
    .RequireAuthorization("StaffOnly");

app.MapPost("/companies", (CompanyStore store, CreateCompanyRequest request) =>
{
    var company = store.Add(request.Id, request.Name);
    return company is null
        ? Results.Conflict($"A company with id '{request.Id}' already exists.")
        : Results.Created($"/companies/{company.Id}", company);
}).RequireAuthorization("Admin");

app.MapDelete("/companies/{id}", (string id, CompanyStore store) =>
{
    return store.Remove(id) ? Results.NoContent() : Results.NotFound();
}).RequireAuthorization("Admin");

app.Run();
