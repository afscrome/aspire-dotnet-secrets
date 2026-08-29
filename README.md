# AlexCrome.Aspire.Hosting.UserJwts

`AlexCrome.Aspire.Hosting.UserJwts` is a small Aspire hosting integration that gives you a `dotnet user-jwts`-style developer experience for distributed apps.  Initial version was built on [AspiriFriday](https://www.youtube.com/watch?v=RGBK63vn3Rc) stream.

> [!WARNING]
> This package is under active development. The API may change without notice.

![Demo of generating a token in the Aspire dashboard](docs/demo.gif)

```cs
var signingKey = builder.AddJwtSigningToken("signing-key")
    .WithIssuer("helpdesk-dev")
    .WithDefaultClaim("aud", "helpdesk-api");

resource.WithJwtToken(
    signingKey,
    commandName: "jwt-customer",
    displayName: "Generate Customer Token",
    description: "Generate a signed customer JWT for testing tenant-scoped access.",
    additionalClaims: new Dictionary<string, JwtClaimDefault>
    {
        ["sub"] = new("alice", UserConfigurable: true, Label: "User ID", Description: "Value used for the sub claim."),
        ["org"] = new("acme", UserConfigurable: true, Label: "Org", Description: "Tenant the caller belongs to."),
        ["role"] = new("customer"),
        ["scope"] = new("tickets:read:own tickets:write:own"),
    });
```

Getting tokens via aspire resource commands
```bash
aspire resource apiservice jwt-customer
aspire resource apiservice jwt-customer --sub bob --org globex
aspire resource apiservice jwt-customer --help
```

The [playground sample](playground/HelpdeskApi) is a small multi-tenant helpdesk/ticketing API that shows this off end-to-end: customer tokens are scoped to their own org's tickets, agent/admin tokens see across orgs, and individual actions (filing, assigning, closing, deleting a ticket) are gated by a mix of `scope` and `role` claims. A companion [Helpdesk Console](playground/HelpdeskWeb) frontend (the `web` resource) lets you paste a generated token and drive the API interactively instead of curling it.

## Why This Exists

`dotnet user-jwts` is great for local API auth workflows, but in distributed Aspire apps you often want token generation to be:

- visible from the dashboard,
- attached to a specific resource,
- preconfigured with claim templates,
- easy for teammates to use without remembering exact claims, or CLI syntax.

This package provides that workflow.

## `dotnet user-jwts` Similarities

- Creates signed JWT bearer tokens for local development.
- Supports predictable default claims and issuer values.
- Supports token lifetime and standard temporal claims (`nbf`, `iat`, `exp`).
- Lets you customize claim values for specific scenarios.

## Key Differences

- `dotnet user-jwts`: CLI-first (`dotnet user-jwts create ...`).
- `AlexCrome.Aspire.Hosting.UserJwts`: dashboard-first (resource command in AppHost).

- `dotnet user-jwts`: typically configured per API project.
- `AlexCrome.Aspire.Hosting.UserJwts`: configured once in AppHost and shared across resources.

- `dotnet user-jwts`: you pass arguments each time.
- `AlexCrome.Aspire.Hosting.UserJwts`: you define reusable command templates with optional interactive prompts.

## Install

Add the package to your AppHost project:

```bash
dotnet add package AlexCrome.Aspire.Hosting.UserJwts
```

## Quick Start

### 1. Add a signing token resource

In your AppHost, register a signing key resource:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var signingKey = builder.AddJwtSigningToken("signing-key");
```

By default, the signing key is generated as a secret parameter and persisted for local reuse.
You can also customize the signing token resource itself:

```csharp
var signingKey = builder.AddJwtSigningToken("signing-key")
    .WithIssuer("my-issuer")
    .WithDefaultLifetime(TimeSpan.FromMinutes(30))
    .WithDefaultClaim("aud", "my-api");
```

### 2. Attach JWT commands to a resource

Add one or more JWT generation commands to a project (or executable) resource:

```csharp
builder.AddProject<Projects.MyApi>("api")
    .WithJwtToken(
        signingKey,
        commandName: "jwt-user",
        displayName: "Generate User Token",
        description: "Generate a signed user JWT for local API testing.",
        additionalClaims: new Dictionary<string, JwtClaimDefault>
        {
            ["aud"] = new("my-api"),
            ["sub"] = new("dev-user", UserConfigurable: true, Label: "User ID"),
            ["role"] = new("admin", UserConfigurable: true, Label: "Role")
        });
```

Run AppHost, open the Aspire dashboard, then execute the resource command. The command returns a bearer token you can paste into Swagger, Scalar, Postman, curl, or your HTTP files.

## Build and Test

```bash
dotnet build
dotnet test
```

## Current Status

The package is designed for local development and testing workflows in Aspire environments, mirroring the ergonomics of `dotnet user-jwts` while integrating directly into AppHost and dashboard resource commands.
