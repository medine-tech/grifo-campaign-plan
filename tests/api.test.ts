/**
 * Real handleApi integration tests against a fresh, isolated PGlite database.
 * Run from the project root: ./node_modules/.bin/tsx /tmp/grifo-api-tests.ts
 * Copy to tests/api.integration.ts without changing imports, or set GRIFO_PROJECT_ROOT.
 * Never reads .env and explicitly removes remote database/deployment configuration.
 * PGlite serializes transactions; concurrent request tests do not prove PostgreSQL lock scheduling.
 */
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

type Credential = { cookie?: string; token?: string };
// API fixture fields are asserted at runtime, including unexpected/error response shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;
type Result = { status: number; value: Json; headers: Headers };
type Options = {
  as?: Credential;
  body?: unknown;
  raw?: string;
  headers?: Record<string, string | null>;
};
const root = resolve(process.env.GRIFO_PROJECT_ROOT || process.cwd());
const base = "https://grifo-test.example";
const password = "Only-a-test-password-2026";
const setupToken = "setup-only-for-isolated-integration-tests";
const results: { name: string; passed: boolean; error?: string }[] = [];
let admin: Credential, member: Credential, stranger: Credential;
let adminId: string, memberId: string, strangerId: string, personId: string;
let serial = 0;
const areaKinds: Record<string, string[]> = {
  cazadores: ["nuevo", "reactivacion"],
  seguimiento: ["seguimiento", "logro", "racha"],
  ideas: ["idea"],
  competencia: ["entrada", "observacion"],
  ventas: ["venta"],
  administracion: ["tarea"],
  referidos: ["referido"],
};
const islandOf = (kind: string) =>
  Object.keys(areaKinds).find((island) => areaKinds[island].includes(kind))!;
const recordPath = (kind: string, id?: string) =>
  `islands/${islandOf(kind)}/records${id ? "/" + id : ""}`;
const hash = (text: string) => createHash("sha256").update(text).digest("hex");

async function main() {
  process.chdir(root);
  delete process.env.DATABASE_URL;
  delete process.env.VERCEL;
  Object.assign(process.env, { NODE_ENV: "test" });
  process.env.LOCAL_DATABASE_PATH = "memory://";
  process.env.APP_URL = base;
  process.env.SETUP_TOKEN = setupToken;
  const { handleApi } = await import(
    pathToFileURL(resolve(root, "src/lib/api.ts")).href
  );
  const { ready, query, closeDb } = await import(
    pathToFileURL(resolve(root, "src/lib/db.ts")).href
  );
  const { passwordHash, passwordMatches } = await import(
    pathToFileURL(resolve(root, "src/lib/auth.ts")).href
  );

  async function call(
    method: string,
    path: string,
    options: Options = {},
  ): Promise<Result> {
    const headers = new Headers({ origin: base });
    if (options.as?.cookie) headers.set("cookie", options.as.cookie);
    if (options.as?.token)
      headers.set("authorization", "Bearer " + options.as.token);
    let payload = options.raw;
    if (options.body !== undefined) {
      payload = JSON.stringify(options.body);
      headers.set("content-type", "application/json");
    }
    for (const [name, value] of Object.entries(options.headers || {})) {
      if (value === null) headers.delete(name);
      else headers.set(name, value);
    }
    const response = await handleApi(
      new Request(base + "/api/v1/" + path, { method, headers, body: payload }),
      path.split("?")[0].split("/"),
    );
    const text = await response.text();
    return {
      status: response.status,
      value: text ? JSON.parse(text) : {},
      headers: response.headers,
    };
  }
  function status(response: Result, expected: number) {
    assert.equal(
      response.status,
      expected,
      `Expected HTTP ${expected}; got ${response.status}: ${JSON.stringify(response.value)}`,
    );
    if (expected >= 400)
      assert.equal(typeof response.value.error?.message, "string");
    return response;
  }
  async function ok(
    method: string,
    path: string,
    options: Options = {},
    expected = 200,
  ) {
    return status(await call(method, path, options), expected);
  }
  const credentials = (response: Result): Credential => {
    const setCookie = response.headers.get("set-cookie");
    assert.ok(setCookie?.includes("HttpOnly"));
    assert.ok(setCookie?.includes("SameSite=Lax"));
    return { cookie: setCookie!.split(";")[0] };
  };
  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log("PASS " + name);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ name, passed: false, error: message });
      console.error("FAIL " + name + ": " + message);
    }
  }
  function payload(kind: string, overrides: Json = {}): Json {
    const n = ++serial;
    const data: Json = {
      entrada: {
        demoUrl: `https://demo.example/${n}`,
        process: "Built and verified the working flow.",
        impact: "Measured a useful result.",
        xBonus: false,
        podium: "Sin podio",
      },
      venta: {
        amount: 100,
        currency: "USD",
        paymentConfirmed: true,
        paymentProofUrl: `https://proof.example/payment/${n}`,
      },
      referido: {
        referredPerson: `person-${n}`,
        paymentConfirmed: true,
        paymentProofUrl: `https://proof.example/referral/${n}`,
        referralStage: "Pago confirmado",
      },
      racha: { week: "2" },
    };
    return {
      kind,
      title: `Integration ${kind} ${n}`,
      description: "Synthetic fixture",
      memberId: personId || null,
      assigneeId: null,
      dueDate: "2026-09-12",
      eventDate: "2026-09-08",
      status: "pending",
      priority: "medium",
      nextAction: "",
      evidenceUrl: `https://evidence.example/${kind}/${n}`,
      data: data[kind] || {},
      ...overrides,
    };
  }
  async function create(kind: string, overrides: Json = {}, as = admin) {
    return (
      await ok(
        "POST",
        recordPath(kind),
        { as, body: payload(kind, overrides) },
        201,
      )
    ).value.data;
  }
  async function review(
    record: Json,
    verification = "accredited",
    as = admin,
    extras: Json = {},
    expected = 200,
  ) {
    return ok(
      "POST",
      recordPath(record.kind, record.id) + "/review",
      {
        as,
        body: {
          verification,
          version: record.version,
          officialUrl: "https://official.example/accreditation",
          reviewNote: "",
          ...extras,
        },
      },
      expected,
    );
  }
  async function token(as: Credential, scopes: string[]) {
    return (
      await ok(
        "POST",
        "tokens",
        {
          as,
          body: {
            name: "Synthetic integration token",
            scopes,
            expiresInDays: 1,
          },
        },
        201,
      )
    ).value.data;
  }
  async function newPerson(name: string, as = admin) {
    return (
      await ok(
        "POST",
        "members",
        {
          as,
          body: {
            name,
            surname: "Test",
            profileUrl: `https://community.example/${randomUUID()}`,
          },
        },
        201,
      )
    ).value.data;
  }
  async function register(name: string, email: string, inviteCode: string) {
    return ok(
      "POST",
      "auth/register",
      { body: { name, email, password, inviteCode } },
      201,
    );
  }
  async function invite() {
    return (
      await ok(
        "POST",
        "invitations",
        { as: admin, body: { name: "Synthetic invite" } },
        201,
      )
    ).value.data.code;
  }

  try {
    // A broken migration is a fatal test failure, never replaced by a hand-built schema.
    await ready();
    console.log(
      "ISOLATION PGlite memory://; remote DATABASE_URL and VERCEL removed",
    );
    await test("public health and authentication required", async () => {
      assert.equal((await ok("GET", "health")).value.status, "ok");
      for (const path of [
        "auth/me",
        "dashboard",
        "users",
        "members",
        "tokens",
        "islands",
        "audit",
      ])
        status(await call("GET", path), 401);
      status(
        await call("POST", "auth/register", {
          body: {
            name: "Invalid Admin",
            email: "invalid@example.test",
            password,
            inviteCode: "wrong",
          },
        }),
        403,
      );
    });

    const registration = await register(
      "Test Administrator",
      "ADMIN@example.test",
      setupToken,
    );
    admin = credentials(registration);
    adminId = registration.value.data.id;
    assert.equal(registration.value.data.role, "admin");
    assert.equal(registration.value.data.email, "admin@example.test");
    const memberCode = await invite();
    const memberRegistration = await register(
      "Test Member",
      "member@example.test",
      memberCode,
    );
    member = credentials(memberRegistration);
    memberId = memberRegistration.value.data.id;
    assert.equal(memberRegistration.value.data.role, "member");
    const strangerRegistration = await register(
      "Other Member",
      "other@example.test",
      await invite(),
    );
    stranger = credentials(strangerRegistration);
    strangerId = strangerRegistration.value.data.id;
    personId = (await newPerson("Campaign Person")).id;

    await test("registration, single use invitations, and first admin isolation", async () => {
      assert.equal(
        (await ok("GET", "auth/me", { as: admin })).value.data.id,
        adminId,
      );
      status(
        await call("POST", "auth/register", {
          body: {
            name: "Replay Invite",
            email: "replay@example.test",
            password,
            inviteCode: memberCode,
          },
        }),
        403,
      );
      status(
        await call("POST", "auth/register", {
          body: {
            name: "Replay Setup",
            email: "setup2@example.test",
            password,
            inviteCode: setupToken,
          },
        }),
        403,
      );
      status(
        await call("POST", "invitations", {
          as: member,
          body: { name: "Not allowed" },
        }),
        403,
      );
      status(await call("GET", "invitations", { as: member }), 403);
      const list = (await ok("GET", "invitations", { as: admin })).value.data;
      assert.equal(list.length, 2);
      assert.ok(list.every((i: Json) => i.usedAt && !i.hash && !i.code));
    });

    await test("login, logout, bad passwords, expired sessions", async () => {
      status(
        await call("POST", "auth/login", {
          body: { email: "member@example.test", password: "wrong-password" },
        }),
        401,
      );
      status(
        await call("POST", "auth/login", {
          body: { email: "missing@example.test", password },
        }),
        401,
      );
      const loggedIn = await ok("POST", "auth/login", {
        body: { email: "MEMBER@example.test", password },
      });
      const temporary = credentials(loggedIn);
      assert.equal(
        (await ok("GET", "auth/me", { as: temporary })).value.data.id,
        memberId,
      );
      const logout = await ok("POST", "auth/logout", { as: temporary });
      assert.ok(logout.headers.get("set-cookie")?.includes("Max-Age=0"));
      status(await call("GET", "auth/me", { as: temporary }), 401);
      const expired = credentials(
        await ok("POST", "auth/login", {
          body: { email: "member@example.test", password },
        }),
      );
      await query(
        "UPDATE sessions SET expires_at=now()-interval '1 second' WHERE hash=$1",
        [hash(expired.cookie!.split("=")[1])],
      );
      status(await call("GET", "auth/me", { as: expired }), 401);
    });

    await test("CSRF blocks foreign or missing origins for cookie mutations", async () => {
      for (const origin of [null, "https://hostile.example", "null"]) {
        const response = status(
          await call("POST", "members", {
            as: member,
            body: { name: "CSRF attempt" },
            headers: { origin },
          }),
          403,
        );
        assert.equal(response.value.error.code, "csrf");
      }
      status(
        await call("POST", "auth/login", {
          body: { email: "member@example.test", password },
          headers: { origin: "https://hostile.example" },
        }),
        403,
      );
      status(
        await call("POST", "auth/logout", {
          as: member,
          headers: { origin: null },
        }),
        403,
      );
      await ok("GET", "auth/me", { as: member, headers: { origin: null } });
    });

    await test("request validation rejects malformed, oversized, unknown, and unsafe input", async () => {
      status(
        await call("POST", "members", {
          as: member,
          raw: "{bad",
          headers: { "content-type": "application/json" },
        }),
        400,
      );
      status(
        await call("POST", "members", {
          as: member,
          raw: '{"name":"No JSON type"}',
        }),
        415,
      );
      status(
        await call("POST", "members", {
          as: member,
          body: { name: "Large", notes: "x".repeat(66000) },
        }),
        413,
      );
      status(
        await call("POST", "members", {
          as: member,
          body: { name: "Role injection", role: "admin" },
        }),
        422,
      );
      status(
        await call("POST", "members", {
          as: member,
          body: { name: "URL injection", profileUrl: "javascript:alert(1)" },
        }),
        422,
      );
      status(
        await call("POST", recordPath("idea"), {
          as: member,
          body: payload("venta"),
        }),
        422,
      );
      status(
        await call("POST", recordPath("idea"), {
          as: member,
          body: payload("idea", { data: { unknown: true } }),
        }),
        422,
      );
      status(
        await call("POST", recordPath("venta"), {
          as: member,
          body: payload("venta", { data: { amount: "many" } }),
        }),
        422,
      );
      status(
        await call("POST", recordPath("venta"), {
          as: member,
          body: payload("venta", { points: 999 }),
        }),
        422,
      );
      status(
        await call("POST", recordPath("racha"), {
          as: member,
          body: payload("racha", { data: { week: "5" } }),
        }),
        422,
      );
      status(await call("GET", "members/not-a-uuid", { as: member }), 422);
    });

    for (const [island, kinds] of Object.entries(areaKinds))
      for (const kind of kinds) {
        await test(`CRUD ${island}/${kind}: create read list update stale delete`, async () => {
          const original = payload(kind);
          const record = (
            await ok(
              "POST",
              recordPath(kind),
              { as: member, body: original },
              201,
            )
          ).value.data;
          assert.equal(record.kind, kind);
          assert.equal(record.island, island);
          assert.equal(record.createdBy, memberId);
          assert.equal(record.version, 1);
          assert.equal(record.points, 0);
          assert.equal(record.verification, "pending");
          assert.deepEqual(
            (await ok("GET", recordPath(kind, record.id), { as: stranger }))
              .value.data,
            record,
          );
          assert.ok(
            (
              await ok(
                "GET",
                recordPath(kind) + "?q=" + encodeURIComponent(record.title),
                { as: member },
              )
            ).value.data.some((r: Json) => r.id === record.id),
          );
          status(
            await call("PUT", recordPath(kind, record.id), {
              as: stranger,
              body: { ...original, version: record.version },
            }),
            403,
          );
          status(
            await call("DELETE", recordPath(kind, record.id) + "?version=1", {
              as: stranger,
            }),
            403,
          );
          const updated = (
            await ok("PUT", recordPath(kind, record.id), {
              as: member,
              body: {
                ...original,
                title: "Updated " + kind,
                status: "done",
                version: record.version,
              },
            })
          ).value.data;
          assert.equal(updated.version, 2);
          assert.equal(updated.status, "done");
          status(
            await call("PUT", recordPath(kind, record.id), {
              as: member,
              body: { ...original, version: 1 },
            }),
            409,
          );
          status(
            await call("DELETE", recordPath(kind, record.id) + "?version=1", {
              as: member,
            }),
            409,
          );
          await ok(
            "DELETE",
            recordPath(kind, record.id) + "?version=2",
            { as: member },
            204,
          );
          status(
            await call("GET", recordPath(kind, record.id), { as: member }),
            404,
          );
          assert.ok(
            !(
              await ok("GET", recordPath(kind), { as: member })
            ).value.data.some((r: Json) => r.id === record.id),
          );
        });
      }

    await test("member CRUD, ownership, uniqueness, and foreign key consistency", async () => {
      const person = await newPerson("Owned Person", member);
      assert.equal(
        (await ok("GET", "members/" + person.id, { as: stranger })).value.data
          .id,
        person.id,
      );
      status(
        await call("PUT", "members/" + person.id, {
          as: stranger,
          body: { name: "Unauthorized" },
        }),
        403,
      );
      status(
        await call("DELETE", "members/" + person.id, { as: stranger }),
        403,
      );
      status(
        await call("POST", "members", {
          as: member,
          body: { name: "Duplicate", profileUrl: person.profileUrl },
        }),
        409,
      );
      const updated = (
        await ok("PUT", "members/" + person.id, {
          as: member,
          body: { name: "Edited Person", active: false },
        })
      ).value.data;
      assert.equal(updated.active, false);
      await ok("DELETE", "members/" + person.id, { as: member }, 204);
      status(await call("GET", "members/" + person.id, { as: member }), 404);
      await create("idea");
      status(await call("DELETE", "members/" + personId, { as: admin }), 409);
      status(
        await call("POST", recordPath("idea"), {
          as: member,
          body: payload("idea", { memberId: randomUUID() }),
        }),
        409,
      );
    });

    await test("assignee can edit a record authored by another member", async () => {
      const original = payload("tarea", { assigneeId: strangerId });
      const record = (
        await ok(
          "POST",
          recordPath("tarea"),
          { as: member, body: original },
          201,
        )
      ).value.data;
      const updated = await ok("PUT", recordPath("tarea", record.id), {
        as: stranger,
        body: { ...original, version: 1, nextAction: "Accepted action" },
      });
      assert.equal(updated.value.data.nextAction, "Accepted action");
    });

    await test("API tokens enforce scopes, session-only management, ownership and revocation", async () => {
      const read = await token(member, ["read"]);
      const write = await token(member, ["write"]);
      const readAs = { token: read.token };
      const writeAs = { token: write.token };
      assert.equal(
        (await ok("GET", "auth/me", { as: readAs, headers: { origin: null } }))
          .value.data.id,
        memberId,
      );
      status(
        await call("POST", "members", {
          as: readAs,
          body: { name: "Read token cannot write" },
        }),
        403,
      );
      status(await call("GET", "members", { as: writeAs }), 403);
      const created = (
        await ok(
          "POST",
          recordPath("idea"),
          { as: writeAs, body: payload("idea"), headers: { origin: null } },
          201,
        )
      ).value.data;
      assert.equal(created.createdBy, memberId);
      status(await call("GET", "tokens", { as: readAs }), 403);
      status(
        await call("POST", "tokens", {
          as: writeAs,
          body: {
            name: "No token nesting",
            scopes: ["read"],
            expiresInDays: 1,
          },
        }),
        403,
      );
      status(
        await call("POST", "tokens", {
          as: member,
          body: {
            name: "Cannot approve",
            scopes: ["approve"],
            expiresInDays: 1,
          },
        }),
        403,
      );
      status(await call("DELETE", "tokens/" + read.id, { as: stranger }), 404);
      const tokenList = (await ok("GET", "tokens", { as: member })).value.data;
      assert.ok(tokenList.some((t: Json) => t.id === read.id));
      assert.ok(tokenList.every((t: Json) => !t.token && !t.hash));
      await ok("DELETE", "tokens/" + read.id, { as: member }, 204);
      status(await call("GET", "auth/me", { as: readAs }), 401);
      await query(
        "UPDATE api_tokens SET expires_at=now()-interval '1 second' WHERE id=$1",
        [write.id],
      );
      status(
        await call("POST", "members", {
          as: writeAs,
          body: { name: "Expired token" },
        }),
        401,
      );
      status(await call("GET", "members", { as: { token: "invalid" } }), 401);
      const event = await query(
        "SELECT token_id FROM audit_events WHERE entity_id=$1 AND action=$2",
        [created.id, "record.created"],
      );
      assert.equal(event.rows[0].token_id, write.id);
    });

    await test("idempotent create replays, rejects conflicting payload and scopes key per user", async () => {
      const body = payload("idea");
      const key = "repeat-idea-0001";
      const headers = { "idempotency-key": key };
      const first = await ok(
        "POST",
        recordPath("idea"),
        { as: member, body, headers },
        201,
      );
      const replay = await ok(
        "POST",
        recordPath("idea"),
        { as: member, body, headers },
        201,
      );
      assert.deepEqual(replay.value, first.value);
      assert.equal(first.headers.get("idempotency-replayed"), "false");
      assert.equal(replay.headers.get("idempotency-replayed"), "true");
      status(
        await call("POST", recordPath("idea"), {
          as: member,
          body: { ...body, title: "Different request" },
          headers,
        }),
        409,
      );
      const other = await ok(
        "POST",
        recordPath("idea"),
        { as: stranger, body, headers },
        201,
      );
      assert.notEqual(other.value.data.id, first.value.data.id);
      status(
        await call("POST", recordPath("idea"), {
          as: member,
          body,
          headers: { "idempotency-key": "short" },
        }),
        422,
      );
      const count = await query(
        "SELECT count(*)::int AS n FROM audit_events WHERE entity_id=$1 AND action=$2",
        [first.value.data.id, "record.created"],
      );
      assert.equal(count.rows[0].n, 1);
    });

    await test("concurrent idempotent requests create exactly one record and member", async () => {
      const body = payload("idea");
      const headers = { "idempotency-key": "concurrent-record-0001" };
      const replies = await Promise.all(
        Array.from({ length: 6 }, () =>
          ok("POST", recordPath("idea"), { as: member, body, headers }, 201),
        ),
      );
      assert.equal(new Set(replies.map((r) => r.value.data.id)).size, 1);
      assert.equal(
        replies.filter((r) => r.headers.get("idempotency-replayed") === "false")
          .length,
        1,
      );
      const memberReplies = await Promise.all(
        Array.from({ length: 4 }, () =>
          ok(
            "POST",
            "members",
            {
              as: member,
              body: { name: "Idempotent Member" },
              headers: { "idempotency-key": "concurrent-member-0001" },
            },
            201,
          ),
        ),
      );
      assert.equal(new Set(memberReplies.map((r) => r.value.data.id)).size, 1);
    });

    await test("optimistic version rejects one of two concurrent updates", async () => {
      const body = payload("idea");
      const record = (
        await ok("POST", recordPath("idea"), { as: member, body }, 201)
      ).value.data;
      const responses = await Promise.all(
        ["First", "Second"].map((title) =>
          call("PUT", recordPath("idea", record.id), {
            as: member,
            body: { ...body, title, version: 1 },
          }),
        ),
      );
      assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
      assert.equal(
        (await ok("GET", recordPath("idea", record.id), { as: member })).value
          .data.version,
        2,
      );
    });

    await test("review requires evidence, member identity, admin role and approve scope", async () => {
      const absent = await create("entrada", { evidenceUrl: "" }, member);
      await review(absent, "submitted", member, {}, 422);
      const anonymous = await create("entrada", { memberId: null }, member);
      await review(anonymous, "submitted", member, {}, 422);
      const incomplete = await create("entrada", { data: {} }, member);
      await review(incomplete, "submitted", member, {}, 422);
      const noBonusProof = await create(
        "entrada",
        {
          data: {
            demoUrl: "https://demo.example",
            process: "Process",
            impact: "Impact",
            xBonus: true,
          },
        },
        member,
      );
      await review(noBonusProof, "submitted", member, {}, 422);
      const record = await create("entrada", {}, member);
      await review(record, "submitted", stranger, {}, 403);
      await review(record, "accredited", member, {}, 403);
      const submitted = (await review(record, "submitted", member)).value.data;
      const restricted = await token(admin, ["read", "write"]);
      await review(
        submitted,
        "accredited",
        { token: restricted.token },
        {},
        403,
      );
      const approver = await token(admin, ["read", "write", "approve"]);
      await review(
        submitted,
        "accredited",
        { token: approver.token },
        { officialUrl: "" },
        422,
      );
      const accredited = (
        await review(submitted, "accredited", { token: approver.token })
      ).value.data;
      assert.equal(accredited.points, 5);
      assert.equal(accredited.verification, "accredited");
    });

    await test("accredited records are immutable until reasoned withdrawal; edits reset validation", async () => {
      const original = payload("entrada");
      const record = (
        await ok(
          "POST",
          recordPath("entrada"),
          { as: member, body: original },
          201,
        )
      ).value.data;
      const accredited = (await review(record)).value.data;
      status(
        await call("PUT", recordPath("entrada", record.id), {
          as: member,
          body: { ...original, version: accredited.version },
        }),
        409,
      );
      status(
        await call(
          "DELETE",
          recordPath("entrada", record.id) + "?version=" + accredited.version,
          { as: admin },
        ),
        409,
      );
      await review(accredited, "pending", admin, {}, 422);
      await review(
        accredited,
        "pending",
        member,
        { reviewNote: "Not administrator" },
        403,
      );
      const withdrawn = (
        await review(accredited, "pending", admin, {
          reviewNote: "Correcting source evidence",
        })
      ).value.data;
      assert.equal(withdrawn.points, 0);
      const validated = (await review(withdrawn, "validated")).value.data;
      const edited = (
        await ok("PUT", recordPath("entrada", record.id), {
          as: member,
          body: {
            ...original,
            version: validated.version,
            title: "Source changed",
          },
        })
      ).value.data;
      assert.equal(edited.verification, "pending");
      assert.equal(edited.points, 0);
      assert.equal(edited.officialUrl, "");
      await review(edited, "rejected", admin, {}, 422);
      assert.equal(
        (
          await review(edited, "rejected", admin, {
            reviewNote: "Invalid proof",
          })
        ).value.data.verification,
        "rejected",
      );
    });

    await test("sales require payment and enforce five accredited sales per member", async () => {
      const person = await newPerson("Sale Cap Person");
      const unpaid = await create("venta", {
        memberId: person.id,
        data: {
          paymentConfirmed: false,
          paymentProofUrl: "https://proof.example/unpaid",
        },
      });
      await review(unpaid, "submitted", admin, {}, 422);
      for (let n = 0; n < 5; n++)
        assert.equal(
          (await review(await create("venta", { memberId: person.id }))).value
            .data.points,
          5,
        );
      const sixth = await create("venta", { memberId: person.id });
      const response = await review(sixth, "accredited", admin, {}, 409);
      assert.match(response.value.error.message, /5 ventas/);
    });

    await test("concurrent sales accreditation cannot exceed five", async () => {
      const person = await newPerson("Concurrent Sale Cap Person");
      for (let n = 0; n < 4; n++)
        await review(await create("venta", { memberId: person.id }));
      const candidates = [
        await create("venta", { memberId: person.id }),
        await create("venta", { memberId: person.id }),
      ];
      const responses = await Promise.all(
        candidates.map((record) =>
          call("POST", recordPath("venta", record.id) + "/review", {
            as: admin,
            body: {
              verification: "accredited",
              version: 1,
              officialUrl: "https://official.example/cap",
            },
          }),
        ),
      );
      assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
      const count = await query(
        "SELECT count(*)::int AS n FROM records WHERE member_id=$1 AND kind=$2 AND verification=$3",
        [person.id, "venta", "accredited"],
      );
      assert.equal(count.rows[0].n, 5);
    });

    await test("one daily achievement and weekly streak per member", async () => {
      const person = await newPerson("Daily and Weekly Person");
      assert.equal(
        (await review(await create("logro", { memberId: person.id }))).value
          .data.points,
        1,
      );
      await review(
        await create("logro", { memberId: person.id }),
        "accredited",
        admin,
        {},
        409,
      );
      await review(
        await create("logro", { memberId: person.id, eventDate: "2026-09-09" }),
      );
      assert.equal(
        (await review(await create("racha", { memberId: person.id }))).value
          .data.points,
        5,
      );
      await review(
        await create("racha", { memberId: person.id }),
        "accredited",
        admin,
        {},
        409,
      );
      await review(
        await create("racha", { memberId: person.id, data: { week: "3" } }),
      );
      await review(
        await create("racha", { memberId: person.id, data: {} }),
        "submitted",
        admin,
        {},
        422,
      );
    });

    await test("referral requires payment and rejects duplicate normalized person", async () => {
      const missing = await create("referido", {
        data: { referredPerson: "New Person", paymentConfirmed: false },
      });
      await review(missing, "submitted", admin, {}, 422);
      const one = await create("referido", {
        data: {
          referredPerson: "Stable-Person-ID",
          paymentConfirmed: true,
          paymentProofUrl: "https://proof.example/referral-a",
        },
      });
      assert.equal((await review(one)).value.data.points, 10);
      const duplicate = await create("referido", {
        data: {
          referredPerson: " stable-person-id ",
          paymentConfirmed: true,
          paymentProofUrl: "https://proof.example/referral-b",
        },
      });
      await review(duplicate, "accredited", admin, {}, 409);
    });

    await test("evidence normalization blocks fragments, tracking and reordered query duplicates", async () => {
      const original = await create("entrada", {
        evidenceUrl: "https://www.skool.com/imperio/test-evidence?a=1&b=2",
      });
      await review(original);
      for (const suffix of [
        "?a=1&b=2#proof2",
        "?b=2&a=1&utm_source=copy&utm_campaign=launch",
        "?b=2&fbclid=abc&a=1&gclid=xyz",
      ]) {
        const duplicate = await create("entrada", {
          evidenceUrl: "https://www.skool.com/imperio/test-evidence" + suffix,
        });
        await review(duplicate, "accredited", admin, {}, 409);
      }
      await review(
        await create("entrada", {
          evidenceUrl:
            "https://www.skool.com/imperio/test-evidence?a=DIFFERENT&b=2",
        }),
      );
    });

    await test("payment proof reuse is rejected for sales and referrals", async () => {
      const person = await newPerson("Payment Reuse Person");
      for (const kind of ["venta", "referido"]) {
        const proof = "https://proof.example/dedup-" + kind;
        const one = payload(kind, { memberId: person.id });
        one.data.paymentProofUrl = proof;
        const first = (
          await ok("POST", recordPath(kind), { as: admin, body: one }, 201)
        ).value.data;
        await review(first);
        const two = payload(kind, { memberId: person.id });
        two.data.paymentProofUrl = proof + "?utm_source=forward#page1";
        const second = (
          await ok("POST", recordPath(kind), { as: admin, body: two }, 201)
        ).value.data;
        const response = await review(second, "accredited", admin, {}, 409);
        assert.match(response.value.error.message, /comprobante/);
      }
    });

    await test("entry bonus and podium points are server derived", async () => {
      const record = await create("entrada", {
        data: {
          demoUrl: "https://demo.example/podium",
          process: "Reproducible process",
          impact: "Measured impact",
          xBonus: true,
          xUrl: "https://x.com/test/status/123",
          podium: "1",
        },
      });
      assert.equal(record.points, 0);
      assert.equal((await review(record)).value.data.points, 37);
    });

    await test("malformed pagination returns 422 and valid pagination/filtering works", async () => {
      for (const queryString of [
        "perPage=1.5",
        "perPage=101",
        "perPage=-1",
        "perPage=abc",
        "page=1.5",
        "page=0",
        "page=10001",
        "page=Infinity",
      ]) {
        status(
          await call("GET", recordPath("idea") + "?" + queryString, {
            as: stranger,
          }),
          422,
        );
      }
      const page = await ok("GET", recordPath("idea") + "?page=1&perPage=1", {
        as: stranger,
      });
      assert.equal(page.value.pagination.page, 1);
      assert.equal(page.value.pagination.perPage, 1);
      assert.equal(page.value.data.length, 1);
      const filtered = await ok(
        "GET",
        recordPath("entrada") + "?verification=accredited",
        { as: stranger },
      );
      assert.ok(filtered.value.data.length > 0);
      assert.ok(
        filtered.value.data.every((r: Json) => r.verification === "accredited"),
      );
    });

    await test("dashboard reconciles accredited points and does not expose secret fields", async () => {
      const dashboard = (await ok("GET", "dashboard", { as: stranger })).value
        .data;
      const totals = await query(
        "SELECT sum(points)::int AS points,count(*)::int AS n FROM records WHERE deleted_at IS NULL",
      );
      assert.equal(dashboard.accreditedPoints, totals.rows[0].points);
      assert.equal(dashboard.total, totals.rows[0].n);
      const areas = (await ok("GET", "islands", { as: stranger })).value.data;
      assert.deepEqual(
        areas.map((x: Json) => x.id).sort(),
        Object.keys(areaKinds).sort(),
      );
      assert.equal(dashboard.islands.length, 7);
      const users = (await ok("GET", "users", { as: stranger })).value.data;
      assert.ok(
        users.every(
          (u: Json) => !u.passwordHash && !u.password_hash && !u.email,
        ),
      );
      status(await call("GET", "audit", { as: stranger }), 403);
      assert.ok(
        (await ok("GET", "audit", { as: admin })).value.data.length > 0,
      );
      assert.equal(
        (await ok("GET", "dashboard", { as: stranger })).headers.get(
          "cache-control",
        ),
        "no-store",
      );
    });

    await test("password storage is salted, token/session/invitation storage is hashed", async () => {
      const encoded1 = await passwordHash(password);
      const encoded2 = await passwordHash(password);
      assert.notEqual(encoded1, encoded2);
      assert.ok(await passwordMatches(password, encoded1));
      assert.equal(await passwordMatches("wrong", encoded1), false);
      const stored = await query(
        "SELECT password_hash FROM users WHERE id=$1",
        [adminId],
      );
      assert.notEqual(stored.rows[0].password_hash, password);
      assert.match(
        stored.rows[0].password_hash,
        /^[0-9a-f]{32}:[0-9a-f]{128}$/,
      );
      for (const table of ["sessions", "api_tokens", "invitations"]) {
        const rows = await query(`SELECT hash FROM ${table}`);
        assert.ok(rows.rows.length > 0);
        assert.ok(rows.rows.every((r: Json) => /^[0-9a-f]{64}$/.test(r.hash)));
      }
    });

    await test("password change revokes previous sessions and API tokens", async () => {
      const changedRegistration = await register(
        "Password Change User",
        "password@example.test",
        await invite(),
      );
      const firstSession = credentials(changedRegistration);
      const secondSession = credentials(
        await ok("POST", "auth/login", {
          body: { email: "password@example.test", password },
        }),
      );
      const previousToken = await token(firstSession, ["read", "write"]);
      status(
        await call("PUT", "auth/password", {
          as: firstSession,
          body: { currentPassword: "wrong", newPassword: password + "-new" },
        }),
        401,
      );
      const changed = await ok("PUT", "auth/password", {
        as: firstSession,
        body: { currentPassword: password, newPassword: password + "-new" },
      });
      const newSession = credentials(changed);
      for (const as of [
        firstSession,
        secondSession,
        { token: previousToken.token },
      ])
        status(await call("GET", "auth/me", { as }), 401);
      await ok("GET", "auth/me", { as: newSession });
      status(
        await call("POST", "auth/login", {
          body: { email: "password@example.test", password },
        }),
        401,
      );
      await ok("POST", "auth/login", {
        body: { email: "password@example.test", password: password + "-new" },
      });
    });

    await test("unknown routes and unsupported methods fail predictably", async () => {
      for (const path of [
        "missing",
        "islands/no-such-island/records",
        "islands/ideas/records/" + randomUUID(),
      ])
        status(await call("GET", path, { as: stranger }), 404);
      status(await call("PATCH", "members", { as: stranger, body: {} }), 404);
    });

    await test("rate limiting responds 429 with Retry-After", async () => {
      // Saturate only a disposable test user's API bucket, never a shared fixture.
      const user = await register(
        "Rate Limit User",
        "rate@example.test",
        await invite(),
      );
      const as = credentials(user);
      await query(
        "INSERT INTO rate_limits(key,count,expires_at) VALUES($1,300,now()+interval '1 minute')",
        [hash("api:" + user.value.data.id)],
      );
      const response = status(await call("GET", "auth/me", { as }), 429);
      assert.equal(response.headers.get("retry-after"), "60");
      assert.equal(response.value.error.code, "rate_limited");
    });
  } finally {
    await closeDb();
  }
  const passed = results.filter((r) => r.passed).length;
  console.log(
    `RESULT ${passed}/${results.length} groups passed; ${results.length - passed} failed`,
  );
  console.log(
    "NOTE Concurrent request tests use PGlite single-connection scheduling; true multi-session PostgreSQL deadlock behavior is not exercised.",
  );
  if (passed !== results.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error("FATAL integration suite:", error);
  process.exitCode = 1;
});
