function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function contactRowHtml(contact, selectedId) {
  const fullName = escapeHtml(
    `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unnamed contact",
  );
  const isSelected = contact.id === selectedId;
  const rowClass = isSelected
    ? "bg-blue-600 text-white shadow-sm"
    : "text-slate-700 hover:bg-slate-100";

  return `
    <li>
      <button
        type="button"
        data-action="select"
        data-id="${contact.id}"
        class="block w-full cursor-pointer rounded-xl px-3 py-2 text-left text-sm font-medium leading-tight transition ${rowClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
      >${fullName}</button>
    </li>
  `;
}

export function renderList(elements, contacts, selectedId = null, searchQuery = "") {
  elements.count.textContent = `${contacts.length} ${contacts.length === 1 ? "contact" : "contacts"}`;

  if (contacts.length === 0) {
    elements.list.innerHTML = "";
    elements.listStatus.textContent = searchQuery.trim()
      ? "No contacts match your search."
      : "No contacts yet.";
    elements.listStatus.classList.remove("hidden");
    return;
  }

  elements.listStatus.classList.add("hidden");
  elements.list.innerHTML = contacts.map((contact) => contactRowHtml(contact, selectedId)).join("");
}

export function renderListStatus(elements, message) {
  elements.list.innerHTML = "";
  elements.listStatus.textContent = message;
  elements.listStatus.classList.remove("hidden");
}
