import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createCompanyHandlers } from "../lib/server/company.ts";

const company = {
  id: "company-owned-by-user",
  name: "Salão da conta",
  whatsapp_phone_number_id: null,
  whatsapp_display_phone_number: null,
  whatsapp_waba_id: null,
  whatsapp_connected: false,
};

const databaseError = { code: "42501", message: "Permission denied" };

function setup(options = {}) {
  const calls = [];
  let membershipRead = 0;
  const membershipResults = options.memberships ?? [[{ company_id: company.id }]];

  const fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const body = request.method === "POST" ? await request.json() : null;
    calls.push({ url, method: request.method, headers: request.headers, body });

    if (url.pathname === "/auth/v1/user") {
      return options.invalidAuth
        ? Response.json({ message: "Invalid JWT", code: "bad_jwt" }, { status: 401 })
        : Response.json({ id: "authenticated-user", email: "test@example.com" });
    }

    if (url.pathname === "/rest/v1/company_users") {
      const result = membershipResults[Math.min(membershipRead++, membershipResults.length - 1)];
      return Response.json(result, { status: Array.isArray(result) ? 200 : 400 });
    }

    if (url.pathname === "/rest/v1/companies") {
      const result = options.companies ?? [company];
      return Response.json(result, { status: Array.isArray(result) ? 200 : 400 });
    }

    if (url.pathname === "/rest/v1/rpc/create_company") {
      return Response.json(options.rpcError ?? company.id, { status: options.rpcError ? 400 : 200 });
    }

    throw new Error(`Unexpected request: ${request.method} ${url.pathname}`);
  };

  const makeClient = (key, accessToken) => createClient("https://database.example.test", key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch, headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} },
  });

  const handlers = createCompanyHandlers({
    createAdminClient: () => makeClient("test-service-role-key"),
    createUserClient: (accessToken) => makeClient("test-publishable-key", accessToken),
  });

  function request(method = "GET", body, authorization = "Bearer valid-user-token") {
    return new Request("https://app.example.test/api/company?user_id=forged&company_id=forged", {
      method,
      headers: authorization ? { Authorization: authorization, "Content-Type": "application/json" } : {},
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    });
  }

  return { handlers, calls, request };
}

test("GET rejects missing and malformed bearer tokens before making database requests", async () => {
  for (const authorization of [null, "Basic token", "Bearer ", "Bearer token extra"]) {
    const { handlers, calls, request } = setup();
    const response = await handlers.GET(request("GET", undefined, authorization));
    assert.equal(response.status, 401);
    assert.equal(calls.length, 0);
  }
});

test("GET rejects an invalid Supabase session before reading memberships", async () => {
  const { handlers, calls, request } = setup({ invalidAuth: true });
  assert.equal((await handlers.GET(request())).status, 401);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.get("Authorization"), "Bearer valid-user-token");
});

test("GET returns null only when the authenticated user has no membership", async () => {
  const { handlers, calls, request } = setup({ memberships: [[]] });
  const response = await handlers.GET(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { company: null });
  assert.equal(calls.length, 2);
});

test("GET uses the verified user and membership, ignoring client-provided IDs", async () => {
  const { handlers, calls, request } = setup();
  const response = await handlers.GET(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { company });
  const membershipCall = calls.find(({ url }) => url.pathname.endsWith("/company_users"));
  assert.equal(membershipCall.url.searchParams.get("user_id"), "eq.authenticated-user");
  assert.equal(membershipCall.url.searchParams.has("limit"), false);
  assert.equal(membershipCall.headers.get("apikey"), "test-service-role-key");
  const companyCall = calls.find(({ url }) => url.pathname.endsWith("/companies"));
  assert.equal(companyCall.url.searchParams.get("id"), `eq.${company.id}`);
  assert.deepEqual(companyCall.url.searchParams.get("select").split(","), Object.keys(company));
});

test("GET refuses multiple memberships instead of choosing a company", async () => {
  const { handlers, calls, request } = setup({
    memberships: [[{ company_id: company.id }, { company_id: "other-company" }]],
  });
  const response = await handlers.GET(request());
  assert.equal(response.status, 409);
  assert.ok((await response.json()).error);
  assert.equal(calls.length, 2);
});

test("GET does not treat membership query failures as an unregistered salon", async () => {
  const { handlers, request } = setup({ memberships: [databaseError] });
  const response = await handlers.GET(request());
  assert.equal(response.status, 500);
  assert.equal("company" in await response.json(), false);
});

test("GET rejects incomplete or dangling memberships", async () => {
  for (const options of [{ memberships: [[{ company_id: null }]] }, { companies: [] }]) {
    const { handlers, request } = setup(options);
    const response = await handlers.GET(request());
    assert.equal(response.status, 409);
    assert.equal("company" in await response.json(), false);
  }
});

test("GET does not treat a company query failure as absence", async () => {
  const { handlers, request } = setup({ companies: databaseError });
  const response = await handlers.GET(request());
  assert.equal(response.status, 500);
  assert.equal("company" in await response.json(), false);
});

test("POST requires a verified session before attempting creation", async () => {
  const { handlers, calls, request } = setup({ invalidAuth: true });
  assert.equal((await handlers.POST(request("POST", { name: "Salão" }))).status, 401);
  assert.equal(calls.length, 1);
});

test("POST rejects missing, blank, non-string and excessively long names", async () => {
  for (const body of [null, [], {}, { name: null }, { name: 42 }, { name: " \n " }, { name: "a".repeat(201) }]) {
    const { handlers, calls, request } = setup();
    assert.equal((await handlers.POST(request("POST", body))).status, 400);
    assert.equal(calls.length, 1);
  }
});

test("POST rejects malformed JSON", async () => {
  const { handlers, calls } = setup();
  const response = await handlers.POST(new Request("https://app.example.test/api/company", {
    method: "POST",
    headers: { Authorization: "Bearer valid-user-token", "Content-Type": "application/json" },
    body: "{",
  }));
  assert.equal(response.status, 400);
  assert.equal(calls.length, 1);
});

test("POST returns an existing company without calling the creation RPC", async () => {
  const { handlers, calls, request } = setup();
  const response = await handlers.POST(request("POST", { name: "Another salon" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { company });
  assert.equal(calls.some(({ method }) => method === "POST"), false);
});

test("POST does not create a company after lookup errors or multiple memberships", async () => {
  for (const [membership, status] of [
    [databaseError, 500],
    [[{ company_id: company.id }, { company_id: "other-company" }], 409],
  ]) {
    const { handlers, calls, request } = setup({ memberships: [membership] });
    assert.equal((await handlers.POST(request("POST", { name: "Salão" }))).status, status);
    assert.equal(calls.some(({ method }) => method === "POST"), false);
  }
});

test("POST creates with the user's bearer token and verifies the resulting membership", async () => {
  const { handlers, calls, request } = setup({ memberships: [[], [{ company_id: company.id }]] });
  const response = await handlers.POST(request("POST", {
    name: "  Salão da conta  ", user_id: "forged-user", company_id: "forged-company",
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { company });
  const creationCalls = calls.filter(({ method }) => method === "POST");
  assert.equal(creationCalls.length, 1);
  assert.equal(creationCalls[0].url.pathname, "/rest/v1/rpc/create_company");
  assert.deepEqual(creationCalls[0].body, { company_name: "Salão da conta" });
  assert.equal(creationCalls[0].headers.get("Authorization"), "Bearer valid-user-token");
  assert.equal(creationCalls[0].headers.get("apikey"), "test-publishable-key");
  const membershipCalls = calls.filter(({ url }) => url.pathname.endsWith("/company_users"));
  assert.equal(membershipCalls.length, 2);
  assert.ok(membershipCalls.every(({ url }) => url.searchParams.get("user_id") === "eq.authenticated-user"));
});

test("POST reports an RPC failure without claiming creation succeeded", async () => {
  const { handlers, calls, request } = setup({ memberships: [[]], rpcError: databaseError });
  const response = await handlers.POST(request("POST", { name: "Salão" }));
  assert.equal(response.status, 500);
  assert.equal("company" in await response.json(), false);
  assert.equal(calls.filter(({ url }) => url.pathname.endsWith("/company_users")).length, 1);
});

test("POST does not report success unless a company is linked after the RPC", async () => {
  for (const [memberships, status] of [[ [[], []], 409 ], [ [[], databaseError], 500 ]]) {
    const { handlers, request } = setup({ memberships });
    const response = await handlers.POST(request("POST", { name: "Salão" }));
    assert.equal(response.status, status);
    assert.equal("company" in await response.json(), false);
  }
});
