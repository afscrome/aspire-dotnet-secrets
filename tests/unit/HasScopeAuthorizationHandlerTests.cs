using System.Security.Claims;
using HelpdeskApi;
using Microsoft.AspNetCore.Authorization;

namespace AlexCrome.Aspire.Hosting.UserJwts.UnitTests;

public class HasScopeAuthorizationHandlerTests
{
    [Test]
    public async Task HandleRequirementAsync_Succeeds_WhenScopeIsPresent()
    {
        var requirement = new HasScopeRequirement("tickets:close");
        var context = CreateContext(requirement, scope: "tickets:read tickets:close");

        var handler = new HasScopeAuthorizationHandler();

        await handler.HandleAsync(context);

        await Assert.That(context.HasSucceeded).IsTrue();
    }

    [Test]
    public async Task HandleRequirementAsync_DoesNotSucceed_WhenScopeIsMissingFromClaim()
    {
        var requirement = new HasScopeRequirement("tickets:close");
        var context = CreateContext(requirement, scope: "tickets:read tickets:write");

        var handler = new HasScopeAuthorizationHandler();

        await handler.HandleAsync(context);

        await Assert.That(context.HasSucceeded).IsFalse();
    }

    [Test]
    public async Task HandleRequirementAsync_DoesNotSucceed_WhenScopeClaimIsMissing()
    {
        var requirement = new HasScopeRequirement("tickets:read");
        var context = CreateContext(requirement, scope: null);

        var handler = new HasScopeAuthorizationHandler();

        await handler.HandleAsync(context);

        await Assert.That(context.HasSucceeded).IsFalse();
    }

    private static AuthorizationHandlerContext CreateContext(HasScopeRequirement requirement, string? scope)
    {
        var claims = new List<Claim>();

        if (scope is not null)
        {
            claims.Add(new Claim("scope", scope));
        }

        var identity = new ClaimsIdentity(claims, authenticationType: "TestAuth");
        var user = new ClaimsPrincipal(identity);

        return new AuthorizationHandlerContext([requirement], user, resource: null);
    }
}
