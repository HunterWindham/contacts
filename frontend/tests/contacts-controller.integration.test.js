// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { initContactsController } from "../src/logic/contacts-controller.js";

function mountAppDom() {
  document.body.innerHTML = `
    <div data-region="toast"></div>
    <button type="button" data-action="new"></button>
    <input type="search" data-region="search" />
    <div data-region="list-status" class="hidden"></div>
    <ul data-region="list"></ul>
    <form data-region="form">
      <input type="hidden" name="id" />
      <h2 data-region="form-title"></h2>
      <span data-region="count"></span>
      <input type="text" name="first_name" />
      <input type="text" name="last_name" />
      <input type="tel" name="phone" />
      <ul data-region="emails-list"></ul>
      <ul data-region="form-errors" class="hidden"></ul>
      <button type="button" data-action="add-email"></button>
      <button type="button" data-action="delete-selected"></button>
      <button type="button" data-action="reset"></button>
      <button type="submit" data-region="submit">Save</button>
    </form>
  `;
}

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
      throw new Error("No JSON body for 204 response");
    },
  };
}

function getEmailInput() {
  return document.querySelector('input[name="emails[]"]');
}

function setFieldValue(selector, value) {
  const input = document.querySelector(selector);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing input: ${selector}`);
  }
  input.value = value;
}

async function submitForm() {
  const form = document.querySelector('[data-region="form"]');
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("Missing contact form");
  }
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await Promise.resolve();
  await Promise.resolve();
}

function clickElement(selector) {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing element: ${selector}`);
  }
  element.click();
}

async function waitForSelector(selector, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
    await Promise.resolve();
  }
  throw new Error(`Timed out waiting for selector: ${selector}`);
}

async function waitForText(selector, text, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const node = document.querySelector(selector);
    if (node?.textContent?.includes(text)) {
      return;
    }
    await Promise.resolve();
  }
  throw new Error(`Timed out waiting for "${text}" in ${selector}`);
}

describe("contacts controller integration", () => {
  beforeEach(() => {
    mountAppDom();
    vi.restoreAllMocks();
    window.confirm = vi.fn(() => true);
    window.setTimeout = ((callback, _delay) => {
      callback();
      return 0;
    });
  });

  it("supports create/edit/delete flow and sends null for blank optional phone", async () => {
    const createdContact = {
      id: 1,
      first_name: "Ada",
      last_name: "Lovelace",
      emails: ["ada@example.com"],
      phone: null,
      created_at: "2026-05-10 10:00:00",
      updated_at: "2026-05-10 10:00:00",
    };
    const updatedContact = {
      ...createdContact,
      first_name: "Augusta",
      updated_at: "2026-05-10 10:05:00",
    };

    const queuedResponses = [
      createJsonResponse(200, []),
      createJsonResponse(201, createdContact),
      createJsonResponse(200, [createdContact]),
      createJsonResponse(200, updatedContact),
      createJsonResponse(200, [updatedContact]),
      createNoContentResponse(),
      createJsonResponse(200, []),
    ];
    const observedRequests = [];

    global.fetch = vi.fn(async (url, options = {}) => {
      observedRequests.push({
        url: String(url),
        method: options.method ?? "GET",
        body: options.body ?? null,
      });
      const nextResponse = queuedResponses.shift();
      if (!nextResponse) {
        throw new Error(`Unexpected request: ${String(url)}`);
      }
      return nextResponse;
    });

    initContactsController();
    await Promise.resolve();
    await Promise.resolve();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(observedRequests[0].method).toBe("GET");
    expect(observedRequests[0].url).toContain("/contacts");

    setFieldValue('input[name="first_name"]', "Ada");
    setFieldValue('input[name="last_name"]', "Lovelace");
    const emailInput = getEmailInput();
    expect(emailInput).toBeTruthy();
    emailInput.value = "ada@example.com";
    setFieldValue('input[name="phone"]', "");

    await submitForm();

    expect(global.fetch).toHaveBeenCalledTimes(3);
    const createPayload = JSON.parse(observedRequests[1].body);
    expect(observedRequests[1].method).toBe("POST");
    expect(createPayload).toEqual({
      first_name: "Ada",
      last_name: "Lovelace",
      phone: null,
      emails: ["ada@example.com"],
    });

    await waitForSelector('button[data-action="select"][data-id="1"]');
    clickElement('button[data-action="select"][data-id="1"]');
    setFieldValue('input[name="first_name"]', "Augusta");
    setFieldValue('input[name="phone"]', "");

    await submitForm();

    expect(global.fetch).toHaveBeenCalledTimes(5);
    const updatePayload = JSON.parse(observedRequests[3].body);
    expect(observedRequests[3].method).toBe("PUT");
    expect(observedRequests[3].url).toContain("/contacts/1");
    expect(updatePayload.phone).toBeNull();

    clickElement('button[data-action="delete-selected"]');
    await Promise.resolve();
    await Promise.resolve();

    expect(global.fetch).toHaveBeenCalledTimes(7);
    expect(observedRequests[5]).toMatchObject({
      method: "DELETE",
    });
    expect(window.confirm).toHaveBeenCalledTimes(1);
    await waitForText('[data-region="list-status"]', "No contacts yet.");
  });

  it("shows backend validation errors inline on save", async () => {
    const queuedResponses = [
      createJsonResponse(200, []),
      createJsonResponse(400, {
        errors: ["first_name is required", "last_name is required"],
      }),
    ];
    const observedRequests = [];

    global.fetch = vi.fn(async (url, options = {}) => {
      observedRequests.push({
        url: String(url),
        method: options.method ?? "GET",
        body: options.body ?? null,
      });
      const nextResponse = queuedResponses.shift();
      if (!nextResponse) {
        throw new Error(`Unexpected request: ${String(url)}`);
      }
      return nextResponse;
    });

    initContactsController();
    await Promise.resolve();
    await Promise.resolve();

    await submitForm();

    expect(observedRequests).toHaveLength(2);
    expect(observedRequests[1].method).toBe("POST");

    const formErrors = document.querySelector('[data-region="form-errors"]');
    expect(formErrors?.classList.contains("hidden")).toBe(false);
    expect(formErrors?.textContent).toContain("first_name is required");
    expect(formErrors?.textContent).toContain("last_name is required");
  });

  it("sends the search query to the API", async () => {
    const queuedResponses = [
      createJsonResponse(200, []),
      createJsonResponse(200, []),
    ];
    const observedRequests = [];

    global.fetch = vi.fn(async (url, options = {}) => {
      observedRequests.push({
        url: String(url),
        method: options.method ?? "GET",
        body: options.body ?? null,
      });
      const nextResponse = queuedResponses.shift();
      if (!nextResponse) {
        throw new Error(`Unexpected request: ${String(url)}`);
      }
      return nextResponse;
    });

    initContactsController();
    await Promise.resolve();
    await Promise.resolve();

    const searchInput = document.querySelector('[data-region="search"]');
    if (!(searchInput instanceof HTMLInputElement)) {
      throw new Error("Missing search input");
    }
    searchInput.value = "ada lovelace";
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));

    await Promise.resolve();
    await Promise.resolve();

    expect(observedRequests).toHaveLength(2);
    expect(observedRequests[1].method).toBe("GET");
    expect(observedRequests[1].url).toContain("q=ada+lovelace");
  });
});
