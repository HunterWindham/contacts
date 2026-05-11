const FORM_FIELDS = ["first_name", "last_name", "phone"];
const EMAIL_FIELD_NAME = "emails[]";
const NON_DIGIT_PATTERN = /\D/g;

function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailInputHtml(value = "") {
  return `
    <li class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <input
        type="email"
        name="${EMAIL_FIELD_NAME}"
        autocomplete="email"
        value="${escapeHtml(value)}"
        placeholder="name@example.com"
        class="h-7 min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
      />
      <button
        type="button"
        data-action="remove-email"
        aria-label="Remove email"
        class="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs leading-none text-white transition hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
      >
        <span>-</span>
      </button>
    </li>
  `;
}

function normalizeUsPhone(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  let digits = trimmed.replace(NON_DIGIT_PATTERN, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  if (digits.length !== 10) return trimmed;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function setFormMode(elements, contact) {
  elements.formTitle.textContent = contact ? "Edit contact" : "New contact";
  elements.submit.textContent = "Save";
  elements.deleteButton.disabled = !contact;
}

function setEmails(elements, emails) {
  const nextEmails = emails?.length ? emails : [""];
  elements.emailsList.innerHTML = nextEmails.map((email) => emailInputHtml(email)).join("");
}

export function addEmailField(elements, value = "", focusNewField = true) {
  elements.emailsList.insertAdjacentHTML("beforeend", emailInputHtml(value));
  if (!focusNewField) return;
  const emailInputs = elements.emailsList.querySelectorAll(`input[name="${EMAIL_FIELD_NAME}"]`);
  emailInputs[emailInputs.length - 1]?.focus();
}

export function removeEmailField(elements, button) {
  const row = button.closest("li");
  if (!row) return;
  row.remove();
  if (!elements.emailsList.children.length) {
    addEmailField(elements, "", false);
  }
}

export function readForm(elements) {
  const formData = new FormData(elements.form);
  const idValue = formData.get("id");
  const payload = {};
  for (const field of FORM_FIELDS) {
    payload[field] = (formData.get(field) || "").toString().trim();
  }
  const normalizedPhone = normalizeUsPhone(payload.phone);
  payload.phone = normalizedPhone ? normalizedPhone : null;
  payload.emails = [...elements.emailsList.querySelectorAll(`input[name="${EMAIL_FIELD_NAME}"]`)]
    .map((input) => input.value.trim())
    .filter(Boolean);
  return {
    id: idValue ? Number(idValue) : null,
    payload,
  };
}

export function formatPhoneInput(input) {
  input.value = normalizeUsPhone(input.value);
}

export function fillForm(elements, contact) {
  elements.form.querySelector('input[name="id"]').value = contact?.id ?? "";
  for (const field of FORM_FIELDS) {
    const input = elements.form.querySelector(`[name="${field}"]`);
    input.value = contact?.[field] ?? "";
  }
  setEmails(elements, Array.isArray(contact?.emails) ? contact.emails : []);
  setFormMode(elements, contact);
}

export function resetForm(elements) {
  elements.form.reset();
  elements.form.querySelector('input[name="id"]').value = "";
  setEmails(elements, [""]);
  setFormMode(elements, null);
  clearFormErrors(elements);
}

export function showFormErrors(elements, errors) {
  if (!errors?.length) {
    clearFormErrors(elements);
    return;
  }
  elements.formErrors.innerHTML = errors
    .map((error) => `<li>${escapeHtml(error)}</li>`)
    .join("");
  elements.formErrors.classList.remove("hidden");
}

export function clearFormErrors(elements) {
  elements.formErrors.classList.add("hidden");
  elements.formErrors.innerHTML = "";
}

export function focusFirstField(elements) {
  elements.form.querySelector('[name="first_name"]').focus();
}

export function setSubmitting(elements, submitting) {
  elements.submit.disabled = submitting;
  elements.submit.dataset.loading = submitting ? "true" : "false";
}
