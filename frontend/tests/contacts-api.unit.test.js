// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

function createJsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

function createNoContentResponse() {
  return {
    ok: true,
    status: 204,
    async json() {
      throw new Error("No JSON for 204");
    },
  };
}

async function loadApiModule() {
  vi.resetModules();
  delete globalThis.__CONTACTS_API_BASE__;
  document.head.innerHTML = '<meta name="contacts-api-base" content="http://api.test.local/api" />';
  return import("../src/logic/contacts-api.js");
}

describe("contacts-api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.head.innerHTML = "";
  });

  it("sends trimmed query params for list requests", async () => {
    const { contactsApi } = await loadApiModule();
    const fetchSpy = vi.fn(async () => createJsonResponse(200, []));
    global.fetch = fetchSpy;

    await contactsApi.list("  ada lovelace  ");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("http://api.test.local/api/contacts?q=ada+lovelace");
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ method: "GET" });
  });

  it("serializes request body for create", async () => {
    const { contactsApi } = await loadApiModule();
    const fetchSpy = vi.fn(async () => createJsonResponse(201, { id: 9 }));
    global.fetch = fetchSpy;

    await contactsApi.create({
      first_name: "Ada",
      last_name: "Lovelace",
      emails: ["ada@example.com"],
      phone: null,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, options] = fetchSpy.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(options.body)).toEqual({
      first_name: "Ada",
      last_name: "Lovelace",
      emails: ["ada@example.com"],
      phone: null,
    });
  });

  it("returns null for 204 delete responses", async () => {
    const { contactsApi } = await loadApiModule();
    global.fetch = vi.fn(async () => createNoContentResponse());

    const result = await contactsApi.remove(7);

    expect(result).toBeNull();
  });

  it("throws ApiError with backend-provided errors", async () => {
    const { ApiError, contactsApi } = await loadApiModule();
    global.fetch = vi.fn(async () =>
      createJsonResponse(400, {
        errors: ["first_name is required"],
      }),
    );

    await expect(contactsApi.create({})).rejects.toEqual(
      expect.objectContaining({
        name: "Error",
        message: "first_name is required",
        status: 400,
        errors: ["first_name is required"],
      }),
    );

    await expect(contactsApi.create({})).rejects.toBeInstanceOf(ApiError);
  });

  it("falls back to generic request error when no JSON error list exists", async () => {
    const { contactsApi } = await loadApiModule();
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      async json() {
        return { message: "unexpected" };
      },
    }));

    await expect(contactsApi.list()).rejects.toEqual(
      expect.objectContaining({
        message: "Request failed",
        status: 500,
        errors: ["Request failed"],
      }),
    );
  });
});
