using Microsoft.AspNetCore.Authorization;

namespace HelpdeskApi;

public sealed class HasScopeRequirement(string scope) : IAuthorizationRequirement
{
    public string Scope { get; } = scope;
}

public sealed class HasScopeAuthorizationHandler : AuthorizationHandler<HasScopeRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        HasScopeRequirement requirement)
    {
        var scopes = context.User.FindFirst("scope")?.Value
            .Split(' ', StringSplitOptions.RemoveEmptyEntries) ?? [];

        if (scopes.Contains(requirement.Scope, StringComparer.Ordinal))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
