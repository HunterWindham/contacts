// Thin fetch wrapper around the Flask API. Centralized so callers stay terse
// and error handling stays consistent.

import { runtimeConfig } from "../config.js";

const API_BASE = runtimeConfig.apiBase;

/**
 * @typedef {Object} Contact
 * @property {number} id
 * @property {string} first_name
 * @property {string} last_name
 * @property {string[]} emails
 * @property {string|null} phone
 * @property {string} created_at
 * @property {string} updated_at
 */

export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {string[]} errors
   * @param {number} status
   */
  constructor(message, errors, status) {
    super(message);
    this.errors = errors;
    this.status = status;
  }
}

async function request(path, { method = "GET", body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return null;

  let payload = null;
  // Some error responses (e.g. 404 from abort) may still be JSON; tolerate either.
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errors = Array.isArray(payload?.errors)
      ? payload.errors
      : ["Request failed"];
    throw new ApiError(errors.join(", "), errors, response.status);
  }

  return payload;
}

export const contactsApi = {
  /**
   * @param {string} query
   * @returns {Promise<Contact[]>}
   */
  list: (query = "") => {
    const params = new URLSearchParams();
    const cleanedQuery = query.trim();
    if (cleanedQuery) {
      params.set("q", cleanedQuery);
    }
    const suffix = params.size ? `?${params.toString()}` : "";
    return request(`/contacts${suffix}`);
  },
  /** @param {Omit<Contact,"id"|"created_at"|"updated_at">} contact */
  create: (contact) => request("/contacts", { method: "POST", body: contact }),
  /**
   * @param {number} id
   * @param {Omit<Contact,"id"|"created_at"|"updated_at">} contact
   */
  update: (id, contact) =>
    request(`/contacts/${id}`, { method: "PUT", body: contact }),
  /** @param {number} id */
  remove: (id) => request(`/contacts/${id}`, { method: "DELETE" }),
};
