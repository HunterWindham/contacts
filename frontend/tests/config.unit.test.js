// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadConfigModule() {
  vi.resetModules();
  return import("../src/config.js");
}

describe("runtime config", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    delete globalThis.__CONTACTS_API_BASE__;
  });

  afterEach(() => {
    document.head.innerHTML = "";
    delete globalThis.__CONTACTS_API_BASE__;
  });

  it("uses global override when provided", async () => {
    globalThis.__CONTACTS_API_BASE__ = "https://global.example/api";
    document.head.innerHTML =
      '<meta name="contacts-api-base" content="https://meta.example/api" />';

    const { runtimeConfig } = await loadConfigModule();

    expect(runtimeConfig.apiBase).toBe("https://global.example/api");
  });

  it("uses meta configured value when no global override exists", async () => {
    document.head.innerHTML =
      '<meta name="contacts-api-base" content="https://meta.example/api" />';

    const { runtimeConfig } = await loadConfigModule();

    expect(runtimeConfig.apiBase).toBe("https://meta.example/api");
  });

  it("falls back to local default when no override exists", async () => {
    const { runtimeConfig } = await loadConfigModule();

    expect(runtimeConfig.apiBase).toBe("http://127.0.0.1:5000/api");
  });
});
