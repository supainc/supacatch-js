---
name: ddd
description: >-
  Enforce layered domain-driven architecture with Effect Schema: branded models
  and aggregates in domain, Commands/Queries in application, one repository per
  aggregate root, thin app adapters. Use when adding or changing domain types,
  aggregates, use cases, repositories, ReadModels, or HTTP/server wiring for
  those layers.
license: MIT
metadata:
  author: dkjym
---

# DDD

Layered domain architecture for Effect TypeScript. Copy a nearby feature before you invent a new shape. If the project has a glossary, use its words and drop the synonyms it bans.

Follow the project's Effect and Schema conventions when they exist.

## Layers and dependency direction

```
apps ───────────────→ integrations
  │
  └→ application ───→ integrations
         │
         ├─ query ──────────────────→ database
         │
         └─ command → domain ←── repository → database
```

- **Domain.** No I/O. No SQL, HTTP, auth providers, queues, or encryption.
- **Database.** Schema/ORM only. Does not import domain.
- **Integrations.** One external capability per package. Storage, queues, email, third-party APIs. They speak that system's language. Plain inputs, their own error types.
- Integration packages are dependency leaves. They must not import application, domain, repository, database, or apps.
- Application translates domain types to integration inputs at the call site, the way repository maps domain to rows. Domain codecs and adapters live in application, or in an app when deployment-specific. Multiple apps sharing the same translation still keep it in application.
- **Repository.** Maps domain to rows with `Schema.encode` / `Schema.decode`. Does not import application. Write path only.
- **Commands.** Live in application. Depend on domain and repository. Never import database.
- **Queries.** Live in application. Depend on database and ReadModels. Never import domain models or repositories.
- **Apps.** Wire Layers. Decode and encode at the HTTP boundary. Call application functions. Do not reimplement domain behavior.

Deep-import concrete modules. No package barrels.

## Domain

Folder per area, file per concept, kebab-case. Colocate tests. No `index.ts`.

### Types

- IDs and scalars: `Schema.*.pipe(Schema.brand("Name"))` plus `export type Name = typeof Name.Type`.
- Use the project's standard ID type for new entities. Shared IDs and timestamps go in one shared domain module, not copied per feature.
- Models are `Schema.Class`. Return a new instance with `Class.make({ ... })`. Do not assign fields on `this`.
- Secrets use `Schema.RedactedFromValue` plus a brand. Ordinary queries never return plaintext.
- Domain failures are `Schema.TaggedErrorClass`.

### Behavior

- Put invariants in Schema checks and class methods.
- Keep Schema class ids in their existing form, such as `"domain/Order"` or
  `"application/PlaceOrderCommand"`.

No SQL or HTTP inside a domain class method.

## Aggregates

One aggregate root, one repository. Persist the root through that repository. Owned children get no write repository.

Draw the boundary around what must commit in the same transaction.

If write A succeeds and write B fails, is the domain wrong, or only briefly behind? Same aggregate when both must stay true after every save. Separate aggregates when lag, retry, or later reconciliation is fine. Wire that case in application with sequential saves or a dispatcher. Do not grow one root until it swallows both.

Fat aggregates are a trap. They serialize unrelated writes, widen contention, and blur boundaries. Keep the smallest root that still guards invariants needing strong consistency.

Reference other aggregates by id. Do not nest a foreign root as an owned child.

## Application

Folders are defined by what the file may touch, not by who invoked it.

1. State-changing use case (repository load/save and/or outbound integration) → `{area}/{concept}/command/kebab.ts`, class `FooCommand` when there is a payload.
2. Read use case (Database → `*ReadModel`) → `{area}/{concept}/query/kebab.ts`, class `FooQuery`.
3. Neither (port, Live layer, error, shared shape, constant) → sit beside the concept. No `@local/repository` and no `@local/database`.
4. Commands may call commands. `command/` and `query/` never import each other. Apps compose a query result into a command.

Only an entry-point that needs a signed-in user calls `requirePermission` (it demands `CurrentMember`). Shared queue/workflow steps must not, or ingest cannot provide that context.

Path: `{area}/{concept}/command|query/kebab-name.ts`, or match nearby features. Flatten only when that area already does.

### Command

Load and save via the aggregate repository or an existing port. Call domain methods or `Domain.make`. Do not patch rows or skip the aggregate.

1. `export class FooCommand extends Schema.Class<FooCommand>("application/FooCommand")({ ... })`
2. `export const placeOrder = Effect.fn(function* (command) { ... })`
3. Load via Repository, domain behavior, then `save`
4. Fail with `Schema.TaggedErrorClass`

### Query

Lists need joins, masks, and shapes the write model does not have. A matching domain type is not enough. Decode a `*ReadModel` from a direct database query.

- Same `Effect.fn` shape under `query/`.
- Query the database, then `Schema.decodeEffect(ReadModel)(row)`.
- Select only the columns the ReadModel needs.
- List and get must not leak secrets or full API keys. Return those only on create or rotate.

## Repository

- One repository per aggregate root. No shared god repository. No write repository for owned children.
- `Context.Service` plus `static Live = Layer.effect(...)`.
- Load and save with `Schema.decodeEffect` / `Schema.encodeEffect` of the aggregate.
- Owned children change only through the root's domain methods, then the root repository's save, in one transaction.
- Add optimistic concurrency (`version`) only where neighbors already use it.

## Apps

HTTP and server handlers:

1. Validate with domain brands
2. Build a Command or Query
3. Run under the app runtime with request context
4. Encode the ReadModel or result for the wire

Do not update tables from a handler.

## Checklist

- [ ] Product terms match the project glossary when one exists
- [ ] New behavior sits in the right layer
- [ ] Domain has no I/O
- [ ] Integration packages do not import internal packages
- [ ] Aggregate boundary matches the transaction
- [ ] One aggregate root, one repository. Owned children have no write repo
- [ ] Commands use domain and repository, not database
- [ ] Queries use database and ReadModels, not domain or repositories
- [ ] Commands may call commands. Commands and queries never import each other. Apps compose a query into a command
- [ ] Only signed-in entry points call `requirePermission`
- [ ] Secrets and rotatable keys stay off ordinary reads
- [ ] Paths match the project's area/concept layout
- [ ] Schema class ids keep the `domain/Order` and `application/PlaceOrderCommand` form

## Anti-patterns

- Domain importing application, repository, or database
- Database importing domain brands onto columns
- An integration package importing any internal package
- A domain codec or adapter in an integration package because multiple apps use it
- One repository serving multiple aggregate roots
- A write repository for a child that should only persist with its root
- A catch-all aggregate that pulls in anything "related"
- Eventual-consistency work in one transaction, or strong invariants split across aggregates
- Commands importing or writing to database directly
- Queries routed through repositories or aggregates
- A command that imports a query, or a query that imports a command
- A loose application file that imports a command, a query, a repository, or Database
- ORM rows or domain aggregates with secrets on list or get queries
