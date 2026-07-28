# API Design — How the Privacy Invariant Is Enforced

> **The invariant (CLAUDE.md §1):** User A must not be able to view, edit, or
> even acknowledge the existence of User B's data, under any circumstances.

This document explains *where* that guarantee lives, *why* it is placed there,
and *how to prove* it still holds. It is written to be checked against the
code, so every claim cites a file and line.

---

## 1. The one-sentence version

> Identity is derived exclusively from a cryptographically verified JWT, and
> **every single Prisma query that touches a `Collection` or a `Bookmark`
> carries that identity in its `where` clause** — with a compound foreign key
> in the schema as a backstop for anything the application layer might miss.

---

## 2. Three independent layers

The invariant is not defended in one place. Each layer below would have to fail
*simultaneously* for cross-user access to occur.

| # | Layer | Enforces | If it alone failed |
|---|-------|----------|--------------------|
| 1 | **Token verification** — `src/auth/auth.guard.ts` | The caller is who they claim | An attacker could pick any `sub`; layers 2–3 would then faithfully scope to the *wrong* user |
| 2 | **Query scoping** — `*.service.ts` | Rows are filtered by `ownerId` | Layer 3 still blocks cross-owner *linking*, but reads would leak |
| 3 | **Schema constraint** — `prisma/schema.prisma` | A bookmark can never point at another owner's collection | Layer 2 still rejects it at the API |

### Layer 1 — where identity comes from

`ownerId` is **never** read from a request body, query string, or URL param.
It is the `sub` claim of a token that has passed all of the following
(`auth.guard.ts:89-115`):

| Check | Why it is load-bearing |
|-------|------------------------|
| Signature against the tenant JWKS, keyed by the token's `kid` | Rejects forged tokens |
| `algorithms: ['RS256']` pin (`auth.guard.ts:28`) | Defeats algorithm confusion (`alg: none`, HS256-with-public-key) |
| `issuer` assertion | A correctly-signed token from *another Auth0 tenant* would otherwise pass |
| `audience` assertion | A token minted for a *different API in our own tenant* would otherwise pass |
| `exp` (library default) | Expired sessions cannot be replayed |
| Non-empty `sub` (`auth.guard.ts:52-54`) | Downstream code treats `.sub` as the ownerId; a malformed token must fail closed, not scope to `undefined` |

The verified identity is attached to the request (`auth.guard.ts:62-65`) and
reaches handlers only through `@CurrentUser()`
(`src/auth/current-user.decorator.ts`). **The DTOs contain no `ownerId` field
at all** (`collections/dto/collection.dto.ts`, `bookmarks/dto/bookmark.dto.ts`),
and the global `ValidationPipe` runs with `whitelist: true,
forbidNonWhitelisted: true` (`src/main.ts:38-40`), so a client that *tries* to
send `ownerId` gets a 400 rather than having it silently stripped or honoured.

There is deliberately **no dev-bypass branch** in the guard (`auth.module.ts`
documents this): an env-var-toggled "accept anything" mode is one bad deploy
away from being the entire security model. Tests instead swap the *key source*
(`SigningKeyProvider`) and exercise the real verification path.

### Layer 2 — the Prisma query layer (this is the core of the design)

Every read and write is expressed as a query that **cannot** return another
user's row, because `ownerId` is part of the filter — not part of a post-fetch
`if` statement. There is no "fetch then check" anywhere in the data path.

#### Collections — `src/collections/collections.service.ts`

| Operation | Query | Line |
|-----------|-------|------|
| List | `collection.findMany({ where: { ownerId: userId } })` | `23` |
| Read one | `collection.findFirst({ where: { id, ownerId: userId } })` | `34-35` |
| Create | `collection.create({ data: { ownerId: userId, … } })` — id from token | `48-52` |
| Update | `findFirst({ where: { id, ownerId } })` → `update({ where: { id, ownerId } })` | `63-73` |
| Delete | `findFirst({ where: { id, ownerId } })` → `delete({ where: { id, ownerId } })` | `85-94` |

#### Bookmarks — `src/bookmarks/bookmarks.service.ts`

| Operation | Query | Line |
|-----------|-------|------|
| List | `bookmark.findMany({ where: { ownerId: userId } })` | `25-26` |
| Read one | `bookmark.findFirst({ where: { id, ownerId: userId } })` | `33-34` |
| Create | `bookmark.create({ data: { ownerId: userId, … } })` | `54` |
| Update | `findOneForUser(id, userId)` → `update({ where: { id, ownerId } })` | `80, 111-112` |
| Delete | `findOneForUser(id, userId)` → `delete({ where: { id, ownerId } })` | `122, 126-127` |

Two properties are worth calling out explicitly:

**(a) `where: { id, ownerId }` on mutations, not just the pre-check.**
The ownership `findFirst` before an update/delete produces the correct *status
code*; the `ownerId` in the mutation's own `where` clause is what produces the
correct *outcome*. Keeping both means a TOCTOU race between the check and the
write still cannot mutate another user's row — the write itself matches zero
rows.

**(b) List endpoints filter, they do not paginate-then-filter.**
`findMany` is scoped at the database, so there is no window in which another
user's rows exist in application memory.

#### The one query that is not owner-scoped, and why that is correct

`bookmarks.service.ts:143-145` — `verifyCollectionOwnership`:

```ts
const collection = await this.prisma.collection.findFirst({
  where: { id: collectionId },
  select: { ownerId: true },          // ← nothing but the owner id is read
});
if (!collection || collection.ownerId !== userId) {
  throw new BadRequestException('Cannot link bookmark to this collection');
}
```

This looks up a collection by id alone. It is safe because it `select`s
**only** `ownerId` — no name, no description, nothing that belongs to the other
user is ever loaded — and the very next statement rejects any mismatch. The
identical error is thrown for *"does not exist"* and *"is not yours"*, so the
endpoint is not an existence oracle.

*Hardening opportunity (not a vulnerability):* this could be written as
`findFirst({ where: { id: collectionId, ownerId: userId } })`, which would make
it structurally impossible to read another owner's row at all, rather than
relying on the `select` being narrow. Behaviour and status codes would be
unchanged. Covered today by two tests (`security.e2e-spec.ts:728, 743`).

### Layer 3 — the schema backstop

`prisma/schema.prisma` gives `Collection` a redundant `@@unique([id, ownerId])`
whose *only* purpose is to be the target of a **compound foreign key** on
`Bookmark`:

```prisma
collectionId String?
collection   Collection? @relation(fields: [collectionId, ownerId],
                                   references: [id, ownerId])
```

The bookmark's *own* `ownerId` participates in the foreign key. So the database
itself will reject any row where `bookmark.ownerId != collection.ownerId` —
even if a future refactor forgets the service-layer check entirely. Prisma
error codes `P2014`/`P2003` are translated back into a generic 400
(`bookmarks.service.ts:154-159`) so the DB-level rejection is
indistinguishable from the API-level one.

---

## 3. Endpoint contract

All routes below are guarded by `AuthGuard` at the controller level
(`collections.controller.ts:26`, `bookmarks.controller.ts:25`), so the guard
cannot be forgotten on a newly added route within those controllers.

| Method | Path | Ownership rule | Success | Denied |
|--------|------|----------------|---------|--------|
| GET | `/collections` | scoped list | 200 (only own) | — |
| GET | `/collections/:id` | must own | 200 | **404** |
| POST | `/collections` | owner = token `sub` | 201 | 400 (invalid DTO) |
| PUT | `/collections/:id` | must own | 200 | **404** |
| DELETE | `/collections/:id` | must own | 204 | **404** |
| GET | `/bookmarks` | scoped list | 200 (only own) | — |
| GET | `/bookmarks/:id` | must own | 200 | **404** |
| POST | `/bookmarks` | owner = token `sub`; target collection must be owned | 201 | **400** on cross-owner link |
| PUT | `/bookmarks/:id` | must own; target collection must be owned | 200 | **404** / **400** |
| DELETE | `/bookmarks/:id` | must own | 204 | **404** |

Missing/invalid/expired token on any of the above → **401**.

`GET /` (`src/app.controller.ts`) is the only unguarded route. It returns a
static string and touches no database.

### Why 404 and not 403

403 means *"this exists and you may not have it"* — that is an acknowledgement.
The invariant forbids acknowledging existence, so a record that is not yours is
reported exactly as a record that does not exist: same status, same message
(`collections.service.ts:37-40`). The same reasoning governs auth failures: an
unknown `kid` and a bad signature return byte-identical responses
(`auth.guard.ts:99-102`), asserted by a dedicated test
(`security.e2e-spec.ts:286`).

For bookmark→collection linking the answer is **400, not 404**, and it is
deliberately the same 400 whether the collection belongs to someone else or
does not exist at all (`security.e2e-spec.ts:753`) — otherwise the endpoint
becomes a collection-id enumeration oracle.

---

## 4. Just-in-time user provisioning

`Collection.ownerId` and `Bookmark.ownerId` are real foreign keys onto
`User.id`, so a first-time Auth0 user's first write would fail on a FK
constraint. `UserProvisioningService.ensureProvisioned`
(`src/auth/user-provisioning.service.ts:31`) materialises the row inside the
guard, **after** token verification and before any handler runs.

The identity written comes exclusively from verified claims; nothing from the
request body reaches it, so a caller cannot provision or overwrite an arbitrary
user. The upsert's `update` branch is intentionally empty (`:48`) — Auth0
remains the source of truth for profile data; this row exists only to anchor
the ownership foreign keys.

---

## 5. Proving it — do not take this document's word for it

```bash
./.agent/verify-privacy.sh          # adversarial tests only
./.agent/verify-privacy.sh --full   # entire security suite
```

The script boots the **real** `AppModule` against a throwaway SQLite database,
mints genuine RS256 tokens for three users, and has User A attempt to read,
update, delete and cross-link User B's records over HTTP. It exits non-zero if
any attempt succeeds — **and also if fewer than `MIN_ADVERSARIAL` (13)
adversarial tests actually executed**, so a green run cannot be manufactured by
deleting or renaming the tests that do the proving.

Current state: **13/13 adversarial attempts rejected, 44/44 assertions passing.**

| Attack simulated | Expected |
|------------------|----------|
| A reads B's collection / bookmark by id | 404 |
| A updates / deletes B's collection / bookmark | 404, B's row still intact |
| A lists collections / bookmarks | only A's rows returned |
| A files a bookmark into B's collection (POST and PUT) | 400 |
| A references a collection id that does not exist | 400, identical to the above |
| Third party C reads A's or B's data | 404 |
| Forged key, wrong tenant, wrong audience, `alg: none`, HS256 confusion, expired, unknown `kid`, missing `sub` | 401, indistinguishable messages |

---

## 6. Known gaps

Recorded honestly rather than omitted. Neither is a breach of the privacy
invariant; both are correctness issues in owner-scoped operations.

1. **`DELETE /collections/:id` returns 500 when the collection still contains
   bookmarks.** The compound FK has no `onDelete` action (Prisma cannot use
   `SetNull` because `Collection.ownerId` is required), so the delete violates
   a foreign key — verified experimentally: Prisma raises `P2003`. The service
   docstring (`collections.service.ts:82`) claims a cascade that the schema
   does not provide, and the frontend confirmation dialog promises the
   bookmarks will be deleted. The schema comment prescribes un-filing instead.
   **The intended behaviour is a product decision and has not been made yet.**
   Existing coverage misses this because the delete test uses an empty
   collection (`security.e2e-spec.ts:439`).

2. **The frontend has no end-to-end coverage against a live API.** Component
   tests (below) assert the UI never widens what the API returns, and the e2e
   suite asserts the API never returns another user's rows, but nothing
   exercises the two together against a running server.

---

## 7. Frontend verification

```bash
cd frontend && npm test
```

34 tests across 4 files. The ones that carry weight for this document:

| File | Asserts |
|------|---------|
| `src/libs/axiosConfig.test.ts` | The bearer token is attached; a 401 **with** a token does not trigger a login redirect (that would loop forever, since the same token would be reissued); the backend's deliberately-ambiguous `"Collection not found"` reaches the user verbatim |
| `dialogFormBookmark.test.tsx` | The collection picker offers **exactly** the collections handed to it by the owner-scoped hook — no self-fetching, no cached rows, nothing hard-coded — and sends `null` (not `undefined`) when unfiling, since only `null` means "unfile" to the API |
| `collectionsPage.test.tsx` | The row you clicked is the row that gets written: editing the second row PUTs against the second row's id, and deleting it DELETEs that id |

The UI layer cannot *create* a privacy breach on its own — every route it calls
is owner-scoped server-side — but it can *display* the wrong record or write to
the wrong id, which is what these assertions rule out.
