// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import {
  addEmailField,
  readForm,
  removeEmailField,
  resetForm,
  showFormErrors,
} from "../src/ui/contact-editor-view.js";

function createElements() {
  document.body.innerHTML = `
    <form data-region="form">
      <input type="hidden" name="id" value="" />
      <input type="text" name="first_name" value="" />
      <input type="text" name="last_name" value="" />
      <input type="tel" name="phone" value="" />
      <ul data-region="emails-list"></ul>
      <ul data-region="form-errors" class="hidden"></ul>
      <h2 data-region="form-title"></h2>
      <button type="submit" data-region="submit">Save</button>
      <button type="button" data-action="delete-selected"></button>
    </form>
  `;

  return {
    form: document.querySelector('[data-region="form"]'),
    formTitle: document.querySelector('[data-region="form-title"]'),
    submit: document.querySelector('[data-region="submit"]'),
    deleteButton: document.querySelector('[data-action="delete-selected"]'),
    emailsList: document.querySelector('[data-region="emails-list"]'),
    formErrors: document.querySelector('[data-region="form-errors"]'),
  };
}

describe("contact-editor-view", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("normalizes blank phone to null and trims values in readForm", () => {
    const elements = createElements();
    resetForm(elements);

    elements.form.querySelector('input[name="id"]').value = "7";
    elements.form.querySelector('input[name="first_name"]').value = "  Ada  ";
    elements.form.querySelector('input[name="last_name"]').value = " Lovelace ";
    elements.form.querySelector('input[name="phone"]').value = " ";
    const emailInput = elements.emailsList.querySelector('input[name="emails[]"]');
    emailInput.value = "  ada@example.com ";

    const result = readForm(elements);

    expect(result.id).toBe(7);
    expect(result.payload).toEqual({
      first_name: "Ada",
      last_name: "Lovelace",
      phone: null,
      emails: ["ada@example.com"],
    });
  });

  it("formats valid US phone values during readForm", () => {
    const elements = createElements();
    resetForm(elements);

    elements.form.querySelector('input[name="first_name"]').value = "Ada";
    elements.form.querySelector('input[name="last_name"]').value = "Lovelace";
    elements.form.querySelector('input[name="phone"]').value = "12125550100";

    const result = readForm(elements);

    expect(result.payload.phone).toBe("(212) 555-0100");
  });

  it("keeps one email input after removing the only row", () => {
    const elements = createElements();
    resetForm(elements);

    const removeButton = elements.emailsList.querySelector('button[data-action="remove-email"]');
    removeEmailField(elements, removeButton);

    const emailInputs = elements.emailsList.querySelectorAll('input[name="emails[]"]');
    expect(emailInputs).toHaveLength(1);
  });

  it("escapes HTML in rendered form errors", () => {
    const elements = createElements();

    showFormErrors(elements, ['Invalid <script>alert("xss")</script>']);

    expect(elements.formErrors.classList.contains("hidden")).toBe(false);
    expect(elements.formErrors.innerHTML).not.toContain("<script>");
    expect(elements.formErrors.textContent).toContain('Invalid <script>alert("xss")</script>');
  });

  it("adds a new email field and preserves provided value", () => {
    const elements = createElements();
    resetForm(elements);

    addEmailField(elements, "work@example.com", false);

    const emailInputs = [...elements.emailsList.querySelectorAll('input[name="emails[]"]')];
    expect(emailInputs).toHaveLength(2);
    expect(emailInputs[1].value).toBe("work@example.com");
  });
});
